import type { DatabaseSync } from 'node:sqlite';
import type { ChatFolder, Result } from '../../shared/api';

const NAME_MAX_LENGTH = 80;

/** Ordner für Chats. Welcher Chat in welchem Ordner liegt, steht in chats.folder_id. */
export class FolderRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  /** Alphabetisch nach deutschen Regeln (Ü bei U). */
  listFolders(): ChatFolder[] {
    const rows = this.db
      .prepare('SELECT id, name FROM folders')
      .all() as unknown as ChatFolder[];
    return rows
      .map((row) => ({ id: row.id, name: row.name }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
      );
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
      return { ok: false, error: 'Ordner nicht gefunden' };
    }
    return { ok: true, value: { id: folderId, name: checked.value } };
  }

  /** Die Chats im Ordner bleiben erhalten (ON DELETE SET NULL → „ohne Ordner“). */
  deleteFolder(folderId: string) {
    this.db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
  }
}

function checkName(name: unknown): Result<string> {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed)
    return { ok: false, error: 'Bitte gib dem Ordner einen Namen.' };
  return { ok: true, value: trimmed.slice(0, NAME_MAX_LENGTH) };
}
