import { describe, expect, it } from 'vitest';
import type { ChatChunk } from '../../src/shared/api';
import {
  OpenAiCompatProvider,
  toOpenAiChatBody,
  toOpenAiMessages,
} from '../../src/main/providers/openai-compat';
import { isPrivateHost, normalizeServerUrl } from '../../src/shared/server';

const sse = (...events: unknown[]) =>
  new Response(
    events
      .map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`)
      .join(''),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );

const provider = (handler: (url: string, init?: RequestInit) => Response) =>
  new OpenAiCompatProvider({
    baseUrl: 'http://localhost:1234/v1',
    apiKey: async () => 'sk-test',
    fetch: (async (url: string, init?: RequestInit) =>
      handler(String(url), init)) as typeof fetch,
  });

async function collect<T>(gen: AsyncGenerator<T>) {
  const out: T[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

describe('Adressen für OpenAI-kompatible Server', () => {
  it('ergänzt /v1 und den Standard-Port von LM Studio', () => {
    expect(normalizeServerUrl('localhost', 'openai')).toEqual({
      ok: true,
      value: 'http://localhost:1234/v1',
    });
    expect(normalizeServerUrl('http://localhost:8080/v1/', 'openai')).toEqual({
      ok: true,
      value: 'http://localhost:8080/v1',
    });
    expect(normalizeServerUrl('https://api.example.com/v1', 'openai')).toEqual({
      ok: true,
      value: 'https://api.example.com/v1',
    });
  });
  it('lehnt Zugangsdaten in der Adresse ab', () => {
    expect(
      normalizeServerUrl('https://u:p@api.example.com/v1', 'openai').ok,
    ).toBe(false);
  });
  it('erkennt Server im eigenen Netz', () => {
    expect(isPrivateHost('http://localhost:1234/v1')).toBe(true);
    expect(isPrivateHost('http://192.168.1.20:8080/v1')).toBe(true);
    expect(isPrivateHost('http://mein-pc:1234/v1')).toBe(true);
    expect(isPrivateHost('https://api.example.com/v1')).toBe(false);
  });
});

describe('OpenAiCompatProvider', () => {
  it('listet Modelle und schickt den Schlüssel als Bearer', async () => {
    let auth = '';
    const p = provider((url, init) => {
      auth = (init?.headers as Record<string, string>).Authorization;
      expect(url).toBe('http://localhost:1234/v1/models');
      return Response.json({ data: [{ id: 'b-model' }, { id: 'a-model' }] });
    });
    const result = await p.listModels();
    expect(auth).toBe('Bearer sk-test');
    expect(result.ok && result.value.map((m) => m.name)).toEqual([
      'a-model',
      'b-model',
    ]);
  });

  it('meldet einen abgelehnten Schlüssel verständlich', async () => {
    const p = provider(() => new Response('no', { status: 401 }));
    const status = await p.checkStatus();
    expect(status.online).toBe(false);
  });

  it('streamt Text, Denken, Werkzeug-Aufrufe aus Teilen und die Zahlen', async () => {
    const p = provider(() =>
      sse(
        { choices: [{ delta: { reasoning_content: 'hm' } }] },
        { choices: [{ delta: { content: 'Hal' } }] },
        { choices: [{ delta: { content: 'lo' } }] },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'x',
                    function: { name: 'table_', arguments: '{"sq' },
                  },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  { index: 0, function: { name: 'query', arguments: 'l":1}' } },
                ],
              },
            },
          ],
        },
        { usage: { prompt_tokens: 10, completion_tokens: 4 } },
        '[DONE]',
      ),
    );
    const chunks = await collect(
      p.chat(
        { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
        new AbortController().signal,
      ),
    );
    expect(chunks.filter((c) => c.type === 'thinking')).toEqual([
      { type: 'thinking', text: 'hm' },
    ]);
    expect(
      chunks
        .filter((c) => c.type === 'content')
        .map((c) => (c as { text: string }).text)
        .join(''),
    ).toBe('Hallo');
    expect(chunks.find((c) => c.type === 'tool-calls')).toEqual({
      type: 'tool-calls',
      calls: [{ name: 'table_query', arguments: { sql: 1 } }],
    });
    const done = chunks.at(-1) as Extract<ChatChunk, { type: 'done' }>;
    expect(done.type).toBe('done');
  });

  it('Herunterladen und Löschen gehen hier nicht', async () => {
    const p = provider(() => Response.json({}));
    await expect(
      collect(p.pull('x', new AbortController().signal)),
    ).rejects.toThrow();
    expect((await p.deleteModel()).ok).toBe(false);
    expect(await p.listRunning()).toEqual({ ok: true, value: [] });
  });
});

describe('Anfrage im OpenAI-Format', () => {
  it('ordnet Werkzeug-Ergebnisse den Aufrufen zu', () => {
    const messages = toOpenAiMessages([
      { role: 'user', content: 'rechne' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { name: 'a', arguments: { x: 1 } },
          { name: 'b', arguments: {} },
        ],
      },
      { role: 'tool', content: 'B', toolName: 'b' },
      { role: 'tool', content: 'A', toolName: 'a' },
    ]) as { tool_call_id?: string; tool_calls?: { id: string }[] }[];
    expect(messages[1].tool_calls?.map((c) => c.id)).toEqual([
      'call_1',
      'call_2',
    ]);
    expect(messages[2].tool_call_id).toBe('call_2');
    expect(messages[3].tool_call_id).toBe('call_1');
  });

  it('schickt Bilder als image_url und nur gesetzte Optionen', () => {
    const body = toOpenAiChatBody({
      model: 'm',
      messages: [{ role: 'user', content: 'was?', images: ['QUJD'] }],
      options: { temperature: 0.2 },
    });
    expect(body.temperature).toBe(0.2);
    expect('seed' in body).toBe(false);
    expect(JSON.stringify(body.messages)).toContain(
      'data:image/jpeg;base64,QUJD',
    );
  });
});
