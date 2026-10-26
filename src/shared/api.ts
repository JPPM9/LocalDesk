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

/** Ein gespeicherter Ollama-Server, z. B. „Dieser PC“ oder „Rechner im Wohnzimmer“. */
export interface ServerProfile {
  id: string;
  name: string;
  /** Vollständige Adresse, z. B. http://192.168.1.20:11434 */
  baseUrl: string;
  active: boolean;
}

export interface ServerProfileInput {
  id: string;
  name: string;
  /** Eingabe wie „192.168.1.20“ – wird zur vollständigen Adresse ergänzt. */
  address: string;
}

/** Ergebnis einer Verbindungsprüfung zu einem KI-Server (z. B. Ollama). */
export type ProviderStatus =
  | { online: true; baseUrl: string; version: string }
  | { online: false; baseUrl: string; error: string };

/** Ein Modell, das gerade im Speicher geladen ist (GPU und/oder CPU). */
export interface RunningModel {
  name: string;
  /** Gesamter Speicherbedarf inkl. Kontext, in Bytes. */
  sizeBytes: number;
  /** Davon im Grafikspeicher (VRAM); der Rest liegt im Arbeitsspeicher. */
  vramBytes: number;
  /** Kontextlänge, mit der das Modell geladen wurde. */
  contextLength?: number;
  parameterSize?: string;
  quantization?: string;
  /** Wann Ollama das Modell wieder entlädt (ISO-Datum), sofern nicht weiter benutzt. */
  expiresAt?: string;
}

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

/**
 * Denkmodus: true/false für Modelle wie qwen3 oder gemma4,
 * Stufen für Modelle wie gpt-oss (die „aus“ nicht kennen).
 */
export type ThinkSetting = boolean | 'low' | 'medium' | 'high';

/**
 * Einstellungen pro Chat. Fehlt ein Wert, gilt der Standard des Modells bzw. von Ollama.
 */
export interface ChatSettings {
  systemPrompt?: string;
  /** 0 = immer gleiche, vorhersehbare Antworten; höher = kreativer. */
  temperature?: number;
  /** Wie viele Tokens (Verlauf + Antwort) das Modell gleichzeitig „sieht“. */
  contextLength?: number;
  /** Gleicher Seed + gleiche Eingabe = gleiche Antwort (zum Vergleichen). */
  seed?: number;
  think?: ThinkSetting;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  options?: Pick<ChatSettings, 'temperature' | 'contextLength' | 'seed'>;
  think?: ThinkSetting;
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
  /** Ordner, in dem der Chat liegt; fehlt = „ohne Ordner“. */
  folderId?: string;
}

/** Ein Ordner für Chats (eine Ebene, keine Unterordner). */
export interface ChatFolder {
  id: string;
  name: string;
}

export interface ChatDetail extends ChatSummary {
  settings: ChatSettings;
  messages: MessageRecord[];
}

/** Ein Suchtreffer in einer Nachricht. */
export interface SearchHit {
  chatId: string;
  chatTitle: string;
  messageId: string;
  role: 'user' | 'assistant';
  /**
   * Textausschnitt um den Treffer. Gefundene Wörter stehen zwischen den Zeichen
   * HIGHLIGHT_START und HIGHLIGHT_END (siehe shared/search.ts) – bewusst kein HTML.
   */
  snippet: string;
}

export interface SearchResult {
  /** Chats, deren Titel alle Suchwörter enthält. */
  chats: ChatSummary[];
  /** Treffer in Nachrichten, die besten zuerst. */
  hits: SearchHit[];
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
  /** Nur für neue Chats: Einstellungen, die vor der ersten Nachricht gewählt wurden. */
  settings?: ChatSettings;
}

/**
 * Vorlage für neue Chats. Beim Auswählen werden Modell und Einstellungen in den
 * Chat kopiert – spätere Änderungen an der Vorlage ändern bestehende Chats nicht.
 */
export interface ChatTemplate {
  id: string;
  name: string;
  /** Fehlt es, bleibt beim Auswählen das gerade gewählte Modell. */
  model?: string;
  settings: ChatSettings;
  updatedAt: number;
}

export type TemplateInput = Omit<ChatTemplate, 'updatedAt'>;

/** Alles, was die Oberfläche über `window.api` aufrufen darf. */
export interface LocalDeskApi {
  getAppInfo: () => Promise<AppInfo>;
  getOllamaStatus: () => Promise<ProviderStatus>;
  listModels: () => Promise<Result<ModelInfo[]>>;
  listRunningModels: () => Promise<Result<RunningModel[]>>;

  listChats: () => Promise<ChatSummary[]>;
  getChat: (chatId: string) => Promise<ChatDetail | null>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatSettings: (chatId: string, settings: ChatSettings) => Promise<void>;
  searchChats: (query: string) => Promise<SearchResult>;

  listFolders: () => Promise<ChatFolder[]>;
  createFolder: (name: string) => Promise<Result<ChatFolder>>;
  renameFolder: (folderId: string, name: string) => Promise<Result<ChatFolder>>;
  /** Löscht nur den Ordner – seine Chats bleiben und sind danach „ohne Ordner“. */
  deleteFolder: (folderId: string) => Promise<void>;
  /** `folderId` null = aus dem Ordner herausnehmen. */
  moveChat: (chatId: string, folderId: string | null) => Promise<void>;

  listServers: () => Promise<ServerProfile[]>;
  /** Legt an oder ändert (gleiche id); die Adresse wird geprüft und ergänzt. */
  saveServer: (input: ServerProfileInput) => Promise<Result<ServerProfile>>;
  deleteServer: (profileId: string) => Promise<Result<void>>;
  setActiveServer: (profileId: string) => Promise<Result<ServerProfile>>;
  /** Prüft eine Adresse, ohne sie zu speichern. */
  testServer: (address: string) => Promise<ProviderStatus>;

  listTemplates: () => Promise<ChatTemplate[]>;
  /** Legt an oder überschreibt (gleiche id). Gibt die gespeicherte Fassung zurück. */
  saveTemplate: (template: TemplateInput) => Promise<Result<ChatTemplate>>;
  deleteTemplate: (templateId: string) => Promise<void>;

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
  listRunningModels: 'models:list-running',
  listChats: 'chats:list',
  getChat: 'chats:get',
  renameChat: 'chats:rename',
  deleteChat: 'chats:delete',
  updateChatSettings: 'chats:update-settings',
  searchChats: 'chats:search',
  listFolders: 'folders:list',
  createFolder: 'folders:create',
  renameFolder: 'folders:rename',
  deleteFolder: 'folders:delete',
  moveChat: 'chats:move',
  listServers: 'servers:list',
  saveServer: 'servers:save',
  deleteServer: 'servers:delete',
  setActiveServer: 'servers:set-active',
  testServer: 'servers:test',
  listTemplates: 'templates:list',
  saveTemplate: 'templates:save',
  deleteTemplate: 'templates:delete',
  chatSend: 'chat:send',
  chatCancel: 'chat:cancel',
  chatEvent: 'chat:event',
} as const;
