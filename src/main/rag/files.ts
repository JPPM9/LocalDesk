import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { KnowledgeSource } from '../../shared/api';
import type { Extractor } from './extractor';
import { tr } from '../../shared/messages';

/** Größte Datei, die eingelesen wird (2 MB Text ≈ 600 Buchseiten). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** PDF und Word enthalten viel mehr als Text (Bilder, Schriften) – daher mehr Platz. */
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
/** Schutz gegen versehentlich riesige Ordner. */
export const MAX_FILES = 10_000;

export type FileKind = 'markdown' | 'text' | 'code' | 'pdf' | 'docx';

const MARKDOWN = new Set(['.md', '.markdown', '.mdx']);
const TEXT = new Set(['.txt', '.text', '.log', '.csv', '.tsv']);
const CODE = new Set([
  ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'],
  ...['.py', '.java', '.kt', '.kts', '.cs', '.go', '.rs', '.swift', '.dart'],
  ...['.c', '.h', '.cpp', '.hpp', '.cc', '.rb', '.php', '.lua', '.r', '.m'],
  ...['.sh', '.bash', '.ps1', '.bat', '.cmd', '.sql', '.gradle'],
  ...['.html', '.htm', '.css', '.scss', '.sass', '.less', '.xml', '.svg'],
  ...['.json', '.jsonc', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'],
]);

/** Ordner, die nie eingelesen werden: Abhängigkeiten, Build-Ergebnisse, Caches. */
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'target',
  'bin',
  'obj',
  'venv',
  '__pycache__',
  'coverage',
]);

/** Dateien ohne Inhalt für Menschen: Sperrdateien, minifizierter Code, Source-Maps. */
const IGNORED_FILES =
  /(^|[\\/])(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock)$|\.min\.(js|css)$|\.map$/i;

export function fileKind(filePath: string): FileKind | null {
  const ext = path.extname(filePath).toLowerCase();
  if (MARKDOWN.has(ext)) return 'markdown';
  if (TEXT.has(ext)) return 'text';
  if (CODE.has(ext)) return 'code';
  if (ext === '.pdf') return 'pdf';
  // Nur das heutige Word-Format; alte .doc-Dateien sind ein anderes, binäres Format.
  if (ext === '.docx') return 'docx';
  return null;
}

export interface FoundFile {
  path: string;
  size: number;
  /** Änderungszeit in ms. */
  mtime: number;
}

export interface ScanResult {
  files: FoundFile[];
  /** Quellen, die es nicht (mehr) gibt. */
  missing: string[];
  /** Mehr als MAX_FILES gefunden – der Rest wurde ignoriert. */
  truncated: boolean;
}

/**
 * Sucht alle passenden Dateien in den Quellen. Unterordner werden durchsucht,
 * Verknüpfungen (Symlinks) aber nicht verfolgt – sie könnten aus dem Ordner hinausführen.
 * Eine einzeln gewählte Datei wird immer aufgenommen (auch mit unbekannter Endung),
 * damit sie in der Liste als „übersprungen“ mit Grund erscheint.
 */
export async function scanSources(
  sources: KnowledgeSource[],
): Promise<ScanResult> {
  const found = new Map<string, FoundFile>();
  const missing: string[] = [];
  let truncated = false;

  const add = (filePath: string, size: number, mtime: number) => {
    if (found.size >= MAX_FILES) {
      truncated = true;
      return;
    }
    found.set(filePath.toLowerCase(), { path: filePath, size, mtime });
  };

  const walk = async (dir: string) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // z. B. keine Berechtigung – Ordner auslassen
    }
    for (const entry of entries) {
      if (truncated) return;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (
          entry.name.startsWith('.') ||
          IGNORED_DIRS.has(entry.name.toLowerCase())
        ) {
          continue;
        }
        await walk(full);
      } else if (entry.isFile()) {
        if (!fileKind(full) || IGNORED_FILES.test(full)) continue;
        try {
          const info = await stat(full);
          add(full, info.size, Math.round(info.mtimeMs));
        } catch {
          // Datei verschwand gerade – egal
        }
      }
    }
  };

  for (const source of sources) {
    try {
      const info = await stat(source.path);
      if (source.kind === 'folder' && info.isDirectory()) {
        await walk(source.path);
      } else if (source.kind === 'file' && info.isFile()) {
        add(source.path, info.size, Math.round(info.mtimeMs));
      } else {
        missing.push(source.path);
      }
    } catch {
      missing.push(source.path);
    }
  }
  return { files: [...found.values()], missing, truncated };
}

/** Was beim Lesen einer Datei herauskommt. */
export type DocumentRead =
  /** Text (bei Markdown und Word mit Überschriften als „#“). */
  | { type: 'text'; hash: string; text: string; markdown: boolean }
  /** PDF: Text Seite für Seite. */
  | { type: 'pages'; hash: string; pages: string[] }
  | { type: 'skipped'; hash: string; reason: string }
  /** Gleicher Inhalt wie beim letzten Mal – nichts auszulesen. */
  | { type: 'unchanged'; hash: string };

/**
 * Liest eine Datei – oder sagt, warum nicht. Die Prüfsumme (SHA-256 des Inhalts)
 * wird zuerst berechnet: Ist sie gleich wie beim letzten Mal, wird eine PDF gar
 * nicht erst ausgelesen. Kaputte PDF/Word-Dateien werfen einen Fehler.
 */
export async function readDocument(
  file: FoundFile,
  extractor: Extractor,
  previousHash?: string,
): Promise<DocumentRead> {
  const kind = fileKind(file.path);
  if (!kind) {
    return {
      type: 'skipped',
      reason: tr('knowledge.reasonUnsupported'),
      hash: '',
    };
  }
  const isDocument = kind === 'pdf' || kind === 'docx';
  const limit = isDocument ? MAX_DOCUMENT_BYTES : MAX_FILE_BYTES;
  if (file.size > limit) {
    return {
      type: 'skipped',
      reason: tr('knowledge.reasonTooLarge', { mb: limit / 1024 / 1024 }),
      hash: '',
    };
  }
  const bytes = await readFile(file.path);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash === previousHash) return { type: 'unchanged', hash };

  if (isDocument) {
    const content = await extractor.extract(kind, bytes);
    return 'pages' in content
      ? { type: 'pages', hash, pages: content.pages }
      : { type: 'text', hash, text: content.text, markdown: true };
  }
  const decoded = decodeText(bytes);
  return decoded.ok
    ? { type: 'text', hash, text: decoded.text, markdown: kind === 'markdown' }
    : { type: 'skipped', hash, reason: decoded.reason };
}

/** Erkennt Binärdaten und den Zeichensatz (UTF-8, sonst Windows-1252). */
export function decodeText(
  bytes: Uint8Array,
): { ok: true; text: string } | { ok: false; reason: string } {
  // Ein Null-Byte kommt in Text praktisch nie vor, in Binärdateien fast immer.
  if (bytes.subarray(0, 8000).includes(0)) {
    return { ok: false, reason: tr('knowledge.reasonBinary') };
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Ältere Windows-Dateien: Umlaute in Windows-1252 statt UTF-8.
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return { ok: true, text: text.replace(/^﻿/, '') };
}
