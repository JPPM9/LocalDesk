import type { DatabaseSync } from 'node:sqlite';
import type { ChatFolder, Result } from '../../shared/api';
import { normalizeSettings } from '../../shared/settings';

const NAME_MAX_LENGTH = 80;
/** Wie beim Systemprompt eines Chats. */
const INSTRUCTIONS_MAX_LENGTH = 20_000;

interface FolderRow {
  id: string;
  name: string;
  instructions: string;
  skills_json: string;
  collection_id: string | null;
}

/**
 * Projekte (früher „Ordner“) für Chats. Welcher Chat in welchem Projekt liegt,
 * steht in chats.folder_id; die Projekt-Dokumente sind eine Sammlung mit project_id.
 */
export class FolderRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  /** Alphabetisch nach deutschen Regeln (Ü bei U). */
  listFolders(): ChatFolder[] {
    const rows = this.db
      .prepare(
        `SELECT f.id, f.name, f.instructions, f.skills_json, c.id AS collection_id
           FROM folders f LEFT JOIN collections c ON c.project_id = f.id`,
      )
      .all() as unknown as FolderRow[];
    return rows
      .map(toFolder)
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
      );
  }

  getFolder(folderId: string): ChatFolder | null {
    return this.listFolders().find((f) => f.id === folderId) ?? null;
  }

  createFolder(name: unknown): Result<ChatFolder> {
    const checked = checkName(name);
    if (!checked.ok) return checked;
    const folder = { id: this.newId(), name: checked.value };
    this.db
      .prepare('INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)')
      .run(folder.id, folder.name, this.now());
    return { ok: true, value: folder };
  }

  renameFolder(folderId: string, name: unknown): Result<ChatFolder> {
    const checked = checkName(name);
    if (!checked.ok) return checked;
    const result = this.db
      .prepare('UPDATE folders SET name = ? WHERE id = ?')
      .run(checked.value, folderId);
    if (Number(result.changes) === 0) {
      return { ok: false, error: 'Projekt nicht gefunden' };
    }
    // Die Projekt-Dokumente heißen wie das Projekt (so stehen sie bei den Quellen).
    this.db
      .prepare('UPDATE collections SET name = ? WHERE project_id = ?')
      .run(checked.value, folderId);
    return { ok: true, value: this.getFolder(folderId)! };
  }

  setInstructions(folderId: string, instructions: unknown) {
    if (typeof instructions !== 'string') return;
    this.db
      .prepare('UPDATE folders SET instructions = ? WHERE id = ?')
      .run(instructions.trim().slice(0, INSTRUCTIONS_MAX_LENGTH), folderId);
  }

  /** Skills des Projekts – geprüft wie die Skill-Liste eines Chats. */
  setSkills(folderId: string, skillIds: unknown) {
    const skills = normalizeSettings({ skills: skillIds }).skills ?? [];
    this.db
      .prepare('UPDATE folders SET skills_json = ? WHERE id = ?')
      .run(JSON.stringify(skills), folderId);
  }

  /**
   * Die Chats im Projekt bleiben erhalten (ON DELETE SET NULL → „ohne Projekt“);
   * die Projekt-Dokumente (Sammlung, Abschnitte) verschwinden mit (CASCADE).
   */
  deleteFolder(folderId: string) {
    this.db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
  }
}

function toFolder(row: FolderRow): ChatFolder {
  // Auch Gespeichertes prüfen – eine kaputte Zeile soll die App nicht stoppen.
  let skills: string[] = [];
  try {
    skills =
      normalizeSettings({ skills: JSON.parse(row.skills_json) }).skills ?? [];
  } catch {
    skills = [];
  }
  return {
    id: row.id,
    name: row.name,
    ...(row.instructions && { instructions: row.instructions }),
    ...(row.collection_id && { collectionId: row.collection_id }),
    ...(skills.length > 0 && { skills }),
  };
}

function checkName(name: unknown): Result<string> {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed)
    return { ok: false, error: 'Bitte gib dem Projekt einen Namen.' };
  return { ok: true, value: trimmed.slice(0, NAME_MAX_LENGTH) };
}
