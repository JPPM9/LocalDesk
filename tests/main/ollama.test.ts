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

describe('OllamaProvider.listModels', () => {
  // Gekürzte echte Antwort von Ollama 0.40.11
  const qwen = {
    name: 'qwen3:14b',
    model: 'qwen3:14b',
    modified_at: '2026-10-01T14:09:08.2467225+02:00',
    size: 9276198565,
    details: {
      family: 'qwen3',
      parameter_size: '14.8B',
      quantization_level: 'Q4_K_M',
      context_length: 40960,
    },
    capabilities: ['completion', 'tools', 'thinking'],
  };
  const gemma = {
    name: 'gemma4:12b',
    size: 8021618941,
    modified_at: '2026-10-01T14:11:22.2779845+02:00',
    details: { parameter_size: '11.9B', quantization_level: 'Q4_K_M' },
    capabilities: ['completion', 'vision'],
  };

  it('wandelt die Ollama-Antwort um und sortiert nach Name', async () => {
    const fetch = fakeFetch(Response.json({ models: [qwen, gemma] }));
    const provider = new OllamaProvider({ fetch });

    const result = await provider.listModels();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.anything(),
    );
    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: 'gemma4:12b',
          sizeBytes: 8021618941,
          modifiedAt: '2026-10-01T14:11:22.2779845+02:00',
          family: undefined,
          parameterSize: '11.9B',
          quantization: 'Q4_K_M',
          contextLength: undefined,
          capabilities: ['completion', 'vision'],
        },
        {
          name: 'qwen3:14b',
          sizeBytes: 9276198565,
          modifiedAt: '2026-10-01T14:09:08.2467225+02:00',
          family: 'qwen3',
          parameterSize: '14.8B',
          quantization: 'Q4_K_M',
          contextLength: 40960,
          capabilities: ['completion', 'tools', 'thinking'],
        },
      ],
    });
  });

  it('übersteht fehlende Felder (ältere Ollama-Versionen)', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(
        Response.json({ models: [{ name: 'alt:7b' }, { size: 1 }] }),
      ),
    });

    const result = await provider.listModels();

    // Eintrag ohne Namen wird übersprungen, fehlende Werte bleiben leer.
    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: 'alt:7b',
          sizeBytes: 0,
          modifiedAt: '',
          family: undefined,
          parameterSize: undefined,
          quantization: undefined,
          contextLength: undefined,
          capabilities: [],
        },
      ],
    });
  });

  it('liefert eine leere Liste, wenn keine Modelle installiert sind', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(Response.json({ models: [] })),
    });

    await expect(provider.listModels()).resolves.toEqual({
      ok: true,
      value: [],
    });
  });

  it('meldet Fehler, wenn Ollama nicht erreichbar ist', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(connectionError('ECONNREFUSED')),
    });

    await expect(provider.listModels()).resolves.toEqual({
      ok: false,
      error: 'Nicht erreichbar – läuft Ollama?',
    });
  });

  it('meldet Fehler bei unerwartetem Antwortformat', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(Response.json({ foo: 1 })),
    });

    await expect(provider.listModels()).resolves.toMatchObject({ ok: false });
  });
});
