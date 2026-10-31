import { describe, expect, it, vi } from 'vitest';
import type { ChatChunk, ChatStreamEvent } from '../../src/shared/api';
import { codeAgentPrompt, isCodeMode } from '../../src/shared/code-agent';
import { normalizeSettings } from '../../src/shared/settings';
import { readTools } from '../../src/main/code/code-tools';
import { allowedInMode, filterForMode } from '../../src/main/code/code-mode';
import { commandTool } from '../../src/main/code/command-tool';
import { editTools } from '../../src/main/code/edit-tools';
import { gitTools } from '../../src/main/code/git-tools';
import type { Provider } from '../../src/main/providers/provider';
import { runAnswer, type ToolRuntime } from '../../src/main/tool-loop';

const allTools = () => [
  ...readTools(),
  ...editTools(async () => ''),
  commandTool(),
  ...gitTools(async () => ''),
];

describe('Code-Modus', () => {
  it('Plan bietet nur Lese-Werkzeuge an, Manuell alle', () => {
    const names = (mode: 'plan' | 'manual') =>
      filterForMode(allTools(), mode).map((t) => t.toolName);
    expect(names('plan')).toEqual([
      'list_files',
      'read_file',
      'search_text',
      'git_status',
      'git_diff',
    ]);
    expect(names('manual')).toEqual(allTools().map((t) => t.toolName));
  });

  it('im Plan-Modus ist nichts Änderndes erlaubt', () => {
    for (const name of [
      'edit_file',
      'write_file',
      'delete_file',
      'run_command',
      'git_commit',
      'irgendwas_neues',
    ]) {
      expect(allowedInMode('plan', name), name).toBe(false);
      expect(allowedInMode('manual', name), name).toBe(true);
    }
    expect(allowedInMode('plan', 'read_file')).toBe(true);
  });

  it('der Modus wird als Einstellung geprüft und gespeichert (Standard wird nicht gespeichert)', () => {
    expect(normalizeSettings({ codeMode: 'plan' })).toEqual({
      codeMode: 'plan',
    });
    expect(normalizeSettings({ codeMode: 'manual' })).toEqual({});
    expect(normalizeSettings({ codeMode: 'auto' })).toEqual({});
    expect(normalizeSettings({ codeMode: 1 })).toEqual({});
    expect(['plan', 'manual'].every(isCodeMode)).toBe(true);
    expect(isCodeMode('auto')).toBe(false);
  });

  it('der Plan-Modus steht auch in der Anweisung an das Modell', () => {
    const day = new Date(2026, 9, 31);
    expect(codeAgentPrompt('Projekt', day, 'plan')).toContain('PLAN-MODUS');
    expect(codeAgentPrompt('Projekt', day, 'manual')).not.toContain(
      'PLAN-MODUS',
    );
    expect(codeAgentPrompt('Projekt', day)).not.toContain('PLAN-MODUS');
  });

  it('ein erfundener Schreib-Aufruf im Plan-Modus läuft nicht', async () => {
    const calls: string[] = [];
    const runtime: ToolRuntime = {
      tools: () => filterForMode(allTools(), 'plan'),
      call: async (tool) => {
        calls.push(tool.toolName);
        return { text: 'ok', isError: false };
      },
      ask: vi.fn(async () => ({ decision: 'once' as const })),
      allowAlways: () => {},
    };
    let round = 0;
    const provider = {
      async *chat(): AsyncGenerator<ChatChunk> {
        round++;
        if (round === 1) {
          yield {
            type: 'tool-calls',
            calls: [
              { name: 'write_file', arguments: { path: 'a.py', content: 'x' } },
              { name: 'run_command', arguments: { command: 'dir' } },
              { name: 'read_file', arguments: { path: 'a.py' } },
            ],
          };
        } else {
          yield { type: 'content', text: 'Plan: …' };
        }
      },
    } as unknown as Provider;
    const events: ChatStreamEvent[] = [];
    await runAnswer({
      provider,
      request: { model: 'm', messages: [{ role: 'user', content: 'Plane' }] },
      requestId: 'r',
      runtime,
      emit: (e) => events.push(e),
      signal: new AbortController().signal,
      newId: () => `c${calls.length}-${events.length}`,
    });
    // Nur das Lesen lief; nach Schreiben und Befehl wurde nicht einmal gefragt.
    expect(calls).toEqual(['read_file']);
    expect(runtime.ask).not.toHaveBeenCalled();
    const statuses = events.flatMap((e) =>
      e.type === 'tool-call' ? [`${e.call.toolName}:${e.call.status}`] : [],
    );
    expect(statuses).toContain('write_file:error');
    expect(statuses).toContain('run_command:error');
    expect(statuses).toContain('read_file:done');
  });
});
