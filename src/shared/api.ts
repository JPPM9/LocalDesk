// Gemeinsame Typen für die Brücke zwischen Main-Prozess und Oberfläche.
// Main (Node) und Renderer (React) importieren beide aus dieser Datei,
// damit sich beide Seiten auf dieselben Datenformen verlassen können.

import type { ThemeChoice } from './appearance';
import type {
  GoogleAppInput,
  MailAccountView,
  MailAppView,
  MailChange,
  MailLabel,
  MailListQuery,
  MailMessage,
  MailPage,
} from './mail';
import type { MailSuggestion } from './mail-sorting';
import type { SkillInput, SkillView } from './skills';
import type { UpdateState } from './update';

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

/** Ein eingerichteter MCP-Server. Bisher gibt es nur die Art „filesystem“. */
export interface McpServerConfig {
  id: string;
  name: string;
  kind: 'filesystem';
  /** Ordner, auf die der Dateisystem-Server zugreifen darf – nur diese. */
  folders: string[];
  enabled: boolean;
}

export type McpServerInput = Omit<McpServerConfig, 'enabled'>;

/** Ein Werkzeug, das ein MCP-Server anbietet. */
export interface McpToolInfo {
  name: string;
  description: string;
  /** Laut Server nur lesend (ändert nichts) – Grundlage für die Standard-Freigabe. */
  readOnly: boolean;
  /** Laut Server kann es Daten überschreiben oder löschen. */
  destructive: boolean;
  /** Beschreibung der Eingaben als JSON-Schema (für das Modell). */
  inputSchema: Record<string, unknown>;
}

export type McpServerState = 'stopped' | 'starting' | 'running' | 'error';

/** Laufzeit-Zustand eines MCP-Servers. */
export interface McpServerStatus {
  id: string;
  state: McpServerState;
  error?: string;
  /** Letzte Meldungen des Servers (stderr) – hilft bei Fehlern. */
  log: string[];
  tools: McpToolInfo[];
}

/**
 * Was passiert, wenn ein Modell ein Tool benutzen will:
 * - always: läuft sofort
 * - ask: LocalDesk fragt dich vorher im Chat
 * - off: das Modell bekommt das Tool gar nicht erst angeboten
 */
export type ToolPermission = 'always' | 'ask' | 'off';

/** Ein MCP-Server mit seinen Einstellungen und seinem aktuellen Zustand. */
export interface McpServerView {
  config: McpServerConfig;
  status: McpServerStatus;
  /** Nur von dir geänderte Freigaben (Tool-Name → Freigabe); sonst gilt der Standard. */
  permissions: Record<string, ToolPermission>;
}

/**
 * Eingerichteter Obsidian-Vault. Gelesen werden darf der ganze Vault, geschrieben
 * nur in den eigenen Unterordner `folder`.
 */
export interface ObsidianStatus {
  vaultPath: string;
  folder: string;
  /** Ordner gefunden und nutzbar. */
  ok: boolean;
  /** Enthält einen `.obsidian`-Ordner – ist also wirklich ein Obsidian-Vault. */
  looksLikeVault: boolean;
  error?: string;
}

/** Ein gemerkter Fakt über dich – eine Notiz im eigenen Unterordner des Vaults. */
export interface MemoryView {
  /** Pfad der Notiz relativ zum LocalDesk-Unterordner. */
  id: string;
  text: string;
  /** Datum (JJJJ-MM-TT), falls in der Notiz vermerkt. */
  created?: string;
  /** Gehört zu diesem Projekt; fehlt = gilt in allen Chats. */
  projectId?: string;
  projectName?: string;
}

/** Woher eine Sammlung ihre Dateien bekommt. Die Dateien bleiben, wo sie sind. */
export interface KnowledgeSource {
  kind: 'folder' | 'file';
  path: string;
}

