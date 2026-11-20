import type {
  ChatChunk,
  ChatMessage,
  ChatRequest,
  ChatStats,
  ModelInfo,
  ModelToolCall,
  ProviderStatus,
  PullChunk,
  Result,
  RunningModel,
} from '../../shared/api';
import type { Provider } from './provider';
import { tr } from '../../shared/messages';

const STATUS_TIMEOUT_MS = 4000;
const LIST_TIMEOUT_MS = 8000;
const EMBED_TIMEOUT_MS = 120_000;

interface OpenAiOptions {
  /** Adresse mit Pfad, z. B. http://localhost:1234/v1 */
  baseUrl: string;
  /** Liefert den API-Schlüssel (entschlüsselt) oder null; wird bei jeder Anfrage gefragt. */
  apiKey?: () => Promise<string | null>;
  fetch?: typeof fetch;
}

/**
 * Jeder Server, der die OpenAI-Schnittstelle spricht (LM Studio, llama.cpp-Server,
 * vLLM, Cloud-Anbieter). Kann Modelle auflisten und chatten, aber nicht herunterladen
 * oder löschen – das passiert dort, wo der Server läuft.
 */
export class OpenAiCompatProvider implements Provider {
  readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly apiKey: () => Promise<string | null>;

  constructor(options: OpenAiOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetch ?? fetch;
    this.apiKey = options.apiKey ?? (async () => null);
  }

  private async headers(json = false): Promise<Record<string, string>> {
    const key = await this.apiKey();
    return {
      ...(json && { 'Content-Type': 'application/json' }),
      ...(key && { Authorization: `Bearer ${key}` }),
    };
  }

  async checkStatus(): Promise<ProviderStatus> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/models`, {
        headers: await this.headers(),
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      if (response.status === 401 || response.status === 403)
        return this.offline(tr('openai.keyRejected'));
      if (!response.ok) return this.offline(`HTTP ${response.status}`);
      const body = (await response.json()) as { data?: unknown };
      if (!Array.isArray(body.data))
        return this.offline(tr('openai.unexpected'));
      return { online: true, baseUrl: this.baseUrl, version: 'OpenAI API' };
    } catch (error) {
      return this.offline(describeError(error));
    }
  }

  async listModels(): Promise<Result<ModelInfo[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/models`, {
        headers: await this.headers(),
        signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
      });
      if (response.status === 401 || response.status === 403)
        return { ok: false, error: tr('openai.keyRejected') };
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      const body = (await response.json()) as { data?: unknown };
      if (!Array.isArray(body.data))
        return { ok: false, error: tr('openai.unexpected') };
      const models = body.data
        .map((entry) => toModelInfo(entry as Record<string, unknown>))
        .filter((model): model is ModelInfo => model !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { ok: true, value: models };
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }
  }

  async listRunning(): Promise<Result<RunningModel[]>> {
    return { ok: true, value: [] };
  }

  // eslint-disable-next-line require-yield
  async *pull(_model: string, _signal: AbortSignal): AsyncGenerator<PullChunk> {
    throw new Error(tr('openai.noPull'));
  }

  async deleteModel(): Promise<Result<void>> {
    return { ok: false, error: tr('openai.noDelete') };
  }

  async modelInfo(): Promise<Result<Record<string, unknown>>> {
    return { ok: false, error: tr('openai.noModelInfo') };
  }

  async *chat(
    request: ChatRequest,
    signal: AbortSignal,
  ): AsyncGenerator<ChatChunk> {
    let response: Response;
    const started = Date.now();
    try {
      response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: await this.headers(true),
        body: JSON.stringify(toOpenAiChatBody(request)),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error(describeError(error));
    }
    if (!response.ok || !response.body) {
      if (response.status === 401 || response.status === 403)
        throw new Error(tr('openai.keyRejected'));
      throw new Error(await readErrorMessage(response));
    }

    const calls = new Map<number, { name: string; args: string }>();
    let firstTokenAt: number | null = null;
    let usage: { prompt?: number; completion?: number } = {};
    let completionChars = 0;

    for await (const data of readSse(response.body)) {
      if (data === '[DONE]') break;
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(data) as Record<string, unknown>;
      } catch {
        continue;
      }
      const err = json.error as { message?: unknown } | undefined;
      if (err) throw new Error(String(err.message ?? tr('openai.unexpected')));
      const u = json.usage as
        | { prompt_tokens?: unknown; completion_tokens?: unknown }
        | undefined;
      if (u) {
        usage = {
          prompt: typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0,
          completion:
            typeof u.completion_tokens === 'number' ? u.completion_tokens : 0,
        };
      }
      const choice = (json.choices as unknown[] | undefined)?.[0] as
        | { delta?: Record<string, unknown> }
        | undefined;
      const delta = choice?.delta;
      if (!delta) continue;
      const thinking = delta.reasoning_content ?? delta.reasoning;
      if (typeof thinking === 'string' && thinking !== '') {
        firstTokenAt ??= Date.now();
        yield { type: 'thinking', text: thinking };
      }
      if (typeof delta.content === 'string' && delta.content !== '') {
        firstTokenAt ??= Date.now();
        completionChars += delta.content.length;
        yield { type: 'content', text: delta.content };
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const piece of delta.tool_calls as Record<string, unknown>[]) {
          const index = typeof piece.index === 'number' ? piece.index : 0;
          const fn = piece.function as
            | { name?: unknown; arguments?: unknown }
            | undefined;
          const entry = calls.get(index) ?? { name: '', args: '' };
          if (typeof fn?.name === 'string') entry.name += fn.name;
          if (typeof fn?.arguments === 'string') entry.args += fn.arguments;
          calls.set(index, entry);
        }
      }
    }

    const toolCalls: ModelToolCall[] = [...calls.entries()]
      .sort(([a], [b]) => a - b)
      .filter(([, c]) => c.name !== '')
      .map(([, c]) => ({ name: c.name, arguments: parseArguments(c.args) }));
    if (toolCalls.length > 0) yield { type: 'tool-calls', calls: toolCalls };

    const totalMs = Date.now() - started;
    const seconds = firstTokenAt ? (Date.now() - firstTokenAt) / 1000 : 0;
    // Ohne usage schätzen wir die Tokens aus den Zeichen (4 je Token).
    const outputTokens = usage.completion ?? Math.round(completionChars / 4);
    const stats: ChatStats | undefined =
      outputTokens > 0 && seconds > 0
        ? {
            outputTokens,
            tokensPerSecond: outputTokens / seconds,
            promptTokens: usage.prompt ?? 0,
            totalMs,
          }
        : undefined;
    yield { type: 'done', stats };
  }

  async embed(
    model: string,
    inputs: string[],
    signal?: AbortSignal,
  ): Promise<Result<number[][]>> {
    if (inputs.length === 0) return { ok: true, value: [] };
    try {
      const response = await this.fetchFn(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: await this.headers(true),
        body: JSON.stringify({ model, input: inputs }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(EMBED_TIMEOUT_MS)])
          : AbortSignal.timeout(EMBED_TIMEOUT_MS),
      });
      if (!response.ok)
        return { ok: false, error: await readErrorMessage(response) };
      const body = (await response.json()) as { data?: unknown };
      const items = body.data;
      if (!Array.isArray(items) || items.length !== inputs.length)
        return { ok: false, error: tr('ollama.notEmbedding') };
      const sorted = [...items].sort(
        (a, b) =>
          Number((a as { index?: number }).index ?? 0) -
          Number((b as { index?: number }).index ?? 0),
      );
      const vectors = sorted.map(
        (item) => (item as { embedding?: unknown }).embedding,
      );
      if (!vectors.every(isNumberArray))
        return { ok: false, error: tr('ollama.notEmbedding') };
      return { ok: true, value: vectors };
    } catch (error) {
      if (signal?.aborted) return { ok: false, error: tr('error.cancelled') };
      return { ok: false, error: describeError(error) };
    }
  }

  private offline(error: string): ProviderStatus {
    return { online: false, baseUrl: this.baseUrl, error };
  }
}

