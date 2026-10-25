// Gemeinsame Typen für die Brücke zwischen Main-Prozess und Oberfläche.
// Main (Node) und Renderer (React) importieren beide aus dieser Datei,
// damit sich beide Seiten auf dieselben Datenformen verlassen können.

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  node: string;
  chrome: string;
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

/** Alles, was die Oberfläche über `window.api` aufrufen darf. */
export interface LocalDeskApi {
  getAppInfo: () => Promise<AppInfo>;
  getOllamaStatus: () => Promise<ProviderStatus>;
  listModels: () => Promise<Result<ModelInfo[]>>;
  /** Startet eine Antwort; die Teile kommen über `onChatEvent` mit derselben requestId. */
  chatStart: (requestId: string, request: ChatRequest) => Promise<void>;
  chatCancel: (requestId: string) => Promise<void>;
  /** Meldet sich für Chat-Ereignisse an; gibt eine Funktion zum Abmelden zurück. */
  onChatEvent: (listener: (event: ChatStreamEvent) => void) => () => void;
}

/** Namen der IPC-Kanäle an einer Stelle, damit sich keine Tippfehler einschleichen. */
export const IpcChannels = {
  getAppInfo: 'app:get-info',
  getOllamaStatus: 'ollama:get-status',
  listModels: 'models:list',
  chatStart: 'chat:start',
  chatCancel: 'chat:cancel',
  chatEvent: 'chat:event',
} as const;