/** Eine Wissenssammlung, z. B. „Studium“ oder „Verträge“. */
export interface CollectionConfig {
  id: string;
  name: string;
  sources: KnowledgeSource[];
  /** Mit diesem Modell wurden die Fingerabdrücke berechnet – Suche muss dasselbe nutzen. */
  embeddingModel: string;
  /** Gehört zu diesem Projekt (Projekt-Dokumente) – erscheint nicht auf der Seite „Wissen“. */
  projectId?: string;
  /**
   * „obsidian“: der eingerichtete Vault. LocalDesk legt sie an und pflegt die Quelle
   * (Einstellungen → Obsidian); Notizen werden für Obsidian aufbereitet.
   */
  kind?: 'obsidian';
}

export type CollectionInput = Pick<CollectionConfig, 'id' | 'name' | 'sources'>;

/**
 * Stand einer Datei in der Sammlung:
 * - ok: eingelesen
 * - empty: kein Text gefunden
 * - skipped: übersprungen (zu groß, keine Textdatei …), Grund in `error`
 * - error: Lesen oder Einbetten fehlgeschlagen
 */
export type DocumentStatus = 'ok' | 'empty' | 'skipped' | 'error';

export interface KnowledgeDocument {
  id: string;
  path: string;
  sizeBytes: number;
  status: DocumentStatus;
  error?: string;
  chunkCount: number;
  indexedAt: number;
}

export interface CollectionStats {
  documents: number;
  chunks: number;
  /** Dateien mit Status error oder skipped. */
  problems: number;
  /** Letztes Einlesen (ms seit 1970); fehlt = noch nie. */
  indexedAt?: number;
}

export type IndexPhase = 'scanning' | 'indexing' | 'done' | 'error' | 'aborted';

/** Fortschritt beim Einlesen einer Sammlung. */
export interface IndexProgress {
  collectionId: string;
  phase: IndexPhase;
  /** Dateien, die (neu) eingelesen werden müssen, und wie viele davon fertig sind. */
  total: number;
  done: number;
  /** Datei, die gerade dran ist. */
  current?: string;
  /** Ergebnis am Ende. */
  added?: number;
  updated?: number;
  removed?: number;
  unchanged?: number;
  error?: string;
}

export interface CollectionView {
  config: CollectionConfig;
  stats: CollectionStats;
  /** Läuft gerade oder lief zuletzt (bis die App neu startet). */
  progress?: IndexProgress;
}

/** Messwerte einer NVIDIA-Grafikkarte (aus nvidia-smi). Fehlt ein Wert, meldet die Karte ihn nicht. */
export interface GpuInfo {
  index: number;
  name: string;
  /** Wie stark die Recheneinheiten gerade arbeiten, 0–100. */
  utilizationPercent?: number;
  memoryUsedBytes?: number;
  memoryTotalBytes?: number;
  temperatureC?: number;
  powerWatts?: number;
  powerLimitWatts?: number;
}

/**
 * GPU-Messung ist nur möglich, wenn Ollama auf diesem PC läuft und eine
 * NVIDIA-Karte mit nvidia-smi vorhanden ist.
 */
export type GpuStatus =
  | { available: true; gpus: GpuInfo[] }
  | {
      available: false;
      reason: 'remote' | 'no-nvidia' | 'error';
      error?: string;
    };

/** Eine Fortschrittsmeldung von Ollama beim Herunterladen (eine Zeile aus /api/pull). */
export interface PullChunk {
  status: string;
  /** Kennung der Schicht (Gewichte, Vorlage, Lizenz …), falls es um eine geht. */
  digest?: string;
  total?: number;
  completed?: number;
}

export type DownloadPhase =
  | 'starting'
  | 'downloading'
  | 'verifying'
  | 'done'
  | 'error'
  | 'aborted';

