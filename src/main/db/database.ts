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
  // 3: Vorlagen – gespeicherte Kombination aus Modell und Einstellungen für neue Chats
  `
  CREATE TABLE templates (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    model         TEXT,
    settings_json TEXT NOT NULL DEFAULT '{}',
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );
  `,
  // 4: Volltextsuche über alle Nachrichten (FTS5). Der Index verweist auf die
  // Tabelle messages und wird über Trigger automatisch mitgepflegt – auch beim
  // Zwischenspeichern laufender Antworten und beim Löschen ganzer Chats.
  // remove_diacritics: „koln“ findet auch „Köln“.
  `
  CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content = 'messages',
    content_rowid = 'rowid',
    tokenize = 'unicode61 remove_diacritics 2'
  );

  CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
  END;

  CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content)
      VALUES ('delete', old.rowid, old.content);
  END;

  CREATE TRIGGER messages_fts_update AFTER UPDATE OF content ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content)
      VALUES ('delete', old.rowid, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
  END;

  -- Bereits vorhandene Nachrichten einmalig in den Index aufnehmen
  INSERT INTO messages_fts(messages_fts) VALUES ('rebuild');
  `,
  // 5: Server-Profile (lokal, anderer Rechner im LAN) und allgemeine App-Einstellungen.
  // Startwert: „Dieser PC“ mit der bisherigen festen Adresse.
  `
  CREATE TABLE server_profiles (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    base_url   TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT INTO server_profiles (id, name, base_url, created_at)
    VALUES ('local', 'Dieser PC', 'http://localhost:11434', 0);
  INSERT INTO app_settings (key, value) VALUES ('activeServerId', 'local');
  `,
  // 6: Ordner für Chats (eine Ebene, keine Unterordner). Wird ein Ordner gelöscht,
  // bleiben seine Chats erhalten und landen wieder bei „ohne Ordner“ (SET NULL).
  `
  CREATE TABLE folders (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  ALTER TABLE chats ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL;
  CREATE INDEX chats_by_folder ON chats(folder_id);
  `,
  // 7: MCP-Server. Gespeichert wird nur die Art (z. B. „filesystem“) und ihre
  // Einstellungen – den Befehl baut der Main-Prozess selbst. So kann nie ein
  // beliebiges Programm über die Datenbank oder die Oberfläche gestartet werden.
  `
  CREATE TABLE mcp_servers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL,
    config_json TEXT NOT NULL DEFAULT '{}',
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL
  );
  `,
  // 8: Freigaben pro Tool. Gespeichert werden nur Abweichungen vom Standard
  // („nur lesend“ → immer, sonst fragen). Wird ein Server gelöscht, verschwinden
  // seine Freigaben mit.
  `
  CREATE TABLE mcp_tool_permissions (
    server_id  TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    tool_name  TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('always', 'ask', 'off')),
    PRIMARY KEY (server_id, tool_name)
  );
  `,
  // 9: Tool-Aufrufe einer Antwort (Liste als JSON). Sie gehören immer zu genau einer
  // Antwort und werden nie einzeln gesucht – eine eigene Tabelle wäre unnötig.
  `
  ALTER TABLE messages ADD COLUMN tool_calls_json TEXT;
  `,
  // 10: Wissenssammlungen. Dokumente merken sich Größe, Änderungszeit und Prüfsumme,
  // damit „Neu einlesen“ nur Geändertes neu berechnet. Abschnitte tragen ihren
  // Fingerabdruck als Float32-BLOB. Löschen einer Sammlung räumt alles darunter mit ab.
  `
  CREATE TABLE collections (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    sources_json    TEXT NOT NULL DEFAULT '[]',
    embedding_model TEXT NOT NULL,
    indexed_at      INTEGER,
    created_at      INTEGER NOT NULL
  );

  CREATE TABLE documents (
    id            TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    path          TEXT NOT NULL,
    size          INTEGER NOT NULL,
    mtime         INTEGER NOT NULL,
    hash          TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('ok', 'empty', 'skipped', 'error')),
    error         TEXT,
    chunk_count   INTEGER NOT NULL DEFAULT 0,
    indexed_at    INTEGER NOT NULL,
    UNIQUE (collection_id, path)
  );

  CREATE TABLE chunks (
    id          INTEGER PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    start       INTEGER NOT NULL,
    end         INTEGER NOT NULL,
    heading     TEXT,
    text        TEXT NOT NULL,
    vector      BLOB NOT NULL
  );
  CREATE INDEX chunks_by_document ON chunks(document_id);
  `,
  // 11: Seitenzahl bei PDFs, damit eine Quelle „S. 12“ angeben kann.
  `
  ALTER TABLE chunks ADD COLUMN page INTEGER;
  `,
  // 12: Stichwortsuche in den Abschnitten (ergänzt die Fingerabdruck-Suche bei Namen,
  // Nummern, Fachbegriffen) und die Quellen einer Antwort.
  `
  CREATE VIRTUAL TABLE chunks_fts USING fts5(
    heading,
    text,
    content = 'chunks',
    content_rowid = 'id',
    tokenize = 'unicode61 remove_diacritics 2'
  );

  CREATE TRIGGER chunks_fts_insert AFTER INSERT ON chunks BEGIN
    INSERT INTO chunks_fts(rowid, heading, text) VALUES (new.id, new.heading, new.text);
  END;

  CREATE TRIGGER chunks_fts_delete AFTER DELETE ON chunks BEGIN
    INSERT INTO chunks_fts(chunks_fts, rowid, heading, text)
      VALUES ('delete', old.id, old.heading, old.text);
  END;

  INSERT INTO chunks_fts(chunks_fts) VALUES ('rebuild');

  ALTER TABLE messages ADD COLUMN sources_json TEXT;
  `,
  // 13: Ordner werden Projekte: Anweisungen für alle Chats darin und eigene Dokumente.
  // Die Dokumente sind eine normale Sammlung mit project_id – wird das Projekt
  // gelöscht, verschwindet sie (samt Abschnitten) mit; die Dateien selbst bleiben.
  `
  ALTER TABLE folders ADD COLUMN instructions TEXT NOT NULL DEFAULT '';
  ALTER TABLE collections ADD COLUMN project_id TEXT REFERENCES folders(id) ON DELETE CASCADE;
  CREATE UNIQUE INDEX collections_by_project ON collections(project_id) WHERE project_id IS NOT NULL;
  `,
  // 14: Zusammenfassungen – bei wie vielen Nachrichten zuletzt gespeichert oder
  // „Nein danke“ gesagt wurde. Der Vorschlag kommt erst nach 6 neuen wieder.
  `
  ALTER TABLE chats ADD COLUMN summary_at_count INTEGER;
  `,
  // 15: Die Sammlung „Obsidian“ (der Vault) ist gekennzeichnet – höchstens eine.
  `
  ALTER TABLE collections ADD COLUMN kind TEXT;
  CREATE UNIQUE INDEX collections_by_kind ON collections(kind) WHERE kind IS NOT NULL;
  `,
  // 16: Skills eines Projekts – gelten in jedem Chat des Projekts (Liste von Kennungen als JSON).
  `
  ALTER TABLE folders ADD COLUMN skills_json TEXT NOT NULL DEFAULT '[]';
  `,
  // 17: Mail-Konten. refresh_token ist mit Windows verschlüsselt (safeStorage, Base64) –
  // die Mails selbst speichert LocalDesk nicht.
  `
  CREATE TABLE mail_accounts (
    id            TEXT PRIMARY KEY,
    provider      TEXT NOT NULL,
    email         TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    UNIQUE (provider, email)
  );
  `,
  // 18: Code-Sitzungen (Phase 12) sind Chats mit Projektordner. Sie stehen nicht in der
  // normalen Chat-Liste, sondern auf der Seite „Code“.
  `
  ALTER TABLE chats ADD COLUMN workspace TEXT;
  `,
  // 19: Verdichtung eines langen Chats (Zusammenfassung des älteren Teils, als JSON). Die
  // Nachrichten selbst bleiben unverändert.
  `
  ALTER TABLE chats ADD COLUMN compaction_json TEXT;
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
