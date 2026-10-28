import { describe, expect, it } from 'vitest';
import { groupChatsByDay } from '../../src/renderer/chat/days';
import type { ChatSummary } from '../../src/shared/api';

const now = new Date(2026, 9, 28, 9, 0); // Mittwoch, 28.10., 9 Uhr
const chat = (id: string, d: Date): ChatSummary => ({
  id,
  title: id,
  model: 'm',
  updatedAt: d.getTime(),
});

describe('groupChatsByDay', () => {
  it('teilt nach Kalendertagen ein, nicht nach 24-Stunden-Abständen', () => {
    const groups = groupChatsByDay(
      [
        chat('heute früh', new Date(2026, 9, 28, 0, 5)),
        chat('gestern spät', new Date(2026, 9, 27, 23, 50)),
        chat('vor 5 Tagen', new Date(2026, 9, 23, 12)),
        chat('vor 20 Tagen', new Date(2026, 9, 8, 12)),
        chat('letztes Jahr', new Date(2025, 9, 1)),
      ],
      now,
    );
    expect(groups.map((g) => [g.key, g.chats.map((c) => c.id)])).toEqual([
      ['today', ['heute früh']],
      ['yesterday', ['gestern spät']],
      ['week', ['vor 5 Tagen']],
      ['month', ['vor 20 Tagen']],
      ['older', ['letztes Jahr']],
    ]);
  });

  it('lässt leere Gruppen weg und behält die Reihenfolge', () => {
    const groups = groupChatsByDay(
      [
        chat('b', new Date(2026, 9, 28, 8)),
        chat('a', new Date(2026, 9, 28, 7)),
      ],
      now,
    );
    expect(groups).toEqual([
      {
        key: 'today',
        chats: [
          expect.objectContaining({ id: 'b' }),
          expect.objectContaining({ id: 'a' }),
        ],
      },
    ]);
  });
});
