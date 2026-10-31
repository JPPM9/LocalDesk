import { lstat, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  formatSkill,
  isSkillId,
  isSkillTextFile,
  parseSkill,
  SKILL_BODY_MAX,
  SKILL_FILE_DEPTH_MAX,
  SKILL_FILE_MAX_BYTES,
  SKILL_FILE_TEXT_MAX,
  SKILL_FILES_MAX,
  skillIdFromName,
  type SkillFile,
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
 * nicht verfolgt. Zusatzdateien im Skill-Ordner (nur Text, z. B. references/stil.md)
 * kann das Modell lesen; alles andere (Skripte, Programme) bleibt unbeachtet – nie ausgeführt.
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
   * Löscht den ganzen Skill-Ordner mit allem darin (SKILL.md und Zusatzdateien).
   * Enthält er eine Verknüpfung (Symlink/Junction), wird nichts gelöscht – sie
   * könnte auf etwas außerhalb zeigen.
   */
  async remove(id: string): Promise<void> {
    if (!isSkillId(id)) throw new Error(tr('error.invalidSkillId'));
    const dir = this.dir(id);
    if (!(await this.isRealDir(dir))) return;
    await this.assertNoLinks(dir);
    await rm(dir, { recursive: true, force: true });
  }

  /**
   * Der Text einer Zusatzdatei. Erlaubt ist nur, was `listFiles` kennt (echte Textdatei
   * im Skill-Ordner) – so kann ein Pfad wie „../..“ nirgends hinführen.
   */
  async readFile(id: string, file: string): Promise<string> {
    if (!isSkillId(id)) throw new Error(tr('error.invalidSkillId'));
    const dir = this.dir(id);
    if (!(await this.isRealDir(dir)))
      throw new Error(tr('error.skillNotFound'));
    const wanted = file.trim().replace(/\\/g, '/').replace(/^\.\//, '');
    const entry = (await this.listFiles(dir)).find(
      (f) => f.path.toLowerCase() === wanted.toLowerCase(),
    );
    if (!entry) {
      throw new Error(tr('skills.fileUnknown', { file: wanted.slice(0, 100) }));
    }
    const full = path.join(dir, ...entry.path.split('/'));
    const info = await lstat(full);
    if (!info.isFile()) {
      throw new Error(tr('skills.fileUnknown', { file: entry.path }));
    }
    if (info.size > SKILL_FILE_MAX_BYTES) {
      throw new Error(tr('skills.extraFileTooLarge'));
    }
    const text = await readFile(full, 'utf8');
    if (text.includes('\0')) throw new Error(tr('skills.fileNotText'));
    return text.length > SKILL_FILE_TEXT_MAX
      ? `${text.slice(0, SKILL_FILE_TEXT_MAX)}\n${tr('skills.fileTruncated')}`
      : text;
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
    if (!info.isFile()) return broken(tr('skills.notRegularFile'));
    if (info.size > MAX_FILE_BYTES) return broken(tr('skills.fileTooLarge'));
    const skill = parseSkill(await readFile(file, 'utf8'), id);
    if (skill.body.length > SKILL_BODY_MAX) {
      return { id, ...skill, body: '', error: tr('skills.bodyTooLong') };
    }
    return { id, ...skill, files: await this.listFiles(dir) };
  }

  /**
   * Zusatzdateien: echte Textdateien (keine Verknüpfungen, keine versteckten Namen)
   * bis zu 3 Ordner tief, höchstens 50. Pfade mit „/“, relativ zum Skill-Ordner.
   */
  private async listFiles(dir: string): Promise<SkillFile[]> {
    const found: SkillFile[] = [];
    const walk = async (current: string, relative: string, depth: number) => {
      let entries;
      try {
        entries = await readdir(current, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
      for (const entry of entries) {
        if (found.length >= SKILL_FILES_MAX) return;
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
        const rel = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (depth < SKILL_FILE_DEPTH_MAX) {
            await walk(path.join(current, entry.name), rel, depth + 1);
          }
          continue;
        }
        if (!entry.isFile() || !isSkillTextFile(rel)) continue;
        if (
          !relative &&
          entry.name.toLowerCase() === SKILL_FILE.toLowerCase()
        ) {
          continue;
        }
        const info = await lstat(path.join(current, entry.name)).catch(
          () => null,
        );
        if (info?.isFile()) found.push({ path: rel, size: info.size });
      }
    };
    await walk(dir, '', 0);
    return found;
  }

  /** Wirft, wenn im Ordner irgendwo eine Verknüpfung liegt (dann wird nichts gelöscht). */
  private async assertNoLinks(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const info = await lstat(full);
      if (info.isSymbolicLink()) throw new Error(tr('skills.hasLinks'));
      if (info.isDirectory()) await this.assertNoLinks(full);
    }
  }

  private dir(id: string): string {
    const dir = path.join(path.resolve(this.root), id);
    // Doppelte Sicherung zu isSkillId: nie außerhalb des Skill-Ordners.
    if (path.dirname(dir) !== path.resolve(this.root)) {
      throw new Error(tr('skills.onlyInFolder'));
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
      throw new Error(tr('skills.badFolder'));
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
    throw new Error(tr('skills.tooManySameName'));
  }
}
