import { describe, expect, it, vi } from 'vitest';
import type { ChatChunk } from '../../src/shared/api';
import {
  OllamaProvider,
  toOllamaChatBody,
} from '../../src/main/providers/ollama';

describe('toOllamaChatBody', () => {
  it('übersetzt Optionen in Ollamas Namen (contextLength → num_ctx)', () => {
    expect(
      toOllamaChatBody({
        model: 'qwen3:14b',
        messages: [],
        options: { temperature: 0, contextLength: 16384, seed: 7 },
        think: false,
      }),
    ).toEqual({
      model: 'qwen3:14b',
      messages: [],
      stream: true,
      options: { temperature: 0, num_ctx: 16384, seed: 7 },
      think: false,
    });
  });

  it('lässt options und think weg, wenn nichts gesetzt ist', () => {
    expect(toOllamaChatBody({ model: 'm', messages: [] })).toEqual({
      model: 'm',
      messages: [],
      stream: true,
    });
  });
});

const request = {
  model: 'qwen3:14b',
  messages: [{ role: 'user' as const, content: 'Sag nur: Hallo' }],
};

// Antwort wie von Ollama 0.40.11 (gekürzt): erst Gedanken, dann Text, dann Statistik.
const streamLines = [
  {
    message: { role: 'assistant', content: '', thinking: 'Okay' },
    done: false,
  },
  { message: { role: 'assistant', content: 'Hallo' }, done: false },
  { message: { role: 'assistant', content: '!' }, done: false },
  {
    message: { role: 'assistant', content: '' },
    done: true,
    total_duration: 2638653800,
    prompt_eval_count: 22,
    eval_count: 3,
    eval_duration: 80106000,
  },
];

function ndjsonResponse(lines: unknown[]) {
  const text = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  return new Response(text, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}

async function collect(provider: OllamaProvider) {
  const chunks: ChatChunk[] = [];
  for await (const chunk of provider.chat(
    request,
    new AbortController().signal,
  )) {
    chunks.push(chunk);
  }
  return chunks;
}

describe('OllamaProvider.chat', () => {
  it('schickt Modell und Verlauf an /api/chat', async () => {
    const fetch = vi.fn(async () => ndjsonResponse(streamLines));
    const provider = new OllamaProvider({
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await collect(provider);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      ...request,
      stream: true,
    });
  });

  it('liefert Gedanken, Text und Statistik in der richtigen Reihenfolge', async () => {
    const provider = new OllamaProvider({
      fetch: (async () =>
        ndjsonResponse(streamLines)) as unknown as typeof fetch,
    });

    const chunks = await collect(provider);

    expect(chunks.slice(0, 3)).toEqual([
      { type: 'thinking', text: 'Okay' },
      { type: 'content', text: 'Hallo' },
      { type: 'content', text: '!' },
    ]);
    const done = chunks[3];
    expect(done.type).toBe('done');
    if (done.type !== 'done') return;
    expect(done.stats?.outputTokens).toBe(3);
    expect(done.stats?.promptTokens).toBe(22);
    expect(done.stats?.tokensPerSecond).toBeCloseTo(37.45, 1);
    expect(done.stats?.totalMs).toBeCloseTo(2638.65, 1);
  });

  it('meldet die Fehlermeldung von Ollama, z. B. bei unbekanntem Modell', async () => {
    const provider = new OllamaProvider({
      fetch: (async () =>
        Response.json(
          { error: "model 'gibtsnicht' not found" },
          { status: 404 },
        )) as unknown as typeof fetch,
    });

    await expect(collect(provider)).rejects.toThrow(
      "model 'gibtsnicht' not found",
    );
  });

  it('meldet Fehler, die mitten im Stream kommen', async () => {
    const provider = new OllamaProvider({
      fetch: (async () =>
        ndjsonResponse([
          streamLines[1],
          { error: 'out of memory' },
        ])) as unknown as typeof fetch,
    });

    await expect(collect(provider)).rejects.toThrow('out of memory');
  });

  it('übersetzt Verbindungsfehler in einen verständlichen Hinweis', async () => {
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

describe('Tool-Calling', () => {
  it('schickt Tools und Tool-Verlauf in Ollamas Format', () => {
    const body = toOllamaChatBody({
      model: 'qwen3:14b',
      messages: [
        { role: 'user', content: 'Was liegt in C:/test?' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            { name: 'list_directory', arguments: { path: 'C:/test' } },
          ],
        },
        { role: 'tool', toolName: 'list_directory', content: '[FILE] a.txt' },
      ],
      tools: [
        {
          name: 'list_directory',
          description: 'Listet einen Ordner',
          parameters: { type: 'object', properties: {} },
        },
      ],
    });
    expect(body.messages).toEqual([
      { role: 'user', content: 'Was liegt in C:/test?' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            function: {
              name: 'list_directory',
              arguments: { path: 'C:/test' },
            },
          },
        ],
      },
      { role: 'tool', content: '[FILE] a.txt', tool_name: 'list_directory' },
    ]);
    expect(body.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'list_directory',
          description: 'Listet einen Ordner',
          parameters: { type: 'object', properties: {} },
        },
      },
    ]);
  });

  it('lässt tools weg, wenn die Liste leer ist', () => {
    expect(
      toOllamaChatBody({ model: 'm', messages: [], tools: [] }),
    ).not.toHaveProperty('tools');
  });

  it('liest Tool-Aufrufe aus dem Stream (Format von Ollama 0.40.11)', async () => {
    const provider = new OllamaProvider({
      fetch: (async () =>
        ndjsonResponse([
          {
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'call_etm3kdrb',
                  function: {
                    index: 0,
                    name: 'list_directory',
                    arguments: { path: 'C:/test' },
                  },
                },
                // Argumente als JSON-Text, kaputter Eintrag ohne Namen
                {
                  function: {
                    name: 'read_text_file',
                    arguments: '{"path":"a.md"}',
                  },
                },
                { function: { arguments: {} } },
              ],
            },
            done: false,
          },
          streamLines[3],
        ])) as unknown as typeof fetch,
    });

    const chunks = await collect(provider);

    expect(chunks[0]).toEqual({
      type: 'tool-calls',
      calls: [
        { name: 'list_directory', arguments: { path: 'C:/test' } },
        { name: 'read_text_file', arguments: { path: 'a.md' } },
      ],
    });
    expect(chunks[1].type).toBe('done');
  });
});