/** Stand eines Downloads, wie ihn die Oberfläche anzeigt. */
export interface DownloadState {
  model: string;
  phase: DownloadPhase;
  /** Bytes je Schicht – Ollama meldet die Schichten durcheinander. */
  layers: Record<string, { total: number; completed: number }>;
  completedBytes: number;
  totalBytes: number;
  error?: string;
  startedAt: number;
}

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
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Nur bei `assistant`: Tools, die das Modell aufrufen wollte. */
  toolCalls?: ModelToolCall[];
  /** Nur bei `tool`: zu welchem Tool dieses Ergebnis gehört. */
  toolName?: string;
}

/** Ein Tool-Aufruf, wie das Modell ihn formuliert. */
export interface ModelToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** Ein Tool, wie das Modell es angeboten bekommt. */
export interface ToolDefinition {
  name: string;
  description: string;
  /** Eingaben als JSON-Schema. */
  parameters: Record<string, unknown>;
}

/**
 * Stand eines Tool-Aufrufs:
 * - asking: wartet auf deine Freigabe
 * - running: läuft gerade
 * - done / error: fertig (Fehler gehen als Ergebnis ans Modell zurück)
 * - denied: von dir abgelehnt
 * - cancelled: Antwort wurde gestoppt, bevor der Aufruf fertig war
 */
export type ToolCallStatus =
  | 'asking'
  | 'running'
  | 'done'
  | 'error'
  | 'denied'
  | 'cancelled';

/** Ein Tool-Aufruf während einer Antwort – so wird er gespeichert und angezeigt. */
export interface ToolCallRecord {
  id: string;
  /** Runde der Antwort (1 = erste Anfrage ans Modell). */
  round: number;
  /** Name, unter dem das Modell das Tool kennt. */
  name: string;
  /** Name beim MCP-Server (meist gleich, bei Namensgleichheit verschieden). */
  toolName: string;
  serverId: string;
  serverName: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  /** Laut Server kann das Tool Daten überschreiben oder löschen. */
  destructive?: boolean;
  /** Was das Modell als Ergebnis bekommen hat (auch bei Fehler oder Ablehnung). */
  result?: string;
}

/** Deine Antwort auf eine Rückfrage. */
export type ToolDecision = 'once' | 'always' | 'deny';

/**
 * Antwort auf eine Rückfrage – bei bearbeitbaren Werkzeugen (Erinnerung speichern)
 * mit deinen geänderten Eingaben.
 */
export interface ToolAnswer {
  decision: ToolDecision;
  arguments?: Record<string, unknown>;
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
  /**
   * IDs der MCP-Server, deren Tools dieser Chat nutzen darf (MCP-Button).
   * Fehlt die Liste, nutzt der Chat keine Tools.
   */
  mcpServers?: string[];
  /**
   * IDs der Wissenssammlungen, die vor jeder Antwort durchsucht werden (Wissen-Knopf).
   * Fehlt die Liste, nutzt der Chat kein Wissen.
   */
  collections?: string[];
  /** Kennungen der Skills, die in diesem Chat gelten (Schalter „Skills“). */
  skills?: string[];
}

