import { describe, expect, it } from 'vitest';
import type { MessageRecord, ToolCallRecord } from '../../src/shared/api';
import {
  applyChatEvent,
  combineStats,
  toRequestMessages,
} from '../../src/shared/chat';
import {
  CANCELLED_RESULT,
  limitResult,
  nameTools,
  parseToolCalls,
  summarizeArguments,
  TOOL_RESULT_MAX,
  type OfferedTool,
} from '../../src/shared/tools';

const tool = (serverId: string, toolName: string): OfferedTool => ({
  serverId,
  serverName: serverId === 'a' ? 'Notizen' : 'Projekte',
  toolName,
  description: 'Liest eine Datei',
  inputSchema: { type: 'object' },
  destructive: false,
  permission: 'always',
});

const call = (patch: Partial<ToolCallRecord> = {}): ToolCallRecord => ({
  id: 'c1',
  round: 1,
  name: 'read_text_file',
  toolName: 'read_text_file',
  serverId: 'a',
  serverName: 'Notizen',
  arguments: { path: 'C:/notizen/a.md' },
  status: 'done',
  result: 'Inhalt',
  ...patch,
});

describe('nameTools', () => {
  it('lässt Namen bei einem Server unverändert', () => {
    const named = nameTools([
      tool('a', 'read_text_file'),
      tool('a', 'list_directory'),
    ]);
    expect(named.map((t) => t.name)).toEqual([
      'read_text_file',
      'list_directory',
    ]);
    expect(named[0].description).toBe('Liest eine Datei');
  });

  it('macht gleiche Namen mehrerer Server eindeutig und nennt den Server', () => {
    const named = nameTools([
      tool('a', 'read_text_file'),
      tool('b', 'read_text_file'),
    ]);
    expect(named.map((t) => t.name)).toEqual([
      'read_text_file',
      'read_text_file_2',
    ]);
    expect(named[1].toolName).toBe('read_text_file');
    expect(named[1].description).toBe('[Projekte] Liest eine Datei');
  });
});

describe('summarizeArguments', () => {
  it('zeigt bevorzugt den Pfad', () => {
    expect(summarizeArguments({ content: 'lang', path: 'C:/a.md' })).toBe(
      'C:/a.md',
    );
  });

  it('fasst Pfadlisten zusammen und kürzt lange Texte', () => {
    expect(summarizeArguments({ paths: ['a.md', 'b.md'] })).toBe('a.md, b.md');
    expect(summarizeArguments({ text: 'x'.repeat(100) })).toHaveLength(60);
    expect(summarizeArguments({ n: 3 })).toBe('');
  });

  it('kürzt lange Pfade vorne, damit der Dateiname sichtbar bleibt', () => {
    const path = `C:/${'ordner/'.repeat(20)}einkauf.md`;
    const summary = summarizeArguments({ path });
    expect(summary).toHaveLength(60);
    expect(summary.startsWith('…')).toBe(true);
    expect(summary.endsWith('/einkauf.md')).toBe(true);
  });
});

describe('limitResult', () => {
  it('kürzt nur zu lange Ergebnisse und sagt das dazu', () => {
    expect(limitResult('kurz')).toBe('kurz');
    const long = limitResult('a'.repeat(TOOL_RESULT_MAX + 5));
    expect(long.startsWith('a'.repeat(TOOL_RESULT_MAX))).toBe(true);
    expect(long).toContain('gekürzt, 5 Zeichen');
  });
});

describe('parseToolCalls', () => {
  it('übernimmt gültige Einträge und übersteht kaputtes JSON', () => {
    expect(parseToolCalls(JSON.stringify([call(), { id: 'x' }]))).toEqual([
      call(),
    ]);
    expect(parseToolCalls('{kaputt')).toEqual([]);
    expect(parseToolCalls(null)).toEqual([]);
  });
});

const answer: MessageRecord = {
  id: 'r1',
  role: 'assistant',
  content: '',
  thinking: '',
  status: 'streaming',
};

describe('applyChatEvent mit Tool-Aufrufen', () => {
  it('fügt neue Aufrufe an und ersetzt bekannte', () => {
    let messages = applyChatEvent([answer], {
      requestId: 'r1',
      type: 'tool-call',
      call: call({ status: 'asking', result: undefined }),
    });
    messages = applyChatEvent(messages, {
      requestId: 'r1',
      type: 'tool-call',
      call: call({ id: 'c2' }),
    });
    messages = applyChatEvent(messages, {
      requestId: 'r1',
      type: 'tool-call',
      call: call({ status: 'running', result: undefined }),
    });
    expect(messages[0].toolCalls?.map((c) => [c.id, c.status])).toEqual([
      ['c1', 'running'],
      ['c2', 'done'],
    ]);
  });

  it('bricht beim Stoppen wartende Aufrufe mit ab', () => {
    const waiting: MessageRecord = {
      ...answer,
      toolCalls: [
        call({ status: 'asking', result: undefined }),
        call({ id: 'c2' }),
      ],
    };
    const [aborted] = applyChatEvent([waiting], {
      requestId: 'r1',
      type: 'aborted',
    });
    expect(aborted.toolCalls?.map((c) => c.status)).toEqual([
      'cancelled',
      'done',
    ]);
    expect(aborted.toolCalls?.[0].result).toBe(CANCELLED_RESULT);
  });
});

describe('toRequestMessages mit Tool-Aufrufen', () => {
  it('stellt die Tool-Runden vor den Antworttext', () => {
    const messages = toRequestMessages([
      {
        ...answer,
        id: 'u1',
        role: 'user',
        content: 'Fasse a.md zusammen',
        status: 'done',
      },
      {
        ...answer,
        content: 'Zusammenfassung',
        status: 'done',
        toolCalls: [
          call({
            id: 'c2',
            round: 2,
            name: 'write_file',
            status: 'denied',
            result: 'abgelehnt',
          }),
          call(),
        ],
      },
    ]);
    expect(messages).toEqual([
      { role: 'user', content: 'Fasse a.md zusammen' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { name: 'read_text_file', arguments: { path: 'C:/notizen/a.md' } },
        ],
      },
      { role: 'tool', toolName: 'read_text_file', content: 'Inhalt' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { name: 'write_file', arguments: { path: 'C:/notizen/a.md' } },
        ],
      },
      { role: 'tool', toolName: 'write_file', content: 'abgelehnt' },
      { role: 'assistant', content: 'Zusammenfassung' },
    ]);
  });
});

describe('combineStats', () => {
  it('addiert Tokens und Zeit über die Runden', () => {
    const stats = combineStats([
      {
        outputTokens: 20,
        tokensPerSecond: 40,
        promptTokens: 100,
        totalMs: 1000,
      },
      {
        outputTokens: 60,
        tokensPerSecond: 40,
        promptTokens: 300,
        totalMs: 2000,
      },
    ]);
    expect(stats).toEqual({
      outputTokens: 80,
      tokensPerSecond: 40,
      promptTokens: 300,
      totalMs: 3000,
    });
    expect(combineStats([])).toBeUndefined();
  });
});
