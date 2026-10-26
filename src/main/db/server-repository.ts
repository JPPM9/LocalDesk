import type { DatabaseSync } from 'node:sqlite';
import type { Result, ServerProfile } from '../../shared/api';
import { normalizeServerUrl } from '../../shared/server';

interface ProfileRow {
  id: string;
  name: string;
  base_url: string;
}

const ACTIVE_KEY = 'activeServerId';
const NAME_MAX_LENGTH = 80;

/** Gespeicherte Ollama-Server und welcher davon gerade aktiv ist. */
export class ServerRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
  ) {}

  listProfiles(): ServerProfile[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, base_url FROM server_profiles ORDER BY created_at, name',
      )
      .all() as unknown as ProfileRow[];
    const activeId = this.activeId(rows);
    return rows.map((row) => toProfile(row, row.id === activeId));
  }

  /** Der aktive Server – es gibt immer genau einen. */
  getActive(): ServerProfile {
    return this.listProfiles().find((p) => p.active)!;
  }

  /**
   * Legt an oder ändert (gleiche id). Name und Adresse kommen aus der
   * Oberfläche und werden geprüft; die Adresse wird vervollständigt.
   */
  saveProfile(input: unknown): Result<ServerProfile> {
    if (typeof input !== 'object' || input === null) {
      return { ok: false, error: 'Ungültige Eingabe' };
    }
    const raw = input as Record<string, unknown>;
    if (typeof raw.id !== 'string' || raw.id === '') {
      return { ok: false, error: 'Profil ohne ID' };
    }
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) return { ok: false, error: 'Bitte gib dem Server einen Namen.' };
    const url = normalizeServerUrl(
      typeof raw.address === 'string' ? raw.address : '',
    );
    if (!url.ok) return url;

    this.db
      .prepare(
        `INSERT INTO server_profiles (id, name, base_url, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, base_url = excluded.base_url`,
      )
      .run(raw.id, name.slice(0, NAME_MAX_LENGTH), url.value, this.now());
    return {
      ok: true,
      value: this.listProfiles().find((p) => p.id === raw.id)!,
    };
  }

  /** Der letzte Server lässt sich nicht löschen – ohne Server kann die App nichts. */
  deleteProfile(profileId: string): Result<void> {
    const profiles = this.listProfiles();
    if (profiles.length <= 1) {
      return {
        ok: false,
        error: 'Der letzte Server kann nicht gelöscht werden.',
      };
    }
    this.db.prepare('DELETE FROM server_profiles WHERE id = ?').run(profileId);
    // War er aktiv, übernimmt automatisch der erste verbleibende (siehe activeId).
    return { ok: true, value: undefined };
  }

  setActive(profileId: string): Result<ServerProfile> {
    const profile = this.listProfiles().find((p) => p.id === profileId);
    if (!profile) return { ok: false, error: 'Server nicht gefunden' };
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(ACTIVE_KEY, profileId);
    return { ok: true, value: { ...profile, active: true } };
  }

  /** Gespeicherter aktiver Server – oder der erste, falls der gespeicherte fehlt. */
  private activeId(rows: ProfileRow[]): string | undefined {
    const stored = this.db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(ACTIVE_KEY) as { value: string } | undefined;
    return rows.some((r) => r.id === stored?.value)
      ? stored?.value
      : rows[0]?.id;
  }
}

function toProfile(row: ProfileRow, active: boolean): ServerProfile {
  return { id: row.id, name: row.name, baseUrl: row.base_url, active };
}
