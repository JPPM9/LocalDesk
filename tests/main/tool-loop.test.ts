import { describe, expect, it, vi } from 'vitest';
import type {
  ChatChunk,
  ChatRequest,
  ChatStreamEvent,
  ToolDecision,
} from '../../src/shared/api';
import type { Provider } from '../../src/main/providers/provider';
import { runAnswer, type ToolRuntime } from '../../src/main/tool-loop';
import { toToolResult } from '../../src/main/mcp/tool-result';
import type { OfferedTool } from '../../src/shared/tools';

const readTool: OfferedTool = {
  serverId: 's1',
  serverName: 'Notizen',
  toolName: 'read_text_file',
  description: 'Liest eine Datei',
  inputSchema: { type: 'object' },
  destructive: false,
  permission: 'always',
};
const writeTool: OfferedTool = {
  ...readTool,
  toolName: 'write_file',
  description: 'Schreibt eine Datei',
  destructive: true,
  permission: 'ask',
};

const stats = {
  outputTokens: 10,
  tokensPerSecond: 50,
  promptTokens: 100,
  totalMs: 500,
};

/** Ein Provider, der pro Runde die vorgegebenen Stücke liefert und die Anfragen mitschreibt. */
function fakeProvider(rounds: ChatChunk[][]) {
  const requests: ChatRequest[] = [];
  const provider = {
    async *chat(request: ChatRequest) {
      requests.push(structuredClone(request));
      const chunks = rounds[requests.length - 1] ?? [];
      for (const chunk of chunks) yield chunk;
    },
  } as unknown as Provider;
  return { provider, requests };
}

function fakeRuntime(
  tools: OfferedTool[],
  decision: ToolDecision = 'once',
): ToolRuntime & { calls: string[]; allowed: string[] } {
  const calls: string[] = [];
  const allowed: string[] = [];
  return {
    calls,
    allowed,
    tools: () => tools,
    call: async (tool, args) => {
      calls.push(`${tool.toolName}(${JSON.stringify(args)})`);
      return { text: `Ergebnis von ${tool.toolName}`, isError: false };
    },
    ask: vi.fn(async () => decision),
    allowAlways: (tool) => allowed.push(tool.toolName),
  };
}

async function run(
  rounds: ChatChunk[][],
  runtime: ToolRuntime,
  options: { maxRounds?: number; signal?: AbortSignal } = {},
) {
  const { provider, requests } = fakeProvider(rounds);
  const events: ChatStreamEvent[] = [];
  let id = 0;
  await runAnswer({
    provider,
    request: {
      model: 'qwen3:14b',
      messages: [{ role: 'user', content: 'Fasse a.md zusammen' }],
    },
    requestId: 'r1',
    runtime,
    emit: (e) => events.push(e),
    signal: options.signal ?? new AbortController().signal,
    newId: () => `call-${++id}`,
    maxRounds: options.maxRounds,
  });
  return { events, requests };
}

const toolCallStatuses = (events: ChatStreamEvent[]) =>
  events.flatMap((e) =>
    e.type === 'tool-call' ? [`${e.call.toolName}:${e.call.status}`] : [],
  );

