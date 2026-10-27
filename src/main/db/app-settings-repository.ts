import type { DatabaseSync } from 'node:sqlite';

/** Einfache App-Einstellungen als Schlüssel/Wert (Tabelle app_settings). */
export class AppSettingsRepository {
  constructor(private readonly db: DatabaseSync) {}

  get(key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string) {
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  delete(key: string) {
    this.db.prepare('DELETE FROM app_settings WHERE key = ?').run(key);
  }
}
