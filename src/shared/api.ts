// Gemeinsame Typen für die Brücke zwischen Main-Prozess und Oberfläche.
// Main (Node) und Renderer (React) importieren beide aus dieser Datei,
// damit sich beide Seiten auf dieselben Datenformen verlassen können.

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  node: string;
  chrome: string;
  /** Ordner, in dem LocalDesk seine Daten (Datenbank) ablegt. */
  dataPath: string;
}

/** Ergebnis einer Verbindungsprüfung zu einem KI-Server (z. B. Ollama). */
export type ProviderStatus =
  | { online: true; baseUrl: string; version: string }
  | { online: false; baseUrl: string; error: string };

/** Ein installiertes Modell, unabhängig davon, von welchem Server es kommt. */
export interface ModelInfo {
  name: string;
  sizeBytes: number;
  /** ISO-Datum der letzten Änderung (z. B. Download). */
  modifiedAt: string;
  family?: string;
  /** Anzahl Parameter, wie vom Server angegeben, z. B. "14.8B". */
  parameterSize?: string;
  /** Quantisierung, z. B. "Q4_K_M". */
  quantization?: string;
  /** Maximale Kontextlänge in Tokens, die das Modell unterstützt. */
  contextLength?: number;
  /** Fähigkeiten wie "vision", "tools", "thinking". */
  capabilities: string[];
}

/**
 * Antwort für Aufrufe, die fehlschlagen können. Fehler kommen als Text zurück statt
 * als Ausnahme – Ausnahmen verlieren über IPC ihre Details.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
}

/** Kennzahlen, die der Server am Ende einer Antwort liefert. */
export interface ChatStats {
  /** Anzahl erzeugter Tokens. */
  outputTokens: number;
  /** Erzeugte Tokens pro Sekunde (ohne Ladezeit und Prompt-Verarbeitung). */
  tokensPerSecond: number;
  /** Tokens der Eingabe (Verlauf + neue Nachricht). */
  promptTokens: number;
  /** Gesamtdauer in Millisekunden. */
  totalMs: number;
}

/** Ein Stück einer gestreamten Antwort. */
export type ChatChunk =
  | { type: 'content'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'done'; stats?: ChatStats };

/** Was der Main-Prozess während einer Antwort an die Oberfläche schickt. */
export type ChatStreamEvent = { requestId: string } & (
  | ChatChunk
  | { type: 'error'; error: string }
  | { type: 'aborted' }
);

export type MessageStatus = 'streaming' | 'done' | 'error' | 'aborted';

/** Eine gespeicherte Nachricht – so liegt sie in der Datenbank und so zeigt die Oberfläche sie. */
export interface MessageRecord {
  /** Bei Antworten des Modells zugleich die requestId der Anfrage. */
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** „Gedanken“ von Denkmodellen (qwen3, gpt-oss …), getrennt von der Antwort. */
  thinking: string;
  status: MessageStatus;
  model?: string;
  stats?: ChatStats;
  error?: string;
}

/** Ein Chat in der Liste (ohne Nachrichten). */
export interface ChatSummary {
  id: string;
  title: string;
  model: string;
  /** Zeitpunkt der letzten Nachricht in Millisekunden seit 1970. */
  updatedAt: number;
}

export interface ChatDetail extends ChatSummary {
  messages: MessageRecord[];
}

/** Eine neue Nachricht in einem (evtl. noch nicht existierenden) Chat. */
export interface ChatSendRequest {
  /** Gibt es diesen Chat noch nicht, legt der Main-Prozess ihn an. */
  chatId: string;
  userMessageId: string;
  /** Wird zur ID der Antwort und kennzeichnet die Stream-Ereignisse. */
  requestId: string;
  model: string;
  content: string;
}

/** Alles, was die Oberfläche über `window.api` aufrufen darf. */
export interface LocalDeskApi {
  getAppInfo: () => Promise<AppInfo>;
  getOllamaStatus: () => Promise<ProviderStatus>;
  listModels: () => Promise<Result<ModelInfo[]>>;

  listChats: () => Promise<ChatSummary[]>;
  getChat: (chatId: string) => Promise<ChatDetail | null>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;

  /**
   * Speichert die Nachricht und startet die Antwort. Die Teile kommen über
   * `onChatEvent` mit derselben requestId.
   */
  chatSend: (request: ChatSendRequest) => Promise<void>;
  chatCancel: (requestId: string) => Promise<void>;
  /** Meldet sich für Chat-Ereignisse an; gibt eine Funktion zum Abmelden zurück. */
  onChatEvent: (listener: (event: ChatStreamEvent) => void) => () => void;
}

/** Namen der IPC-Kanäle an einer Stelle, damit sich keine Tippfehler einschleichen. */
export const IpcChannels = {
  getAppInfo: 'app:get-info',
  getOllamaStatus: 'ollama:get-status',
  listModels: 'models:list',
  listChats: 'chats:list',
  getChat: 'chats:get',
  renameChat: 'chats:rename',
  deleteChat: 'chats:delete',
  chatSend: 'chat:send',
  chatCancel: 'chat:cancel',
  chatEvent: 'chat:event',
} as const;