/** Eine Textstelle aus einer Sammlung, die das Modell für eine Antwort bekommen hat. */
export interface SourceRef {
  /** Nummer, mit der das Modell zitiert: [1], [2] … */
  n: number;
  collectionId: string;
  collectionName: string;
  documentId: string;
  path: string;
  /** Seite bei PDFs. */
  page?: number;
  heading?: string;
  text: string;
  /** Ähnlichkeit 0–1 (Fingerabdruck-Suche). */
  score: number;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  options?: Pick<ChatSettings, 'temperature' | 'contextLength' | 'seed'>;
  think?: ThinkSetting;
  /** Tools, die das Modell benutzen darf; fehlt = keine. */
  tools?: ToolDefinition[];
  /** JSON-Schema: Die Antwort muss genau so aufgebaut sein (Ollama „structured outputs“). */
  format?: Record<string, unknown>;
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
  | { type: 'tool-calls'; calls: ModelToolCall[] }
  | { type: 'done'; stats?: ChatStats };

/** Was der Main-Prozess während einer Antwort an die Oberfläche schickt. */
export type ChatStreamEvent = { requestId: string } & (
  | Exclude<ChatChunk, { type: 'tool-calls' }>
  /** Neuer oder geänderter Tool-Aufruf (gleiche id = ersetzen). */
  | { type: 'tool-call'; call: ToolCallRecord }
  /** Ergebnis der Wissenssuche vor der Antwort (leer = nichts Passendes gefunden). */
  | { type: 'sources'; sources: SourceRef[]; error?: string }
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
  /** Tool-Aufrufe während dieser Antwort, in Reihenfolge. */
  toolCalls?: ToolCallRecord[];
  /** Textstellen aus dem Wissen, die das Modell bekommen hat (fehlt = keine Suche). */
  sources?: SourceRef[];
  /** Die Wissenssuche ging schief (z. B. Embedding-Modell fehlt) – Antwort kam ohne Wissen. */
  knowledgeError?: string;
}

/** Entwurf einer Zusammenfassung – du bearbeitest ihn vor dem Speichern. */
export interface SummaryDraft {
  title: string;
  text: string;
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
/**
 * Ein Projekt (früher „Ordner“) für Chats, eine Ebene. Ohne Anweisungen und
 * Dokumente ist es einfach ein Ordner.
 */
export interface ChatFolder {
  id: string;
  name: string;
  /** Gelten für jeden Chat im Projekt – vor dem eigenen Systemprompt des Chats. */
  instructions?: string;
  /** Sammlung mit den Projekt-Dokumenten (fehlt = noch keine angelegt). */
  collectionId?: string;
  /** Skills, die in jedem Chat des Projekts gelten (Kennungen). */
  skills?: string[];
}

export interface ChatDetail extends ChatSummary {
  settings: ChatSettings;
  messages: MessageRecord[];
  /** Zahl der Nachrichten, als zuletzt zusammengefasst oder abgelehnt wurde. */
  summaryAtCount?: number;
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
  /** Nur für neue Chats: gleich in diesem Projekt anlegen. */
  folderId?: string;
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
  /** Löscht ein Modell endgültig vom aktiven Server. */
  deleteModel: (model: string) => Promise<Result<void>>;
  getGpuStatus: () => Promise<GpuStatus>;
  /**
   * Grafikspeicher pro Token Kontext (KV-Cache, geschätzt); null = für dieses
   * Modell nicht vorhersagbar.
   */
  getKvBytesPerToken: (model: string) => Promise<number | null>;

  listMcpServers: () => Promise<McpServerView[]>;
  /** Legt an oder ändert; prüft, ob die Ordner existieren, und startet den Server neu. */
  saveMcpServer: (input: McpServerInput) => Promise<Result<McpServerConfig>>;
  setMcpServerEnabled: (serverId: string, enabled: boolean) => Promise<void>;
  restartMcpServer: (serverId: string) => Promise<void>;
  deleteMcpServer: (serverId: string) => Promise<void>;
  /** Freigabe für ein Tool setzen; `null` = zurück auf Standard. */
  setToolPermission: (
    serverId: string,
    toolName: string,
    permission: ToolPermission | null,
  ) => Promise<void>;
  /** Öffnet den Windows-Ordnerdialog; leer = abgebrochen. */
  pickFolders: () => Promise<string[]>;

