import type { DatabaseSync } from 'node:sqlite';
import type {
  ChatDetail,
  ChatSettings,
  ChatStats,
  ChatSummary,
  MessageRecord,
  MessageStatus,
  SearchHit,
  SearchResult,
  SourceRef,
  ToolCallRecord,
} from '../../shared/api';
import {
  buildFtsQuery,
  HIGHLIGHT_END,
  HIGHLIGHT_START,
  searchTerms,
} from '../../shared/search';
import { normalizeSettings } from '../../shared/settings';
import { parseSources } from '../../shared/knowledge';
import { parseToolCalls, settleToolCalls } from '../../shared/tools';

const MAX_SEARCH_HITS = 50;
/** Wie viele Wörter der Textausschnitt um einen Treffer ungefähr zeigt. */
const SNIPPET_WORDS = 16;

interface ChatRow {
  id: string;
  title: string;
  model: string;
  updated_at: number;
  folder_id: string | null;
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
  tool_calls_json: string | null;
  sources_json: string | null;
}

/** Felder einer Antwort, die sich nach dem Anlegen noch ändern. */
export interface MessageUpdate {
  content: string;
  thinking: string;
  status: MessageStatus;
  error?: string;
  stats?: ChatStats;
  toolCalls?: ToolCallRecord[];
  sources?: SourceRef[];
  knowledgeError?: string;
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
        'SELECT id, title, model, updated_at, folder_id FROM chats ORDER BY updated_at DESC',
      )
      .all() as unknown as ChatRow[];
    return rows.map(toSummary);
  }

  getChat(chatId: string): ChatDetail | null {
    const chat = this.db
      .prepare(
        'SELECT id, title, model, updated_at, folder_id, settings_json FROM chats WHERE id = ?',
      )
      .get(chatId) as unknown as ChatDetailRow | undefined;
    if (!chat) return null;
    const rows = this.db
      .prepare(
        `SELECT id, role, content, thinking, status, model, error, stats_json, tool_calls_json,
                sources_json
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

  /**
   * Legt einen Chat in einen Ordner (oder mit null wieder heraus).
   * Einen nicht existierenden Ordner lehnt die Datenbank ab (Fremdschlüssel) –
   * dann bleibt der Chat, wo er war.
   */
  moveChat(chatId: string, folderId: string | null): boolean {
    try {
      this.db
        .prepare('UPDATE chats SET folder_id = ? WHERE id = ?')
        .run(folderId, chatId);
      return true;
    } catch {
      return false;
    }
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
           (id, chat_id, position, role, content, thinking, status, model, error, stats_json,
            tool_calls_json, sources_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        toolCallsJson(message.toolCalls),
        sourcesJson(message),
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
        `UPDATE messages
            SET content = ?, thinking = ?, status = ?, error = ?, stats_json = ?, tool_calls_json = ?,
                sources_json = ?
          WHERE id = ?`,
      )
      .run(
        update.content,
        update.thinking,
        update.status,
        update.error ?? null,
        update.stats ? JSON.stringify(update.stats) : null,
        toolCallsJson(update.toolCalls),
        sourcesJson(update),
        messageId,
      );
  }

  /**
   * Volltextsuche über alle Nachrichten (FTS5-Index, beste Treffer zuerst)
   * plus Chats, deren Titel alle Suchwörter enthält.
   */
  search(input: string): SearchResult {
    const query = buildFtsQuery(input);
    if (!query) return { chats: [], hits: [] };

    const hits = this.db
      .prepare(
        `SELECT m.id AS messageId, m.role AS role, c.id AS chatId, c.title AS chatTitle,
                snippet(messages_fts, 0, ?, ?, '…', ?) AS snippet
           FROM messages_fts
           JOIN messages m ON m.rowid = messages_fts.rowid
           JOIN chats c ON c.id = m.chat_id
          WHERE messages_fts MATCH ?
          ORDER BY rank
          LIMIT ?`,
      )
      .all(
        HIGHLIGHT_START,
        HIGHLIGHT_END,
        SNIPPET_WORDS,
        query,
        MAX_SEARCH_HITS,
      ) as unknown as SearchHit[];

    // Titel sind kurz – hier reicht ein einfacher Vergleich in JavaScript,
    // der auch Umlaute richtig klein schreibt (SQL-LIKE kann das nicht).
    const terms = searchTerms(input).map((t) => t.toLocaleLowerCase('de'));
    const chats = this.listChats().filter((chat) => {
      const title = chat.title.toLocaleLowerCase('de');
      return terms.every((term) => title.includes(term));
    });

    return { chats, hits };
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
    ...(row.folder_id && { folderId: row.folder_id }),
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

function toolCallsJson(calls: ToolCallRecord[] | undefined): string | null {
  return calls && calls.length > 0 ? JSON.stringify(calls) : null;
}

/** Quellen und ein Suchfehler zusammen als JSON (null = keine Wissenssuche). */
function sourcesJson(
  message: Pick<MessageRecord, 'sources' | 'knowledgeError'>,
): string | null {
  if (message.sources === undefined && message.knowledgeError === undefined) {
    return null;
  }
  return JSON.stringify({
    sources: message.sources ?? [],
    ...(message.knowledgeError && { error: message.knowledgeError }),
  });
}

function toMessage(row: MessageRow): MessageRecord {
  const toolCalls = parseToolCalls(row.tool_calls_json);
  const knowledge = parseSources(row.sources_json);
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
    // Wurde die App mitten in einer Antwort beendet, wartet kein Aufruf mehr.
    ...(toolCalls.length > 0 && {
      toolCalls:
        row.status === 'streaming' ? toolCalls : settleToolCalls(toolCalls),
    }),
    ...knowledge,
  };
}
