import type {
  ChatChunk,
  ChatRequest,
  ChatStats,
  ModelInfo,
  ProviderStatus,
  Result,
} from '../../shared/api';
import { readNdjson } from './ndjson';
import type { Provider } from './provider';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/** Wie lange wir auf eine Antwort warten, bevor Ollama als „offline“ gilt. */
const STATUS_TIMEOUT_MS = 2000;
const LIST_TIMEOUT_MS = 5000;

/** So liefert Ollama ein Modell in `GET /api/tags` (nur die Felder, die wir nutzen). */
interface OllamaTag {
  name?: unknown;
  size?: unknown;
  modified_at?: unknown;
  details?: {
    family?: unknown;
    parameter_size?: unknown;
    quantization_level?: unknown;
    context_length?: unknown;
  };
  capabilities?: unknown;
}

/** Eine Zeile aus dem Stream von `POST /api/chat`. */
interface OllamaChatLine {
  message?: { content?: unknown; thinking?: unknown };
  done?: unknown;
  error?: unknown;
  eval_count?: unknown;
  eval_duration?: unknown;
  prompt_eval_count?: unknown;
  total_duration?: unknown;
}

interface OllamaOptions {
  baseUrl?: string;
  // Austauschbar, damit Tests eine nachgebaute Antwort liefern können,
  // ohne dass ein echter Ollama-Server laufen muss.
  fetch?: typeof fetch;
}

export class OllamaProvider implements Provider {
  readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: OllamaOptions = {}) {
    // Abschließende Schrägstriche entfernen, damit `${baseUrl}/api/...` immer stimmt.
    this.baseUrl = (options.baseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
    this.fetchFn = options.fetch ?? fetch;
  }

  async checkStatus(): Promise<ProviderStatus> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      if (!response.ok) {
        return this.offline(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { version?: unknown };
      if (typeof body.version !== 'string') {
        return this.offline('Unerwartete Antwort – ist das wirklich Ollama?');
      }
      return { online: true, baseUrl: this.baseUrl, version: body.version };
    } catch (error) {
      return this.offline(describeError(error));
    }
  }

  async listModels(): Promise<Result<ModelInfo[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      const body = (await response.json()) as { models?: unknown };
      if (!Array.isArray(body.models)) {
        return {
          ok: false,
          error: 'Unerwartete Antwort – ist das wirklich Ollama?',
        };
      }
      const models = body.models
        .map((tag) => toModelInfo(tag as OllamaTag))
        .filter((model): model is ModelInfo => model !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { ok: true, value: models };
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }
  }

  async *chat(
    request: ChatRequest,
    signal: AbortSignal,
  ): AsyncGenerator<ChatChunk> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: true,
        }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error; // Abbruch durch den Nutzer – kein Fehler
      throw new Error(describeError(error));
    }

    if (!response.ok || !response.body) {
      throw new Error(await readErrorMessage(response));
    }

    for await (const raw of readNdjson(response.body)) {
      const line = raw as OllamaChatLine;
      if (typeof line.error === 'string') {
        throw new Error(line.error);
      }
      const thinking = line.message?.thinking;
      if (typeof thinking === 'string' && thinking !== '') {
        yield { type: 'thinking', text: thinking };
      }
      const content = line.message?.content;
      if (typeof content === 'string' && content !== '') {
        yield { type: 'content', text: content };
      }
      if (line.done === true) {
        yield { type: 'done', stats: toChatStats(line) };
        return;
      }
    }
  }

  private offline(error: string): ProviderStatus {
    return { online: false, baseUrl: this.baseUrl, error };
  }
}

/** Ollama schickt Fehler als `{"error": "..."}` – sonst nehmen wir den HTTP-Status. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Antwort war kein JSON
  }
  return `HTTP ${response.status}`;
}

/** Ollama misst Zeiten in Nanosekunden. */
function toChatStats(line: OllamaChatLine): ChatStats | undefined {
  const evalCount = line.eval_count;
  const evalNs = line.eval_duration;
  if (
    typeof evalCount !== 'number' ||
    typeof evalNs !== 'number' ||
    evalNs <= 0
  ) {
    return undefined;
  }
  return {
    outputTokens: evalCount,
    tokensPerSecond: evalCount / (evalNs / 1e9),
    promptTokens:
      typeof line.prompt_eval_count === 'number' ? line.prompt_eval_count : 0,
    totalMs:
      typeof line.total_duration === 'number' ? line.total_duration / 1e6 : 0,
  };
}

/**
 * Wandelt Ollamas Format in unser eigenes um. Felder, die fehlen oder einen
 * unerwarteten Typ haben, lassen wir weg, statt abzustürzen – ältere oder neuere
 * Ollama-Versionen liefern nicht immer dieselben Felder.
 */
function toModelInfo(tag: OllamaTag): ModelInfo | null {
  if (typeof tag.name !== 'string') return null;
  const details = tag.details ?? {};
  return {
    name: tag.name,
    sizeBytes: typeof tag.size === 'number' ? tag.size : 0,
    modifiedAt: typeof tag.modified_at === 'string' ? tag.modified_at : '',
    family: asString(details.family),
    parameterSize: asString(details.parameter_size),
    quantization: asString(details.quantization_level),
    contextLength:
      typeof details.context_length === 'number'
        ? details.context_length
        : undefined,
    capabilities: Array.isArray(tag.capabilities)
      ? tag.capabilities.filter((c): c is string => typeof c === 'string')
      : [],
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Übersetzt technische Fehler in einen kurzen, verständlichen Satz. */
function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'Keine Antwort (Zeitüberschreitung)';
  }
  if (error instanceof Error) {
    const code = (error.cause as { code?: string } | undefined)?.code;
    if (code === 'ECONNREFUSED') return 'Nicht erreichbar – läuft Ollama?';
    if (code === 'ENOTFOUND') return 'Server-Adresse nicht gefunden';
    return error.message;
  }
  return String(error);
}