  /** Eingetragene eigene Mail-Apps (ohne Schlüssel). */
  getMailApps: () => Promise<MailAppView[]>;
  /** Prüft und speichert die eigene Google-App (Client-ID + Clientschlüssel). */
  setGoogleApp: (app: GoogleAppInput) => Promise<Result<MailAppView>>;
  /** Vergisst die eigene Google-App (geht nur ohne angemeldete Konten). */
  clearGoogleApp: () => Promise<Result<null>>;
  /** Angemeldete Mail-Konten. */
  listMailAccounts: () => Promise<MailAccountView[]>;
  /** Öffnet Googles Anmeldeseite im Browser und wartet (max. 5 Minuten). */
  connectGoogle: () => Promise<Result<MailAccountView>>;
  /** Bricht eine laufende Anmeldung ab. */
  cancelMailConnect: () => Promise<void>;
  /** Abmelden: bei Google widerrufen und lokal löschen. */
  disconnectMailAccount: (id: string) => Promise<Result<{ revoked: boolean }>>;
  /** Mails eines Kontos (ohne Suche: Posteingang), frisch vom Anbieter. */
  listMail: (query: MailListQuery) => Promise<Result<MailPage>>;
  /** Eine Mail als Text. */
  getMail: (
    accountId: string,
    messageId: string,
  ) => Promise<Result<MailMessage>>;
  /** Labels des Kontos. */
  listMailLabels: (accountId: string) => Promise<Result<MailLabel[]>>;
  /** Fasst eine Mail mit dem gewählten (lokalen) Modell zusammen. */
  summarizeMail: (
    accountId: string,
    messageId: string,
    model: string,
  ) => Promise<Result<string>>;
  cancelMailSummary: () => Promise<void>;
  /** Das Modell schlägt Labels/Sterne vor – geändert wird dabei nichts. */
  suggestMailSorting: (
    accountId: string,
    messageIds: string[],
    model: string,
  ) => Promise<Result<MailSuggestion[]>>;
  cancelMailSorting: () => Promise<void>;
  /** Führt die von dir bestätigten Änderungen aus (nur Label hinzufügen, Stern). */
  applyMailChanges: (
    accountId: string,
    changes: MailChange[],
  ) => Promise<Result<{ applied: number; failed: string[] }>>;

  /** Eingerichteter Obsidian-Vault mit aktuellem Zustand; null = keiner eingerichtet. */
  getObsidian: () => Promise<ObsidianStatus | null>;
  /** Prüft und speichert Vault und Unterordner (nur wenn der Ordner nutzbar ist). */
  setObsidian: (vaultPath: string, folder: string) => Promise<ObsidianStatus>;
  /** Vergisst den Vault – im Vault selbst wird nichts gelöscht. */
  clearObsidian: () => Promise<void>;
  /** Alle Erinnerungen (global und aus Projekten), frisch aus dem Vault gelesen. */
  listMemories: () => Promise<Result<MemoryView[]>>;
  /** Neue Erinnerung; `projectId` null = gilt in allen Chats. */
  addMemory: (
    text: string,
    projectId: string | null,
  ) => Promise<Result<MemoryView>>;
  /** Löscht die Notiz einer Erinnerung im eigenen Unterordner. */
  deleteMemory: (id: string) => Promise<Result<void>>;
  /** Öffnet die Notiz im Standardprogramm (z. B. Obsidian). */
  openMemory: (id: string) => Promise<Result<void>>;
  /**
   * Speichert den Chat (oder mit `answerId` nur diese Antwort samt Frage) als Notiz
   * in `<Unterordner>/Chats/`. Liefert den Pfad der Notiz relativ zum Vault.
   */
  saveChatNote: (chatId: string, answerId?: string) => Promise<Result<string>>;
  /** Lässt das Modell den Chat zusammenfassen (Entwurf, noch nichts gespeichert). */
  summarizeChat: (
    chatId: string,
    model: string,
  ) => Promise<Result<SummaryDraft>>;
  cancelSummary: (chatId: string) => Promise<void>;
  /** Speichert den (bearbeiteten) Entwurf nach `<Unterordner>/Zusammenfassungen/`. */
  saveSummary: (
    chatId: string,
    model: string,
    draft: SummaryDraft,
  ) => Promise<Result<string>>;
  /** „Nein danke“ – der Vorschlag kommt erst nach 6 neuen Nachrichten wieder. */
  dismissSummary: (chatId: string) => Promise<void>;
  onMcpChanged: (listener: (servers: McpServerView[]) => void) => () => void;

