import { open, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { CodeEntry, CodeFile } from '../../shared/code';
import { tr } from '../../shared/messages';

/** Größte Datei, die angezeigt oder dem Modell gegeben wird. */
export const CODE_FILE_MAX = 1_000_000;
/** So viele Einträge zeigt ein Ordner höchstens. */
const DIR_ENTRIES_MAX = 2000;
/** Diese Ordner sind Interna – nicht anzeigen, nicht durchsuchen. */
export const HIDDEN_DIRS = new Set(['.git']);

/**
 * Ein Projektordner, in dem der Agent arbeitet. JEDER Zugriff geht über
 * `resolve`: Pfade außerhalb des Ordners – auch über `..`, absolute Pfade,
 * Laufwerke oder Verknüpfungen (Symlinks, Junctions) – werden abgelehnt.
 */
export class Workspace {
  private constructor(readonly root: string) {}

  /** Prüft den Ordner und merkt sich seinen echten Pfad (Verknüpfungen aufgelöst). */
  static async open(folder: string): Promise<Workspace> {
    if (!path.isAbsolute(folder)) throw new Error(tr('code.invalidFolder'));
    const real = await realpath(folder).catch(() => {
      throw new Error(tr('code.folderMissing', { folder }));
    });
    if (!(await stat(real)).isDirectory()) {
      throw new Error(tr('code.notAFolder', { folder }));
    }
    const problem = unsafeRoot(real);
    if (problem) throw new Error(problem);
    return new Workspace(real);
  }

  /**
   * Relativer Pfad (mit / oder \) → absoluter Pfad im Ordner. `mustExist`
   * false erlaubt neue Dateien – dann muss der nächste vorhandene Ordner
   * darüber im Projekt liegen.
   */
  async resolve(relative: string, mustExist = true): Promise<string> {
    const clean = relative.trim().replace(/\\/g, '/');
    if (
      clean === '' ||
      clean === '.' ||
      path.isAbsolute(clean) ||
      /^[a-zA-Z]:/.test(clean) ||
      clean.includes('\0')
    ) {
      if (clean === '' || clean === '.') return this.root;
      throw new Error(tr('code.pathOutside', { path: relative }));
    }
    // Ein „:“ gehört unter Windows in keinen Dateinamen: Es steht für Laufwerke,
    // versteckte Datenströme („datei:strom“, „.git::$INDEX_ALLOCATION“) und
    // Git-Pfadzauber („:(top)“).
    if (clean.includes(':')) {
      throw new Error(tr('code.pathOutside', { path: relative }));
    }
    const full = path.resolve(this.root, clean);
    if (!this.contains(full)) {
      throw new Error(tr('code.pathOutside', { path: relative }));
    }
    // Verknüpfungen auflösen: Der echte Ort muss ebenfalls im Projekt liegen.
    let existing = full;
    let realExisting = '';
    for (;;) {
      try {
        const real = await realpath(existing);
        if (!this.contains(real)) {
          throw new Error(tr('code.pathEscapes', { path: relative }));
        }
        realExisting = real;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        if (mustExist && existing === full) {
          throw new Error(tr('code.notFound', { path: relative }));
        }
        const parent = path.dirname(existing);
        if (parent === existing)
          throw new Error(tr('code.notFound', { path: relative }));
        existing = parent;
      }
    }
    // .git auch unter anderer Schreibweise sperren („.GIT“, „.git.“, Kurznamen):
    // Geprüft wird der echte Ort (Windows liefert dort den wahren Namen) samt dem
    // Rest des Pfads, den es noch nicht gibt.
    const rest = path.relative(existing, full);
    if (this.isHidden(full) || this.isHidden(path.join(realExisting, rest))) {
      throw new Error(tr('code.gitBlocked', { path: relative }));
    }
    return full;
  }

  /** Pfad relativ zum Projekt, immer mit „/“ (für Anzeige und Modell). */
  relative(full: string): string {
    return path.relative(this.root, full).split(path.sep).join('/');
  }

  /** Einträge eines Ordners: Ordner zuerst, dann Dateien, jeweils nach Namen. */
  async list(relative = ''): Promise<CodeEntry[]> {
    const dir = await this.resolve(relative);
    const entries = await readdir(dir, { withFileTypes: true });
    const result: CodeEntry[] = [];
    for (const entry of entries.slice(0, DIR_ENTRIES_MAX)) {
      if (entry.isDirectory() && HIDDEN_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push({
          path: this.relative(full),
          name: entry.name,
          kind: 'dir',
        });
      } else if (entry.isFile()) {
        const size = await stat(full)
          .then((s) => s.size)
          .catch(() => 0);
        result.push({
          path: this.relative(full),
          name: entry.name,
          kind: 'file',
          size,
        });
      }
      // Verknüpfungen und Sonderdateien werden gar nicht erst angezeigt.
    }
    return result.sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === 'dir' ? -1 : 1) ||
        a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
    );
  }

  /** Datei als Text; zu große oder binäre Dateien nur mit Hinweis. */
  async read(relative: string): Promise<CodeFile> {
    const full = await this.resolve(relative);
    const info = await stat(full);
    if (!info.isFile())
      throw new Error(tr('code.notAFile', { path: relative }));
    const base = { path: this.relative(full), size: info.size };
    if (info.size > CODE_FILE_MAX) return { ...base, tooLarge: true };
    const handle = await open(full, 'r');
    try {
      const bytes = await handle.readFile();
      // Ein Null-Byte am Anfang heißt fast immer: keine Textdatei.
      if (bytes.subarray(0, 8000).includes(0)) return { ...base, binary: true };
      return { ...base, text: bytes.toString('utf8') };
    } finally {
      await handle.close();
    }
  }

  private contains(full: string): boolean {
    const rel = path.relative(this.root, full);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }

  private isHidden(full: string): boolean {
    return (
      this.relative(full)
        .split('/')
        // Windows ignoriert Groß-/Kleinschreibung und Punkte/Leerzeichen am Ende.
        .some((part) =>
          HIDDEN_DIRS.has(part.replace(/[. ]+$/, '').toLowerCase()),
        )
    );
  }
}

/** Ganze Laufwerke und Systemordner sind als Projekt zu gefährlich. */
function unsafeRoot(real: string): string | null {
  if (path.parse(real).root === real) {
    return tr('code.rootDrive');
  }
  const lower = real.toLowerCase();
  const system = [
    process.env.SystemRoot,
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
  ]
    .filter((p): p is string => !!p)
    .map((p) => p.toLowerCase());
  if (system.some((p) => lower === p || lower.startsWith(p + path.sep))) {
    return tr('code.rootSystem');
  }
  const home = process.env.USERPROFILE?.toLowerCase();
  if (home && lower === home) {
    return tr('code.rootHome');
  }
  return null;
}
