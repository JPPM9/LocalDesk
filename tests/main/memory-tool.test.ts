import { describe, expect, it } from 'vitest';
import {
  checkMemoryArguments,
  memoryTool,
} from '../../src/main/obsidian/memory-tool';

describe('checkMemoryArguments', () => {
  it('nimmt gekürzten Text, Ziel standardmäßig global', () => {
    expect(checkMemoryArguments({ text: '  Ich mag Tee. ' })).toEqual({
      text: 'Ich mag Tee.',
      scope: 'global',
    });
    expect(
      checkMemoryArguments({ text: 'Prüfung am 3. März', scope: 'projekt' }),
    ).toEqual({ text: 'Prüfung am 3. März', scope: 'projekt' });
  });

  it('lehnt leeren, zu langen oder falschen Text ab', () => {
    expect(checkMemoryArguments({ text: '   ' })).toBeNull();
    expect(checkMemoryArguments({ text: 'x'.repeat(501) })).toBeNull();
    expect(checkMemoryArguments({ text: 42 })).toBeNull();
    expect(checkMemoryArguments(null)).toBeNull();
  });

  it('unbekanntes Ziel wird global', () => {
    expect(checkMemoryArguments({ text: 'a', scope: 'alles' })?.scope).toBe(
      'global',
    );
  });
});

describe('memoryTool', () => {
  it('fragt immer nach und ist bearbeitbar', () => {
    const tool = memoryTool(false);
    expect(tool.permission).toBe('ask');
    expect(tool.editable).toBeDefined();
  });

  it('bietet die Wahl des Ziels nur im Projekt an', () => {
    const props = (inProject: boolean) =>
      Object.keys(
        (memoryTool(inProject).inputSchema.properties ?? {}) as object,
      );
    expect(props(false)).toEqual(['text']);
    expect(props(true)).toEqual(['text', 'scope']);
  });
});
