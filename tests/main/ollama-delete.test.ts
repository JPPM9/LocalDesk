import { describe, expect, it, vi } from 'vitest';
import { OllamaProvider } from '../../src/main/providers/ollama';

describe('OllamaProvider.deleteModel', () => {
  it('schickt DELETE /api/delete mit dem Modellnamen', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    const provider = new OllamaProvider({
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await expect(provider.deleteModel('all-minilm:latest')).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/delete');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'all-minilm:latest',
    });
  });

  it('meldet „nicht gefunden“ von Ollama', async () => {
    const provider = new OllamaProvider({
      fetch: (async () =>
        Response.json(
          { error: "model 'gibtsnicht-xyz' not found" },
          { status: 404 },
        )) as unknown as typeof fetch,
    });
    await expect(provider.deleteModel('gibtsnicht-xyz')).resolves.toEqual({
      ok: false,
      error: "model 'gibtsnicht-xyz' not found",
    });
  });

  it('übersetzt Verbindungsfehler', async () => {
    const provider = new OllamaProvider({
      fetch: (async () => {
        throw new TypeError('fetch failed', {
          cause: { code: 'ECONNREFUSED' },
        });
      }) as unknown as typeof fetch,
    });
    await expect(provider.deleteModel('x')).resolves.toEqual({
      ok: false,
      error: 'Nicht erreichbar – läuft Ollama?',
    });
  });
});
