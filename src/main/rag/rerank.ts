import type { ChatRequest, SourceRef } from '../../shared/api';
import {
  applyRanking,
  parseRanking,
  passageCharsFor,
  rerankMessages,
  rerankSchema,
  RERANK_TIMEOUT_MS,
} from '../../shared/rerank';
import { thinkStyle } from '../../shared/settings';
import type { Provider } from '../providers/provider';

export interface RerankOptions {
  /** Das Modell des Chats – es sortiert, wie es auch antwortet. */
  model: string;
  /** Kontextlänge des Chats: gleich wie bei der Antwort, damit das Modell nicht neu geladen wird. */
  contextLength: number;
  /** Stopp der Antwort bricht auch das Sortieren ab. */
  signal: AbortSignal;
  timeoutMs?: number;
}

/**
 * Lässt das Modell die Kandidaten der Wissens-Suche nach Nutzen für die Frage ordnen
 * (ein Aufruf, Denken aus, Antwort nur als Zahlenliste). Gibt die neue Reihenfolge
 * zurück – oder null bei jedem Problem (Fehler, Zeitüberschreitung, unlesbare Antwort):
 * Dann gilt die alte Reihenfolge, die Antwort wird nie blockiert.
 */
export async function rerankSources(
  provider: Provider,
  question: string,
  sources: SourceRef[],
  options: RerankOptions,
): Promise<SourceRef[] | null> {
  if (sources.length < 2) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, options.timeoutMs ?? RERANK_TIMEOUT_MS);
  try {
    const models = await provider.listModels();
    const info = models.ok
      ? models.value.find((m) => m.name === options.model)
      : undefined;
    // Denken kostet nur Zeit – fürs Sortieren aus (bzw. niedrig bei gpt-oss).
    const style = thinkStyle(info);
    const request: ChatRequest = {
      model: options.model,
      messages: rerankMessages(
        question,
        sources,
        passageCharsFor(options.contextLength),
      ),
      format: rerankSchema(),
      ...(style === 'toggle' && { think: false }),
      ...(style === 'levels' && { think: 'low' }),
      options: { contextLength: options.contextLength, temperature: 0 },
    };
    let answer = '';
    for await (const chunk of provider.chat(request, controller.signal)) {
      if (chunk.type === 'content') answer += chunk.text;
    }
    const order = parseRanking(answer, sources.length);
    return order ? applyRanking(sources, order) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', abort);
  }
}
