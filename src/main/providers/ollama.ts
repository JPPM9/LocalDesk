import type { ModelInfo, ProviderStatus, Result } from '../../shared/api';
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

  private offline(error: string): ProviderStatus {
    return { online: false, baseUrl: this.baseUrl, error };
  }
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
