import type { DatabaseSync } from 'node:sqlite';
import type { ChatTemplate, Result, TemplateInput } from '../../shared/api';
import { normalizeSettings } from '../../shared/settings';

interface TemplateRow {
  id: string;
  name: string;
  model: string | null;
  settings_json: string;
  updated_at: number;
}

const NAME_MAX_LENGTH = 100;

/** Lese- und Schreibzugriffe auf Vorlagen. */
export class TemplateRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Alphabetisch – Vorlagen sucht man nach Namen, nicht nach Datum.
   * Sortiert wird in JavaScript nach deutschen Regeln: SQLite allein würde
   * „Übersetzer“ hinter „zusammenfassen“ stellen.
   */
  listTemplates(): ChatTemplate[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, model, settings_json, updated_at FROM templates',
      )
      .all() as unknown as TemplateRow[];
    return rows
      .map(toTemplate)
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
      );
  }

  getTemplate(templateId: string): ChatTemplate | null {
    const row = this.db
      .prepare(
        'SELECT id, name, model, settings_json, updated_at FROM templates WHERE id = ?',
      )
      .get(templateId) as unknown as TemplateRow | undefined;
    return row ? toTemplate(row) : null;
  }

  /**
   * Legt an oder überschreibt eine Vorlage mit derselben id.
   * Die Eingabe kommt aus der Oberfläche und wird deshalb geprüft.
   */
  saveTemplate(input: unknown): Result<ChatTemplate> {
    const checked = validateInput(input);
    if (!checked.ok) return checked;
    const { id, name, model, settings } = checked.value;
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO templates (id, name, model, settings_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           model = excluded.model,
           settings_json = excluded.settings_json,
           updated_at = excluded.updated_at`,
      )
      .run(id, name, model ?? null, JSON.stringify(settings), now, now);
    return { ok: true, value: this.getTemplate(id)! };
  }

  deleteTemplate(templateId: string) {
    this.db.prepare('DELETE FROM templates WHERE id = ?').run(templateId);
  }
}

function validateInput(input: unknown): Result<TemplateInput> {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Ungültige Vorlage' };
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id === '') {
    return { ok: false, error: 'Vorlage ohne ID' };
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) {
    return { ok: false, error: 'Bitte gib der Vorlage einen Namen.' };
  }
  const model =
    typeof raw.model === 'string' && raw.model !== '' ? raw.model : undefined;
  return {
    ok: true,
    value: {
      id: raw.id,
      name: name.slice(0, NAME_MAX_LENGTH),
      model,
      settings: normalizeSettings(raw.settings),
    },
  };
}

function toTemplate(row: TemplateRow): ChatTemplate {
  let settings = {};
  try {
    settings = normalizeSettings(JSON.parse(row.settings_json));
  } catch {
    // kaputtes JSON → Standardeinstellungen
  }
  return {
    id: row.id,
    name: row.name,
    model: row.model ?? undefined,
    settings,
    updatedAt: row.updated_at,
  };
}