describe('runAnswer', () => {
  it('ohne Tool-Wunsch: eine Runde, Text und done', async () => {
    const { events, requests } = await run(
      [
        [
          { type: 'content', text: 'Hallo' },
          { type: 'done', stats },
        ],
      ],
      fakeRuntime([readTool]),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].tools?.map((t) => t.name)).toEqual(['read_text_file']);
    expect(events.map((e) => e.type)).toEqual(['content', 'done']);
  });

  it('schickt keine Tools, wenn keine zur Verfügung stehen', async () => {
    const { requests } = await run([[{ type: 'done' }]], fakeRuntime([]));
    expect(requests[0]).not.toHaveProperty('tools');
  });

  it('führt freigegebene Tools ohne Rückfrage aus und gibt das Ergebnis zurück', async () => {
    const runtime = fakeRuntime([readTool]);
    const { events, requests } = await run(
      [
        [
          {
            type: 'tool-calls',
            calls: [{ name: 'read_text_file', arguments: { path: 'a.md' } }],
          },
          { type: 'done', stats },
        ],
        [
          { type: 'content', text: 'Zusammenfassung' },
          { type: 'done', stats },
        ],
      ],
      runtime,
    );

    expect(runtime.ask).not.toHaveBeenCalled();
    expect(runtime.calls).toEqual(['read_text_file({"path":"a.md"})']);
    expect(toolCallStatuses(events)).toEqual([
      'read_text_file:running',
      'read_text_file:done',
    ]);
    // Zweite Runde: Verlauf enthält Aufruf und Ergebnis.
    expect(requests[1].messages.slice(1)).toEqual([
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ name: 'read_text_file', arguments: { path: 'a.md' } }],
      },
      {
        role: 'tool',
        toolName: 'read_text_file',
        content: 'Ergebnis von read_text_file',
      },
    ]);
    const done = events.at(-1);
    expect(done).toMatchObject({ type: 'done', stats: { outputTokens: 20 } });
  });

  it('fragt bei „ask“ und führt nach Ablehnung nichts aus', async () => {
    const runtime = fakeRuntime([writeTool], 'deny');
    const { events, requests } = await run(
      [
        [
          {
            type: 'tool-calls',
            calls: [{ name: 'write_file', arguments: { path: 'a.md' } }],
          },
        ],
        [{ type: 'content', text: 'Okay, nicht geschrieben.' }],
      ],
      runtime,
    );
    expect(runtime.ask).toHaveBeenCalledOnce();
    expect(runtime.calls).toEqual([]);
    expect(toolCallStatuses(events)).toEqual([
      'write_file:asking',
      'write_file:denied',
    ]);
    expect(requests[1].messages.at(-1)?.content).toContain('abgelehnt');
  });

  it('„Immer erlauben“ führt aus und merkt sich die Freigabe', async () => {
    const runtime = fakeRuntime([writeTool], 'always');
    await run(
      [
        [
          {
            type: 'tool-calls',
            calls: [{ name: 'write_file', arguments: { path: 'a.md' } }],
          },
        ],
        [],
      ],
      runtime,
    );
    expect(runtime.allowed).toEqual(['write_file']);
    expect(runtime.calls).toHaveLength(1);
  });

  it('führt nicht angebotene Tools nie aus', async () => {
    const runtime = fakeRuntime([readTool]);
    const { events } = await run(
      [
        [
          {
            type: 'tool-calls',
            calls: [{ name: 'delete_everything', arguments: {} }],
          },
        ],
        [],
      ],
      runtime,
    );
    expect(runtime.calls).toEqual([]);
    expect(toolCallStatuses(events)).toEqual(['delete_everything:error']);
  });

  it('bietet nach der Höchstzahl an Runden keine Tools mehr an', async () => {
    const wantsTool: ChatChunk[] = [
      {
        type: 'tool-calls',
        calls: [{ name: 'read_text_file', arguments: { path: 'a.md' } }],
      },
    ];
    const runtime = fakeRuntime([readTool]);
    const { requests, events } = await run(
      [wantsTool, wantsTool, wantsTool, [{ type: 'content', text: 'Ende' }]],
      runtime,
      { maxRounds: 2 },
    );
    expect(runtime.calls).toHaveLength(2);
    expect(requests).toHaveLength(3);
    expect(requests[2]).not.toHaveProperty('tools');
    expect(events.at(-1)?.type).toBe('done');
  });

  it('trennt Text verschiedener Runden mit einer Leerzeile', async () => {
    const { events } = await run(
      [
        [
          { type: 'content', text: 'Ich schaue nach.' },
          {
            type: 'tool-calls',
            calls: [{ name: 'read_text_file', arguments: {} }],
          },
        ],
        [{ type: 'content', text: 'Gefunden.' }],
      ],
      fakeRuntime([readTool]),
    );
    const text = events
      .map((e) => (e.type === 'content' ? e.text : ''))
      .join('');
    expect(text).toBe('Ich schaue nach.\n\nGefunden.');
  });

  it('bricht ab, wenn während der Rückfrage gestoppt wird', async () => {
    const controller = new AbortController();
    const runtime = fakeRuntime([writeTool]);
    runtime.ask = async () => {
      controller.abort();
      return 'deny';
    };
    await expect(
      run(
        [
          [
            {
              type: 'tool-calls',
              calls: [{ name: 'write_file', arguments: {} }],
            },
          ],
        ],
        runtime,
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
    expect(runtime.calls).toEqual([]);
  });

  it('gibt Fehler eines Tools als Ergebnis ans Modell zurück', async () => {
    const runtime = fakeRuntime([readTool]);
    runtime.call = async () => {
      throw new Error('Access denied - path outside allowed directories');
    };
    const { events, requests } = await run(
      [
        [
          {
            type: 'tool-calls',
            calls: [{ name: 'read_text_file', arguments: { path: 'C:/x' } }],
          },
        ],
        [],
      ],
      runtime,
    );
    expect(toolCallStatuses(events).at(-1)).toBe('read_text_file:error');
    expect(requests[1].messages.at(-1)?.content).toContain('Access denied');
  });
});

describe('toToolResult', () => {
  it('verbindet Textteile und erkennt Fehler', () => {
    expect(
      toToolResult({
        content: [
          { type: 'text', text: 'Zeile 1' },
          { type: 'image', data: '...' },
        ],
        isError: true,
      }),
    ).toEqual({
      text: 'Zeile 1\n[image – kann nicht als Text gezeigt werden]',
      isError: true,
    });
    expect(toToolResult({ content: [] })).toEqual({
      text: '(kein Ergebnis)',
      isError: false,
    });
  });
});
