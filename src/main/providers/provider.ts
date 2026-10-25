import type { ProviderStatus } from '../../shared/api';

/**
 * Gemeinsame Schnittstelle für alle KI-Server.
 * Heute gibt es nur Ollama; ein OpenAI-kompatibler Server (LM Studio, llama.cpp)
 * wird später eine weitere Klasse, die dieselben Methoden anbietet.
 * Die Schnittstelle wächst Schritt für Schritt (Modellliste, Chat …).
 */
export interface Provider {
  checkStatus(): Promise<ProviderStatus>;
}
