import { describe, expect, it, vi } from 'vitest';
import { OllamaProvider } from '../../src/main/providers/ollama';

// Baut eine fetch-Funktion nach, die immer dieselbe Antwort liefert.
function fakeFetch(response: Response | Error) {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
}

function connectionError(code: string) {
  return new TypeError('fetch failed', { cause: { code } });
}

describe('OllamaProvider.checkStatus', () => {
  it('meldet online mit Version, wenn Ollama antwortet', async () => {
    const fetch = fakeFetch(Response.json({ version: '0.40.11' }));
    const provider = new OllamaProvider({ fetch });

    await expect(provider.checkStatus()).resolves.toEqual({
      online: true,
      baseUrl: 'http://localhost:11434',
      version: '0.40.11',
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/version',
      expect.anything(),
    );
  });

  it('entfernt abschließende Schrägstriche aus der Server-Adresse', async () => {
    const fetch = fakeFetch(Response.json({ version: '1.0.0' }));
    const provider = new OllamaProvider({
      baseUrl: 'http://192.168.1.20:11434/',
      fetch,
    });

    await provider.checkStatus();
    expect(fetch).toHaveBeenCalledWith(
      'http://192.168.1.20:11434/api/version',
      expect.anything(),
    );
  });

  it('meldet offline bei einem HTTP-Fehler', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(new Response('kaputt', { status: 500 })),
    });

    await expect(provider.checkStatus()).resolves.toMatchObject({
      online: false,
      error: 'HTTP 500',
    });
  });

  it('meldet offline, wenn die Antwort nicht nach Ollama aussieht', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(Response.json({ hallo: 'welt' })),
    });

    await expect(provider.checkStatus()).resolves.toMatchObject({
      online: false,
    });
  });

  it('übersetzt "Verbindung abgelehnt" in einen verständlichen Hinweis', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(connectionError('ECONNREFUSED')),
    });

    await expect(provider.checkStatus()).resolves.toMatchObject({
      online: false,
      error: 'Nicht erreichbar – läuft Ollama?',
    });
  });

  it('meldet eine Zeitüberschreitung', async () => {
    const timeout = new DOMException(
      'The operation timed out.',
      'TimeoutError',
    );
    const provider = new OllamaProvider({
      fetch: vi.fn(async () => {
        throw timeout;
      }) as unknown as typeof fetch,
    });

    await expect(provider.checkStatus()).resolves.toMatchObject({
      online: false,
      error: 'Keine Antwort (Zeitüberschreitung)',
    });
  });
});
