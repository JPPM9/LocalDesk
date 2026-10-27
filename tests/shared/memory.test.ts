import { describe, expect, it } from 'vitest';
import type { MemoryView } from '../../src/shared/api';
import {
  memoryPrompt,
  selectMemories,
  withMemories,
} from '../../src/shared/memory';

const memory = (id: string, chars: number, created?: string): MemoryView => ({
  id,
  text: 'x'.repeat(chars),
  ...(created && { created }),
});

describe('selectMemories', () => {
  it('nimmt alle, solange sie ins Budget passen', () => {
    const all = [memory('a', 400), memory('b', 400)];
    expect(selectMemories(all, 300)).toBe(all); // 2 × (100 + 2) Tokens
  });

  it('nimmt sonst die passendsten – in der ursprünglichen Reihenfolge', () => {
    const all = [memory('a', 400), memory('b', 400), memory('c', 400)];
    const chosen = selectMemories(all, 210, [0.2, 0.9, 0.7]);
    expect(chosen.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('nimmt ohne Bewertung die neuesten', () => {
    const all = [
      memory('alt', 400, '2025-01-01'),
      memory('neu', 400, '2026-10-01'),
      memory('mittel', 400, '2026-01-01'),
    ];
    expect(selectMemories(all, 210).map((m) => m.id)).toEqual([
      'neu',
      'mittel',
    ]);
  });

  it('überspringt zu große, wenn kleinere noch passen', () => {
    const all = [memory('groß', 2000), memory('klein', 40)];
    expect(selectMemories(all, 100, [0.9, 0.1]).map((m) => m.id)).toEqual([
      'klein',
    ]);
  });
});

describe('memoryPrompt', () => {
  it('listet die Erinnerungen einzeilig auf', () => {
    expect(memoryPrompt(['Ich studiere\nStatistik.', 'Antworte kurz.'])).toBe(
      'Was du über den Nutzer weißt (seine gespeicherten Erinnerungen – nutze sie, wenn sie passen, ohne sie ungefragt aufzuzählen):\n- Ich studiere Statistik.\n- Antworte kurz.',
    );
    expect(memoryPrompt([])).toBe('');
  });
});

describe('withMemories', () => {
  const user = { role: 'user' as const, content: 'Hallo' };

  it('stellt die Erinnerungen vor eine vorhandene System-Nachricht', () => {
    const request = {
      model: 'm',
      messages: [
        { role: 'system' as const, content: 'Projekt-Anweisung' },
        user,
      ],
    };
    const result = withMemories(request, ['Ich studiere Statistik.']);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toMatch(
      /^Was du über den Nutzer weißt[\s\S]*- Ich studiere Statistik\.\n\nProjekt-Anweisung$/,
    );
    expect(request.messages[0].content).toBe('Projekt-Anweisung'); // Original unverändert
  });

  it('legt sonst eine System-Nachricht an – und ändert ohne Erinnerungen nichts', () => {
    const request = { model: 'm', messages: [user] };
    expect(withMemories(request, ['A']).messages[0].role).toBe('system');
    expect(withMemories(request, [])).toBe(request);
  });
});
