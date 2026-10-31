import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rmdir,
  unlink,
} from 'node:fs/promises';
import path from 'node:path';
import {
  formatSkill,
  isSkillId,
  parseSkill,
  SKILL_BODY_MAX,
  skillIdFromName,
  type SkillInput,
  type SkillView,
} from '../../shared/skills';
import { atomicWrite } from '../obsidian/vault';
import { tr } from '../../shared/messages';

export const SKILL_FILE = 'SKILL.md';
/** Größer darf eine SKILL.md nicht sein (Kopf + Anleitung, großzügig). */
const MAX_FILE_BYTES = SKILL_BODY_MAX * 4 + 4096;

/**
 * Skills als Ordner mit je einer SKILL.md unter `root` (z. B. %APPDATA%\LocalDesk\skills).
 * Gelesen und geschrieben wird nur dort; Verknüpfungen (Symlinks/Junctions) werden
 * nicht verfolgt. Andere Dateien in einem Skill-Ordner bleiben unbeachtet – nie ausgeführt.
 */
export class SkillStore {
  constructor(readonly root: string) {}

  /** Alle Skills, nach Namen sortiert. Kaputte Dateien erscheinen mit Fehler. */
  async list(): Promise<SkillView[]> {
    await this.ensureRoot();
    const entries = await readdir(this.root, { withFileTypes: true });
    const skills: SkillView[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !isSkillId(entry.name)) continue;
      const skill = await this.read(entry.name);
      if (skill) skills.push(skill);
    }
    return skills.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  /** Ein Skill – oder null, wenn es ihn nicht gibt. */
  async get(id: string): Promise<SkillView | null> {
    if (!isSkillId(id)) return null;
    await this.ensureRoot();
    return this.read(id);
  }

  /** Legt an (ohne id) oder überschreibt (mit id). Liefert den gespeicherten Skill. */
  async save(input: SkillInput): Promise<SkillView> {
    await this.ensureRoot();
    const id = input.id ?? (await this.freeId(skillIdFromName(input.name)));
    const dir = this.dir(id);
    if (input.id) {
      if (!(await this.isRealDir(dir)))
        throw new Error(tr('error.skillNotFound'));
    } else {
      await mkdir(dir);
    }
    await atomicWrite(path.join(dir, SKILL_FILE), formatSkill(input));
    return (await this.read(id))!;
  }

  /**
   * Löscht die SKILL.md und – wenn er dann leer ist – den Ordner. Liegen dort noch
   * andere Dateien, bleibt der Ordner stehen (die gehören nicht LocalDesk).
   */
  async remove(id: string): Promise<void> {
    if (!isSkillId(id)) throw new Error(tr('error.invalidSkillId'));
    const dir = this.dir(id);
    if (!(await this.isRealDir(dir))) return;
    await unlink(path.join(dir, SKILL_FILE)).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
    await rmdir(dir).catch(() => undefined);
  }

  private async read(id: string): Promise<SkillView | null> {
    const dir = this.dir(id);
    if (!(await this.isRealDir(dir))) return null;
    const file = path.join(dir, SKILL_FILE);
    let info;
    try {
      info = await lstat(file);
    } catch {
      return null; // Ordner ohne SKILL.md ist kein Skill
    }
    const broken = (error: string): SkillView => ({
      id,
      name: id,
      description: '',
      body: '',
      error,
    });
    if (!info.isFile()) return broken('SKILL.md ist keine normale Datei.');
    if (info.size > MAX_FILE_BYTES) return broken('SKILL.md ist zu groß.');
    const skill = parseSkill(await readFile(file, 'utf8'), id);
    if (skill.body.length > SKILL_BODY_MAX) {
      return { id, ...skill, body: '', error: 'Anleitung ist zu lang.' };
    }
    return { id, ...skill };
  }

  private dir(id: string): string {
    const dir = path.join(path.resolve(this.root), id);
    // Doppelte Sicherung zu isSkillId: nie außerhalb des Skill-Ordners.
    if (path.dirname(dir) !== path.resolve(this.root)) {
      throw new Error('Nur Skills im Skill-Ordner');
    }
    return dir;
  }

  /** Echter Ordner, keine Verknüpfung, die woandershin zeigt. */
  private async isRealDir(dir: string): Promise<boolean> {
    try {
      const info = await lstat(dir);
      return info.isDirectory() && !info.isSymbolicLink();
    } catch {
      return false;
    }
  }

  private async ensureRoot() {
    await mkdir(this.root, { recursive: true });
    const info = await lstat(this.root);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error('Der Skill-Ordner ist keine normale Ordner-Struktur.');
    }
  }

  /** „code-review“, sonst „code-review-2“, „-3“ … */
  private async freeId(base: string): Promise<string> {
    for (let n = 1; n < 1000; n++) {
      const id = n === 1 ? base : `${base.slice(0, 55)}-${n}`;
      try {
        await lstat(this.dir(id));
      } catch {
        return id;
      }
    }
    throw new Error('Zu viele Skills mit diesem Namen');
  }
}