  /** Skills (Anleitungen als SKILL.md im Skill-Ordner). */
  listSkills: () => Promise<Result<SkillView[]>>;
  saveSkill: (input: SkillInput) => Promise<Result<SkillView>>;
  deleteSkill: (id: string) => Promise<Result<void>>;
  /** Zeigt den Skill-Ordner (ohne id) oder den Ordner eines Skills im Explorer. */
  openSkillFolder: (id?: string) => Promise<Result<void>>;

  /** Farbschema (System / Hell / Dunkel) – wirkt sofort und bleibt gespeichert. */
  getTheme: () => Promise<ThemeChoice>;
  setTheme: (theme: ThemeChoice) => Promise<void>;

  /** Update-Knopf: Stand abfragen, suchen, laden, abbrechen, installieren (Neustart). */
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<UpdateState>;
  downloadUpdate: () => Promise<UpdateState>;
  cancelUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateChanged: (listener: (state: UpdateState) => void) => () => void;

  listCollections: () => Promise<CollectionView[]>;
  /** Legt an oder ändert; prüft, ob die Quellen existieren. */
  saveCollection: (input: CollectionInput) => Promise<Result<CollectionConfig>>;
  /** Löscht die Sammlung mit allen Abschnitten (die Dateien selbst bleiben). */
  deleteCollection: (collectionId: string) => Promise<void>;
  /** Liest neue und geänderte Dateien ein; der Fortschritt kommt über `onCollectionsChanged`. */
  indexCollection: (collectionId: string) => Promise<Result<void>>;
  cancelIndexing: (collectionId: string) => Promise<void>;
  listDocuments: (collectionId: string) => Promise<KnowledgeDocument[]>;
  /** Öffnet den Windows-Dateidialog; leer = abgebrochen. */
  pickFiles: () => Promise<string[]>;
  /**
   * Öffnet eine eingelesene Datei im Standardprogramm (nur Dokumente und Text) bzw.
   * zeigt sie im Explorer (alles andere, z. B. Skripte – die würden sonst ausgeführt).
   */
  openDocument: (documentId: string) => Promise<Result<void>>;
  onCollectionsChanged: (
    listener: (collections: CollectionView[]) => void,
  ) => () => void;

  /** Startet einen Download; der Fortschritt kommt über `onDownloadsChanged`. */
  startDownload: (model: string) => Promise<Result<void>>;
  cancelDownload: (model: string) => Promise<void>;
  /** Nimmt einen beendeten Download aus der Liste. */
  dismissDownload: (model: string) => Promise<void>;
  listDownloads: () => Promise<DownloadState[]>;
  onDownloadsChanged: (
    listener: (downloads: DownloadState[]) => void,
  ) => () => void;

  listChats: () => Promise<ChatSummary[]>;
  getChat: (chatId: string) => Promise<ChatDetail | null>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatSettings: (chatId: string, settings: ChatSettings) => Promise<void>;
  searchChats: (query: string) => Promise<SearchResult>;

