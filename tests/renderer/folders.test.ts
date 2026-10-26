import { describe, expect, it } from 'vitest';
import type { ChatSummary } from '../../src/shared/api';
import { groupChatsByFolder } from '../../src/renderer/chat/folders';

const chat = (id: string, folderId?: string): ChatSummary => ({
  id,
  title: id,
  model: 'm',
  updatedAt: 0,
  ...(folderId && { folderId }),
});

describe('groupChatsByFolder', () => {
  it('ordnet Chats ihren Ordnern zu und behält die Reihenfolge', () => {
    const folders = [
      { id: 'a', name: 'Arbeit' },
      { id: 's', name: 'Studium' },
    ];
    const result = groupChatsByFolder(
      [chat('neu', 's'), chat('lose'), chat('mittel', 'a'), chat('alt', 's')],
      folders,
    );
    expect(
      result.groups.map((g) => [g.folder.name, g.chats.map((c) => c.id)]),
    ).toEqual([
      ['Arbeit', ['mittel']],
      ['Studium', ['neu', 'alt']],
    ]);
    expect(result.unfiled.map((c) => c.id)).toEqual(['lose']);
  });

  it('zeigt leere Ordner und legt Chats mit unbekanntem Ordner zu „ohne Ordner“', () => {
    const result = groupChatsByFolder(
      [chat('x', 'geloescht')],
      [{ id: 'leer', name: 'Leer' }],
    );
    expect(result.groups[0].chats).toEqual([]);
    expect(result.unfiled.map((c) => c.id)).toEqual(['x']);
  });
});
