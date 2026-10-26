import { describe, expect, it, vi } from 'vitest';
import type { PullChunk } from '../../src/shared/api';
import { OllamaProvider } from '../../src/main/providers/ollama';

const ndjson = (lines: unknown[]) =>
  new Response(lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

async function collect(provider: OllamaProvider, model = 'all-minilm') {
  const chunks: PullChunk[] = [];
  for await (const chunk of provider.pull(
    model,
    new AbortController().signal,
  )) {
    chunks.push(chunk);
  }
  return chunks;
}

describe('OllamaProvider.pull', () => {
  it('schickt den Modellnamen an /api/pull und liefert die Meldungen', async () => {
    const fetch = vi.fn(async () =>
      ndjson([
        { status: 'pulling manifest' },
        {
          status: 'pulling 797b70c4edf8',
          digest: 'sha256:797b',
          total: 45949216,
          completed: 113966,
        },
        { status: 'success' },
      ]),
    );
    const provider = new OllamaProvider({
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    const chunks = await collect(provider);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/pull');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'all-minilm',
      stream: true,
    });
    expect(chunks).toEqual([
      { status: 'pulling manifest' },
      {
        status: 'pulling 797b70c4edf8',
        digest: 'sha256:797b',
        total: 45949216,
        completed: 113966,
      },
      { status: 'success' },
    ]);
  });

  it('meldet den Fehler von Ollama, z. B. bei unbekanntem Modell', async () => {
    const provider = new OllamaProvider({
      fetch: (async () =>
        ndjson([
          { status: 'pulling manifest' },
          { error: 'pull model manifest: file does not exist' },
        ])) as unknown as typeof fetch,
    });
    await expect(collect(provider, 'gibtsnicht-xyz')).rejects.toThrow(
      'pull model manifest: file does not exist',
    );
  });

  it('übersetzt Verbindungsfehler', async () => {
    const provider = new OllamaProvider({
      fetch: (async () => {
        throw new TypeError('fetch failed', {
          cause: { code: 'ECONNREFUSED' },
        });
      }) as unknown as typeof fetch,
    });
    await expect(collect(provider)).rejects.toThrow(
      'Nicht erreichbar – läuft Ollama?',
    );
  });
});