/** Unsere Anfrage im OpenAI-Format. Nur gesetzte Werte werden mitgeschickt. */
export function toOpenAiChatBody(request: ChatRequest) {
  return {
    model: request.model,
    messages: toOpenAiMessages(request.messages),
    stream: true,
    stream_options: { include_usage: true },
    ...(request.options?.temperature !== undefined && {
      temperature: request.options.temperature,
    }),
    ...(request.options?.seed !== undefined && { seed: request.options.seed }),
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
    ...(request.format && {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'answer', schema: request.format, strict: true },
      },
    }),
  };
}

/**
 * OpenAI will für jeden Werkzeug-Aufruf eine Kennung, die das Ergebnis wieder aufgreift.
 * Wir vergeben sie der Reihe nach; ein Ergebnis gehört zum ersten offenen Aufruf gleichen Namens.
 */
export function toOpenAiMessages(messages: ChatMessage[]) {
  const open: { id: string; name: string }[] = [];
  let counter = 0;
  return messages.map((message) => {
    if (message.role === 'assistant' && message.toolCalls?.length) {
      const calls = message.toolCalls.map((call) => {
        const id = `call_${++counter}`;
        open.push({ id, name: call.name });
        return {
          id,
          type: 'function',
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments),
          },
        };
      });
      return {
        role: 'assistant',
        content: message.content || null,
        tool_calls: calls,
      };
    }
    if (message.role === 'tool') {
      const index = open.findIndex((c) => c.name === message.toolName);
      const [match] = open.splice(index === -1 ? 0 : index, 1);
      return {
        role: 'tool',
        tool_call_id: match?.id ?? `call_${++counter}`,
        content: message.content,
      };
    }
    if (message.role === 'user' && message.images?.length) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: message.content },
          ...message.images.map((image) => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${image}` },
          })),
        ],
      };
    }
    return { role: message.role, content: message.content };
  });
}

function toModelInfo(entry: Record<string, unknown>): ModelInfo | null {
  if (typeof entry.id !== 'string' || entry.id === '') return null;
  return {
    name: entry.id,
    sizeBytes: 0,
    modifiedAt:
      typeof entry.created === 'number'
        ? new Date(entry.created * 1000).toISOString()
        : '',
    // Ob ein Modell Werkzeuge kann, meldet die Schnittstelle nicht – wir bieten sie an; sonst meldet der Server den Fehler.
    capabilities: ['completion', 'tools'],
  };
}

function parseArguments(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    const value = JSON.parse(text) as unknown;
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Liest „Server-Sent Events“: Zeilen „data: …“, getrennt durch Leerzeilen. */
async function* readSse(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let end: number;
    while ((end = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, '');
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) yield data;
    }
  }
  const rest = (buffer + decoder.decode()).trim();
  if (rest.startsWith('data:')) yield rest.slice(5).trimStart();
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'number')
  );
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: unknown } | string;
    };
    if (typeof body.error === 'string') return body.error;
    if (typeof body.error?.message === 'string') return body.error.message;
  } catch {
    // Antwort war kein JSON
  }
  return `HTTP ${response.status}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    if (cause?.code === 'ECONNREFUSED')
      return 'Verbindung abgelehnt – läuft der Server?';
    return error.message;
  }
  return String(error);
}