  listFolders: () => Promise<ChatFolder[]>;
  createFolder: (name: string) => Promise<Result<ChatFolder>>;
  renameFolder: (folderId: string, name: string) => Promise<Result<ChatFolder>>;
  /**
   * Löscht das Projekt samt Anweisungen und eingelesenen Projekt-Dokumenten
   * (die Dateien selbst bleiben). Seine Chats bleiben und sind danach „ohne Projekt“.
   */
  deleteFolder: (folderId: string) => Promise<void>;
  setProjectInstructions: (
    folderId: string,
    instructions: string,
  ) => Promise<void>;
  /** Skills des Projekts setzen (gelten in allen seinen Chats). */
  setProjectSkills: (folderId: string, skillIds: string[]) => Promise<void>;
  /** Legt die Sammlung für die Projekt-Dokumente an (falls noch keine da ist). */
  ensureProjectCollection: (
    folderId: string,
  ) => Promise<Result<CollectionConfig>>;
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
  /**
   * Antwort auf eine Rückfrage zu einem Tool-Aufruf; `args` nur bei bearbeitbaren
   * Werkzeugen (Erinnerung speichern) – der Main-Prozess prüft sie.
   */
  chatToolDecision: (
    callId: string,
    decision: ToolDecision,
    args?: Record<string, unknown>,
  ) => Promise<void>;
  /** Meldet sich für Chat-Ereignisse an; gibt eine Funktion zum Abmelden zurück. */
  onChatEvent: (listener: (event: ChatStreamEvent) => void) => () => void;
}

/** Namen der IPC-Kanäle an einer Stelle, damit sich keine Tippfehler einschleichen. */
export const IpcChannels = {
  getAppInfo: 'app:get-info',
  getOllamaStatus: 'ollama:get-status',
  listModels: 'models:list',
  listRunningModels: 'models:list-running',
  deleteModel: 'models:delete',
  getGpuStatus: 'system:gpu-status',
  getKvBytesPerToken: 'models:kv-bytes',
  listMcpServers: 'mcp:list',
  saveMcpServer: 'mcp:save',
  setMcpServerEnabled: 'mcp:set-enabled',
  restartMcpServer: 'mcp:restart',
  deleteMcpServer: 'mcp:delete',
  setToolPermission: 'mcp:set-permission',
  pickFolders: 'dialog:pick-folders',
  getMailApps: 'mail:get-apps',
  setGoogleApp: 'mail:set-google-app',
  clearGoogleApp: 'mail:clear-google-app',
  listMailAccounts: 'mail:list-accounts',
  connectGoogle: 'mail:connect-google',
  cancelMailConnect: 'mail:cancel-connect',
  disconnectMailAccount: 'mail:disconnect',
  listMail: 'mail:list',
  getMail: 'mail:get',
  listMailLabels: 'mail:labels',
  summarizeMail: 'mail:summarize',
  cancelMailSummary: 'mail:cancel-summary',
  suggestMailSorting: 'mail:suggest-sorting',
  cancelMailSorting: 'mail:cancel-sorting',
  applyMailChanges: 'mail:apply-changes',
  getObsidian: 'obsidian:get',
  setObsidian: 'obsidian:set',
  clearObsidian: 'obsidian:clear',
  listMemories: 'memories:list',
  addMemory: 'memories:add',
  deleteMemory: 'memories:delete',
  openMemory: 'memories:open',
  saveChatNote: 'obsidian:save-chat',
  summarizeChat: 'summary:create',
  cancelSummary: 'summary:cancel',
  saveSummary: 'summary:save',
  dismissSummary: 'summary:dismiss',
  mcpChanged: 'mcp:changed',
  listSkills: 'skills:list',
  saveSkill: 'skills:save',
  deleteSkill: 'skills:delete',
  openSkillFolder: 'skills:open-folder',
  getTheme: 'appearance:get-theme',
  setTheme: 'appearance:set-theme',
  getUpdateState: 'update:state',
  checkForUpdates: 'update:check',
  downloadUpdate: 'update:download',
  cancelUpdate: 'update:cancel',
  installUpdate: 'update:install',
  updateChanged: 'update:changed',
  listCollections: 'knowledge:list',
  saveCollection: 'knowledge:save',
  deleteCollection: 'knowledge:delete',
  indexCollection: 'knowledge:index',
  cancelIndexing: 'knowledge:cancel',
  listDocuments: 'knowledge:documents',
  pickFiles: 'dialog:pick-files',
  openDocument: 'knowledge:open-document',
  collectionsChanged: 'knowledge:changed',
  startDownload: 'downloads:start',
  cancelDownload: 'downloads:cancel',
  dismissDownload: 'downloads:dismiss',
  listDownloads: 'downloads:list',
  downloadsChanged: 'downloads:changed',
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
  setProjectInstructions: 'projects:set-instructions',
  setProjectSkills: 'projects:set-skills',
  ensureProjectCollection: 'projects:ensure-collection',
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
  chatToolDecision: 'chat:tool-decision',
  chatEvent: 'chat:event',
} as const;
