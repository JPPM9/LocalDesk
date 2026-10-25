import type { ProviderStatus } from '../../shared/api';
import type { Provider } from './provider';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/** Wie lange wir auf eine Antwort warten, bevor Ollama als „offline“ gilt. */
const STATUS_TIMEOUT_MS = 2000;

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

  private offline(error: string): ProviderStatus {
    return { online: false, baseUrl: this.baseUrl, error };
  }
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
