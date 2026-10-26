import type { DatabaseSync } from 'node:sqlite';
import type {
  ChatDetail,
  ChatSettings,
  ChatStats,
  ChatSummary,
  MessageRecord,
  MessageStatus,
} from '../../shared/api';
import { normalizeSettings } from '../../shared/settings';

interface ChatRow {
  id: string;
  title: string;
  model: string;
  updated_at: number;
}

interface ChatDetailRow extends ChatRow {
  settings_json: string;
}

interface MessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking: string;
  status: MessageStatus;
  model: string | null;
  error: string | null;
  stats_json: string | null;
}

/** Felder einer Antwort, die sich nach dem Anlegen noch ändern. */
export interface MessageUpdate {
  content: string;
  thinking: string;
  status: MessageStatus;
  error?: string;
  stats?: ChatStats;
}

/**
 * Alle Lese- und Schreibzugriffe auf Chats an einer Stelle („Repository“).
 * Der Rest der App kennt kein SQL – nur diese Methoden.
 */
export class ChatRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
  ) {}

  listChats(): ChatSummary[] {
    const rows = this.db
      .prepare(
        'SELECT id, title, model, updated_at FROM chats ORDER BY updated_at DESC',
      )
      .all() as unknown as ChatRow[];
    return rows.map(toSummary);
  }

  getChat(chatId: string): ChatDetail | null {
    const chat = this.db
      .prepare(
        'SELECT id, title, model, updated_at, settings_json FROM chats WHERE id = ?',
      )
      .get(chatId) as unknown as ChatDetailRow | undefined;
    if (!chat) return null;
    const rows = this.db
      .prepare(
        `SELECT id, role, content, thinking, status, model, error, stats_json
           FROM messages WHERE chat_id = ? ORDER BY position`,
      )
      .all(chatId) as unknown as MessageRow[];
    return {
      ...toSummary(chat),
      settings: parseSettings(chat.settings_json),
      messages: rows.map(toMessage),
    };
  }

  chatExists(chatId: string): boolean {
    return (
      this.db.prepare('SELECT 1 FROM chats WHERE id = ?').get(chatId) !==
      undefined
    );
  }

  createChat(chat: {
    id: string;
    title: string;
    model: string;
    settings?: ChatSettings;
  }) {
    const now = this.now();
    this.db
      .prepare(
        `INSERT INTO chats (id, title, model, created_at, updated_at, settings_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        chat.id,
        chat.title,
        chat.model,
        now,
        now,
        JSON.stringify(normalizeSettings(chat.settings)),
      );
  }

  updateSettings(chatId: string, settings: ChatSettings) {
    this.db
      .prepare('UPDATE chats SET settings_json = ? WHERE id = ?')
      .run(JSON.stringify(normalizeSettings(settings)), chatId);
  }

  renameChat(chatId: string, title: string) {
    this.db
      .prepare('UPDATE chats SET title = ? WHERE id = ?')
      .run(title, chatId);
  }

  deleteChat(chatId: string) {
    // Die Nachrichten löscht SQLite automatisch mit (ON DELETE CASCADE).
    this.db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
  }

  /** Hängt eine Nachricht hinten an und schiebt den Chat in der Liste nach oben. */
  appendMessage(chatId: string, message: MessageRecord) {
    const now = this.now();
    const { next } = this.db
      .prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM messages WHERE chat_id = ?',
      )
      .get(chatId) as { next: number };
    this.db
      .prepare(
        `INSERT INTO messages
           (id, chat_id, position, role, content, thinking, status, model, error, stats_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.id,
        chatId,
        next,
        message.role,
        message.content,
        message.thinking,
        message.status,
        message.model ?? null,
        message.error ?? null,
        message.stats ? JSON.stringify(message.stats) : null,
        now,
      );
    const model = message.model ?? null;
    this.db
      .prepare(
        'UPDATE chats SET updated_at = ?, model = COALESCE(?, model) WHERE id = ?',
      )
      .run(now, model, chatId);
  }

  updateMessage(messageId: string, update: MessageUpdate) {
    this.db
      .prepare(
        `UPDATE messages SET content = ?, thinking = ?, status = ?, error = ?, stats_json = ?
          WHERE id = ?`,
      )
      .run(
        update.content,
        update.thinking,
        update.status,
        update.error ?? null,
        update.stats ? JSON.stringify(update.stats) : null,
        messageId,
      );
  }

  /**
   * Antworten, die beim letzten Beenden noch liefen (App geschlossen, Absturz),
   * gelten als abgebrochen. Gibt zurück, wie viele es waren.
   */
  markInterrupted(): number {
    const result = this.db
      .prepare(
        "UPDATE messages SET status = 'aborted' WHERE status = 'streaming'",
      )
      .run();
    return Number(result.changes);
  }
}

function toSummary(row: ChatRow): ChatSummary {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updated_at,
  };
}

/** Auch Gespeichertes wird geprüft – eine kaputte Zeile soll die App nicht stoppen. */
function parseSettings(json: string): ChatSettings {
  try {
    return normalizeSettings(JSON.parse(json));
  } catch {
    return {};
  }
}

function toMessage(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    thinking: row.thinking,
    status: row.status,
    model: row.model ?? undefined,
    error: row.error ?? undefined,
    stats: row.stats_json
      ? (JSON.parse(row.stats_json) as ChatStats)
      : undefined,
  };
}
