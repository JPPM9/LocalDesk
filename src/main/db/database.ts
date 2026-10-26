import { DatabaseSync } from 'node:sqlite';

/**
 * Änderungen am Datenbank-Aufbau, in der Reihenfolge, in der sie entstanden sind.
 * Bestehende Einträge werden NIE geändert – neue Spalten oder Tabellen kommen als
 * neuer Eintrag hinten dazu. SQLite merkt sich in `user_version`, wie viele schon
 * ausgeführt wurden; beim Start laufen nur die fehlenden.
 */
const migrations: string[] = [
  // 1: Chats und Nachrichten
  `
  CREATE TABLE chats (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    model      TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE messages (
    id         TEXT PRIMARY KEY,
    chat_id    TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL DEFAULT '',
    thinking   TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL CHECK (status IN ('streaming', 'done', 'error', 'aborted')),
    model      TEXT,
    error      TEXT,
    stats_json TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX messages_by_chat ON messages(chat_id, position);
  CREATE INDEX chats_by_update ON chats(updated_at DESC);
  `,
  // 2: Einstellungen pro Chat (Systemprompt, Temperatur, Kontextlänge …) als JSON
  `
  ALTER TABLE chats ADD COLUMN settings_json TEXT NOT NULL DEFAULT '{}';
  `,
];

/** Öffnet (oder erstellt) die Datenbank und bringt den Aufbau auf den neuesten Stand. */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  // Fremdschlüssel: Löscht man einen Chat, verschwinden seine Nachrichten mit.
  db.exec('PRAGMA foreign_keys = ON');
  // WAL: Schreiben blockiert das Lesen nicht und ist robuster bei Abstürzen.
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  migrate(db);
  return db;
}

/** `upTo` nur für Tests: simuliert eine ältere Datenbank. */
export function migrate(db: DatabaseSync, upTo = migrations.length) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  for (let version = current; version < upTo; version++) {
    // Alles oder nichts: Schlägt ein Schritt fehl, bleibt die Datenbank wie vorher.
    db.exec('BEGIN');
    try {
      db.exec(migrations[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export const SCHEMA_VERSION = migrations.length;
