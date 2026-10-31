import { randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { ObsidianStatus, Result } from '../../shared/api';
import { tr } from '../../shared/messages';

/** Name des eigenen Unterordners, wenn du nichts anderes wählst. */
export const DEFAULT_FOLDER = 'LocalDesk';
const FILE_NAME_MAX = 100;

/**
 * Prüft den Namen des eigenen Unterordners: ein einzelner Ordnername, kein Pfad.
 * So kann der Unterordner nie außerhalb des Vaults oder in einem fremden Ordner liegen.
 */
export function checkFolderName(name: unknown): Result<string> {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return { ok: false, error: tr('obsidian.folderNameMissing') };
  if (trimmed.length > 60) {
    return {
      ok: false,
      error: tr('obsidian.folderNameTooLong'),
    };
  }
  if (
    /[\\/:*?"<>|]/.test(trimmed) ||
    trimmed === '..' ||
    trimmed.startsWith('.')
  ) {
    return {
      ok: false,
      error: tr('obsidian.folderNameInvalid'),
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * Prüft einen Vault-Ordner: Gibt es ihn, und sieht er wie ein Obsidian-Vault aus
 * (Ordner `.obsidian`)? Ein ganzes Laufwerk wird abgelehnt.
 */
export async function inspectVault(
  vaultPath: string,
  folder: string,
): Promise<ObsidianStatus> {
  const base = { vaultPath, folder, looksLikeVault: false };
  if (!path.win32.isAbsolute(vaultPath)) {
    return { ...base, ok: false, error: tr('obsidian.pathNotFull') };
  }
  const normalized = path.win32.normalize(vaultPath);
  if (path.win32.parse(normalized).root === normalized) {
    return {
      ...base,
      ok: false,
      error: tr('obsidian.driveNotVault'),
    };
  }
  try {
    if (!(await stat(vaultPath)).isDirectory()) {
      return { ...base, ok: false, error: tr('obsidian.notAFolder') };
    }
  } catch {
    return { ...base, ok: false, error: tr('obsidian.folderMissing') };
  }
  const looksLikeVault = await stat(path.join(vaultPath, '.obsidian'))
    .then((s) => s.isDirectory())
    .catch(() => false);
  return { ...base, ok: true, looksLikeVault };
}

/**
 * Macht aus einem Titel einen Dateinamen, den Windows und Obsidian vertragen:
 * ohne \ / : * ? " < > | und ohne # ^ [ ] (stören Obsidian-Links), ohne Punkt
 * oder Leerzeichen am Ende, keine reservierten Namen wie CON oder NUL.
 */
export function sanitizeFileName(title: string): string {
  let name = title
    .replace(/[\\/:*?"<>|#^[\]\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Kein Punkt am Anfang: Obsidian blendet solche Dateien und Ordner aus.
    .replace(/^[. ]+/, '')
    .slice(0, FILE_NAME_MAX)
    .replace(/[. ]+$/, '');
  if (!name) name = 'Notiz';
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(name)) name += '_';
  return name;
}

/**
 * Schreib-Baustein für den Vault. ALLES, was LocalDesk in den Vault schreibt oder
 * dort löscht, geht hier durch – und landet garantiert im eigenen Unterordner:
 * Pfade werden aufgelöst und geprüft (kein `..\`), und kein Teil des Weges darf
 * eine Verknüpfung (Symlink/Junction) sein, die woanders hinführt.
 */
export class VaultWriter {
  readonly root: string;

  constructor(
    readonly vaultPath: string,
    readonly folder: string,
  ) {
    this.root = path.join(vaultPath, folder);
  }

  /** Voller Pfad zu einem Ziel im Unterordner – oder Fehler, wenn es hinausführt. */
  resolve(relative: string): string {
    if (path.isAbsolute(relative)) throw new Error(tr('obsidian.pathOutside'));
    const full = path.resolve(this.root, relative);
    const rel = path.relative(this.root, full);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(tr('obsidian.pathOutside'));
    }
    return full;
  }

  /**
   * Schreibt eine neue Notiz `<dir>/<titel>.md`. Gibt es den Namen schon, wird
   * „(2)“, „(3)“ … angehängt – eine bestehende Notiz wird nie überschrieben.
   * Gibt den Pfad relativ zum Vault zurück (für Links und Anzeige).
   */
  async writeNote(
    dir: string,
    title: string,
    content: string,
  ): Promise<string> {
    const folderPath = this.resolve(dir);
    await this.ensureDir(folderPath);
    const base = sanitizeFileName(title);
    for (let n = 1; n < 1000; n++) {
      const name = n === 1 ? `${base}.md` : `${base} (${n}).md`;
      const target = path.join(folderPath, name);
      if (await exists(target)) continue;
      await atomicWrite(target, content);
      return path.relative(this.vaultPath, target);
    }
    throw new Error(tr('obsidian.tooManyNotes'));
  }

  /** Ändert eine eigene Notiz (z. B. bearbeitete Erinnerung). */
  async updateNote(relativeToRoot: string, content: string): Promise<void> {
    const target = this.resolve(relativeToRoot);
    if (!target.toLowerCase().endsWith('.md'))
      throw new Error(tr('obsidian.markdownOnly'));
    await this.checkNoLinks(path.dirname(target));
    await atomicWrite(target, content);
  }

  /** Löscht eine eigene Notiz – nur .md-Dateien im Unterordner. */
  async deleteNote(relativeToRoot: string): Promise<void> {
    const target = this.resolve(relativeToRoot);
    if (!target.toLowerCase().endsWith('.md'))
      throw new Error(tr('obsidian.markdownOnly'));
    await this.checkNoLinks(path.dirname(target));
    await unlink(target);
  }

  /** Alle Notizen eines Ordners (nicht rekursiv) mit Inhalt; fehlt der Ordner, leer. */
  async readNotes(dir: string): Promise<{ file: string; content: string }[]> {
    const folderPath = this.resolve(dir);
    let entries;
    try {
      entries = await readdir(folderPath, { withFileTypes: true });
    } catch {
      return [];
    }
    const notes: { file: string; content: string }[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md'))
        continue;
      const file = path.join(folderPath, entry.name);
      notes.push({
        file: path.relative(this.root, file),
        content: await readFile(file, 'utf8'),
      });
    }
    return notes.sort((a, b) => a.file.localeCompare(b.file, 'de'));
  }

  /** Unterordner eines Ordners im Unterordner (keine Verknüpfungen); fehlt er, leer. */
  async subfolders(dir: string): Promise<string[]> {
    const folderPath = this.resolve(dir);
    try {
      const entries = await readdir(folderPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && !e.isSymbolicLink())
        .map((e) => path.join(dir, e.name));
    } catch {
      return [];
    }
  }

  /** Legt Ordner an – erst nachdem geprüft ist, dass keiner davon eine Verknüpfung ist. */
  private async ensureDir(folderPath: string) {
    await this.checkNoLinks(folderPath);
    await mkdir(folderPath, { recursive: true });
  }

  /** Kein vorhandener Teil des Weges (Vault → Ziel) darf eine Verknüpfung sein. */
  private async checkNoLinks(target: string) {
    const rel = path.relative(this.vaultPath, target);
    let current = this.vaultPath;
    for (const part of rel.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      const info = await lstat(current).catch(() => null);
      if (!info) return; // ab hier existiert noch nichts
      if (info.isSymbolicLink()) {
        throw new Error(tr('obsidian.symlink'));
      }
    }
  }
}

async function exists(file: string): Promise<boolean> {
  return lstat(file).then(
    () => true,
    () => false,
  );
}

/**
 * Erst in eine Zwischendatei schreiben, dann umbenennen: Obsidian oder ein
 * Sync-Dienst sieht so nie eine halb geschriebene Notiz.
 */
export async function atomicWrite(target: string, content: string) {
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, content, 'utf8');
  try {
    await rename(temp, target);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
}
