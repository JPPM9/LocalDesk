import type {
  ChatChunk,
  ChatMessage,
  ChatRequest,
  ModelToolCall,
  ChatStats,
  ModelInfo,
  ProviderStatus,
  PullChunk,
  Result,
  RunningModel,
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

/** So liefert Ollama ein geladenes Modell in `GET /api/ps`. */
interface OllamaRunning {
  name?: unknown;
  size?: unknown;
  size_vram?: unknown;
  context_length?: unknown;
  expires_at?: unknown;
  details?: { parameter_size?: unknown; quantization_level?: unknown };
}

/** Eine Zeile aus dem Stream von `POST /api/chat`. */
interface OllamaChatLine {
  message?: { content?: unknown; thinking?: unknown; tool_calls?: unknown };
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
    const result = await this.fetchModelList('/api/tags');
    if (!result.ok) return result;
    const models = result.value
      .map((tag) => toModelInfo(tag as OllamaTag))
      .filter((model): model is ModelInfo => model !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, value: models };
  }

  async listRunning(): Promise<Result<RunningModel[]>> {
    const result = await this.fetchModelList('/api/ps');
    if (!result.ok) return result;
    const models = result.value
      .map((entry) => toRunningModel(entry as OllamaRunning))
      .filter((model): model is RunningModel => model !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, value: models };
  }

  /** Holt `{ models: [...] }` von Ollama – gemeinsamer Teil von /api/tags und /api/ps. */
  private async fetchModelList(path: string): Promise<Result<unknown[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
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
      return { ok: true, value: body.models };
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
        body: JSON.stringify(toOllamaChatBody(request)),
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
      // Ollama schickt Tool-Aufrufe fertig in einer Zeile, nicht Stück für Stück.
      const calls = toToolCalls(line.message?.tool_calls);
      if (calls.length > 0) {
        yield { type: 'tool-calls', calls };
      }
      if (line.done === true) {
        yield { type: 'done', stats: toChatStats(line) };
        return;
      }
    }
  }

  async *pull(model: string, signal: AbortSignal): AsyncGenerator<PullChunk> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: true }),
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
      const line = raw as Record<string, unknown>;
      if (typeof line.error === 'string') throw new Error(line.error);
      if (typeof line.status !== 'string') continue;
      yield {
        status: line.status,
        ...(typeof line.digest === 'string' && { digest: line.digest }),
        ...(typeof line.total === 'number' && { total: line.total }),
        ...(typeof line.completed === 'number' && {
          completed: line.completed,
        }),
      };
    }
  }

  async deleteModel(model: string): Promise<Result<void>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
        signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
      });
      if (!response.ok) {
        return { ok: false, error: await readErrorMessage(response) };
      }
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }
  }

  private offline(error: string): ProviderStatus {
    return { online: false, baseUrl: this.baseUrl, error };
  }
}

/**
 * Übersetzt unsere Anfrage in Ollamas Format. Nur gesetzte Werte werden
 * mitgeschickt – fehlt einer, nimmt Ollama seinen Standard (z. B. 4096 Tokens Kontext).
 */
export function toOllamaChatBody(request: ChatRequest) {
  const options: Record<string, number> = {};
  if (request.options?.temperature !== undefined) {
    options.temperature = request.options.temperature;
  }
  if (request.options?.contextLength !== undefined) {
    options.num_ctx = request.options.contextLength;
  }
  if (request.options?.seed !== undefined) {
    options.seed = request.options.seed;
  }
  return {
    model: request.model,
    messages: request.messages.map(toOllamaMessage),
    stream: true,
    ...(request.tools?.length && {
      tools: request.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
    }),
    ...(Object.keys(options).length > 0 && { options }),
    ...(request.think !== undefined && { think: request.think }),
  };
}

/** Ollama nennt die Felder tool_calls und tool_name. */
function toOllamaMessage(message: ChatMessage) {
  return {
    role: message.role,
    content: message.content,
    ...(message.toolCalls?.length && {
      tool_calls: message.toolCalls.map((call) => ({
        function: { name: call.name, arguments: call.arguments },
      })),
    }),
    ...(message.toolName !== undefined && { tool_name: message.toolName }),
  };
}

/**
 * Liest Tool-Aufrufe aus Ollamas Antwort. Die Argumente kommen als Objekt;
 * manche Modelle liefern sie als JSON-Text – den versuchen wir zu lesen.
 */
function toToolCalls(raw: unknown): ModelToolCall[] {
  if (!Array.isArray(raw)) return [];
  const calls: ModelToolCall[] = [];
  for (const entry of raw) {
    const fn = (entry as { function?: { name?: unknown; arguments?: unknown } })
      ?.function;
    if (typeof fn?.name !== 'string' || fn.name === '') continue;
    calls.push({ name: fn.name, arguments: toArguments(fn.arguments) });
  }
  return calls;
}

function toArguments(raw: unknown): Record<string, unknown> {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
function toRunningModel(entry: OllamaRunning): RunningModel | null {
  if (typeof entry.name !== 'string') return null;
  const size = typeof entry.size === 'number' ? entry.size : 0;
  const vram = typeof entry.size_vram === 'number' ? entry.size_vram : 0;
  return {
    name: entry.name,
    sizeBytes: size,
    // Mehr VRAM als Gesamtgröße ergibt keinen Sinn – sicherheitshalber begrenzen.
    vramBytes: Math.min(vram, size),
    contextLength:
      typeof entry.context_length === 'number'
        ? entry.context_length
        : undefined,
    parameterSize: asString(entry.details?.parameter_size),
    quantization: asString(entry.details?.quantization_level),
    expiresAt: asString(entry.expires_at),
  };
}

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
