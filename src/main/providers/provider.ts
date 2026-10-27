import type {
  ChatChunk,
  ChatRequest,
  ModelInfo,
  ProviderStatus,
  PullChunk,
  Result,
  RunningModel,
} from '../../shared/api';

/**
 * Gemeinsame Schnittstelle für alle KI-Server.
 * Heute gibt es nur Ollama; ein OpenAI-kompatibler Server (LM Studio, llama.cpp)
 * wird später eine weitere Klasse, die dieselben Methoden anbietet.
 */
export interface Provider {
  /** Adresse des Servers, z. B. http://localhost:11434 */
  readonly baseUrl: string;
  checkStatus(): Promise<ProviderStatus>;
  listModels(): Promise<Result<ModelInfo[]>>;
  /** Modelle, die gerade im Speicher geladen sind. */
  listRunning(): Promise<Result<RunningModel[]>>;
  /**
   * Lädt ein Modell herunter und meldet den Fortschritt Stück für Stück.
   * Wirft einen Fehler mit lesbarer Meldung; `signal` bricht ab.
   */
  pull(model: string, signal: AbortSignal): AsyncGenerator<PullChunk>;
  /** Löscht ein installiertes Modell vom Server (endgültig). */
  deleteModel(model: string): Promise<Result<void>>;
  /**
   * Liefert die Antwort Stück für Stück. Wirft einen Fehler mit lesbarer Meldung,
   * wenn etwas schiefgeht; `signal` bricht die Antwort ab.
   */
  chat(request: ChatRequest, signal: AbortSignal): AsyncGenerator<ChatChunk>;
  /**
   * Berechnet für jeden Text einen Vektor („Bedeutungs-Fingerabdruck“) mit einem
   * Embedding-Modell. Reihenfolge der Ergebnisse = Reihenfolge der Texte.
   */
  embed(
    model: string,
    inputs: string[],
    signal?: AbortSignal,
  ): Promise<Result<number[][]>>;
  /** Technische Angaben zum Modell (Schichten, KV-Köpfe …) für die Speicher-Schätzung. */
  modelInfo(model: string): Promise<Result<Record<string, unknown>>>;
}
