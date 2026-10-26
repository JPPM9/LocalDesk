import { describe, expect, it, vi } from 'vitest';
import { OllamaProvider } from '../../src/main/providers/ollama';

const provider = (response: () => Response | Promise<Response>) => {
  const fetch = vi.fn(async () => response());
  return {
    fetch,
    ollama: new OllamaProvider({
      fetch: fetch as unknown as typeof globalThis.fetch,
    }),
  };
};

describe('OllamaProvider.embed', () => {
  it('schickt alle Texte in einer Anfrage und liefert die Vektoren in Reihenfolge', async () => {
    // Form wie von Ollama 0.40.11 (Vektoren gekürzt, echt: 1024 Zahlen)
    const { fetch, ollama } = provider(() =>
      Response.json({
        model: 'qwen3-embedding:0.6b',
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        prompt_eval_count: 8,
      }),
    );

    const result = await ollama.embed('qwen3-embedding:0.6b', ['a', 'b']);

    expect(result).toEqual({
      ok: true,
      value: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/embed');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'qwen3-embedding:0.6b',
      input: ['a', 'b'],
      keep_alive: '1m',
    });
  });

  it('fragt bei leerer Liste gar nicht erst', async () => {
    const { fetch, ollama } = provider(() => Response.json({}));
    expect(await ollama.embed('m', [])).toEqual({ ok: true, value: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('meldet Ollamas Fehler, z. B. bei einem Chat-Modell', async () => {
    const { ollama } = provider(() =>
      Response.json(
        {
          error:
            'This server does not support embeddings. Start it with `--embeddings`',
        },
        { status: 500 },
      ),
    );
    expect(await ollama.embed('qwen3:14b', ['x'])).toEqual({
      ok: false,
      error:
        'This server does not support embeddings. Start it with `--embeddings`',
    });
  });

  it('lehnt Antworten ab, deren Anzahl nicht passt', async () => {
    const { ollama } = provider(() => Response.json({ embeddings: [[1]] }));
    const result = await ollama.embed('m', ['a', 'b']);
    expect(result.ok).toBe(false);
  });

  it('übersetzt Verbindungsfehler', async () => {
    const { ollama } = provider(() => {
      throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
    });
    expect(await ollama.embed('m', ['a'])).toEqual({
      ok: false,
      error: 'Nicht erreichbar – läuft Ollama?',
    });
  });
});
