import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CodeChangeState } from '../../shared/code';
import { Workspace } from './workspace';
import { tr } from '../../shared/messages';

/** Eine übernommene Änderung: Stand vorher und nachher (null = Datei gab es nicht). */
interface Backup {
  workspace: string;
  /** Pfad relativ zum Projekt. */
  path: string;
  before: string | null;
  after: string | null;
  time: number;
  undone?: boolean;
}

const ID = /^[A-Za-z0-9-]{1,100}$/;

/**
 * Sicherungen für „Rückgängig“: je übernommener Änderung eine Datei unter
 * `<Datenordner>/code-backups/<Aufruf-ID>.json`. Zurückgesetzt wird nur, wenn
 * die Datei seither nicht noch einmal geändert wurde – sonst nur mit `force`.
 */
export class CodeBackups {
  constructor(private readonly dir: string) {}

  async save(id: string, backup: Omit<Backup, 'time'>, now = Date.now()) {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      this.file(id),
      JSON.stringify({ ...backup, time: now }),
      'utf8',
    );
  }

  async state(id: string): Promise<CodeChangeState> {
    const backup = await this.load(id);
    if (!backup) return 'missing';
    return backup.undone ? 'undone' : 'applied';
  }

  async undo(
    id: string,
    force = false,
  ): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
    const backup = await this.load(id);
    if (!backup)
      return {
        ok: false,
        error: 'Zu dieser Änderung gibt es keine Sicherung.',
      };
    if (backup.undone) return { ok: false, error: 'Schon rückgängig gemacht.' };
    const ws = await Workspace.open(backup.workspace);
    const full = await ws.resolve(backup.path, false);
    const current = await readFile(full, 'utf8').catch(() => null);
    if (!force && current !== backup.after) {
      return {
        ok: false,
        conflict: true,
        error: `${backup.path} wurde seither noch einmal geändert.`,
      };
    }
    if (backup.before === null) {
      await rm(full, { force: true });
    } else {
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, backup.before, 'utf8');
    }
    await writeFile(
      this.file(id),
      JSON.stringify({ ...backup, undone: true }),
      'utf8',
    );
    return { ok: true };
  }

  private async load(id: string): Promise<Backup | null> {
    if (!ID.test(id)) return null;
    try {
      return JSON.parse(await readFile(this.file(id), 'utf8')) as Backup;
    } catch {
      return null;
    }
  }

  private file(id: string): string {
    if (!ID.test(id)) throw new Error(tr('error.invalidIdentifier'));
    return path.join(this.dir, `${id}.json`);
  }
}
