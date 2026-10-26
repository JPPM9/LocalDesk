import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { KnowledgeSource } from '../../shared/api';

/** Größte Datei, die eingelesen wird (2 MB Text ≈ 600 Buchseiten). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Schutz gegen versehentlich riesige Ordner. */
export const MAX_FILES = 10_000;

export type FileKind = 'markdown' | 'text' | 'code';

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

export type ReadResult =
  | { ok: true; text: string; kind: FileKind }
  | { ok: false; reason: string };

/**
 * Liest eine Textdatei – oder sagt, warum nicht. Die Prüfsumme (SHA-256 des
 * Inhalts) zeigt beim nächsten Einlesen, ob sich wirklich etwas geändert hat.
 */
export async function readTextFile(
  file: FoundFile,
): Promise<ReadResult & { hash: string }> {
  const kind = fileKind(file.path);
  if (!kind) {
    return { ok: false, reason: 'Dateiart wird nicht unterstützt', hash: '' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: 'Größer als 2 MB', hash: '' };
  }
  const bytes = await readFile(file.path);
  const hash = createHash('sha256').update(bytes).digest('hex');
  return { ...decodeText(bytes, kind), hash };
}

/** Erkennt Binärdaten und den Zeichensatz (UTF-8, sonst Windows-1252). */
export function decodeText(bytes: Uint8Array, kind: FileKind): ReadResult {
  // Ein Null-Byte kommt in Text praktisch nie vor, in Binärdateien fast immer.
  if (bytes.subarray(0, 8000).includes(0)) {
    return { ok: false, reason: 'Keine Textdatei (Binärdaten)' };
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Ältere Windows-Dateien: Umlaute in Windows-1252 statt UTF-8.
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return { ok: true, text: text.replace(/^﻿/, ''), kind };
}
