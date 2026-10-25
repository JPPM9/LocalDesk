import type {
  ChatChunk,
  ChatRequest,
  ModelInfo,
  ProviderStatus,
  Result,
} from '../../shared/api';

/**
 * Gemeinsame Schnittstelle für alle KI-Server.
 * Heute gibt es nur Ollama; ein OpenAI-kompatibler Server (LM Studio, llama.cpp)
 * wird später eine weitere Klasse, die dieselben Methoden anbietet.
 */
export interface Provider {
  checkStatus(): Promise<ProviderStatus>;
  listModels(): Promise<Result<ModelInfo[]>>;
  /**
   * Liefert die Antwort Stück für Stück. Wirft einen Fehler mit lesbarer Meldung,
   * wenn etwas schiefgeht; `signal` bricht die Antwort ab.
   */
  chat(request: ChatRequest, signal: AbortSignal): AsyncGenerator<ChatChunk>;
}
