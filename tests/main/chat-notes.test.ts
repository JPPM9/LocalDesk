import { describe, expect, it } from 'vitest';
import type { ChatDetail, MessageRecord } from '../../src/shared/api';
import { formatChatNote } from '../../src/main/obsidian/chat-notes';

const msg = (
  id: string,
  role: 'user' | 'assistant',
  content: string,
  extra: Partial<MessageRecord> = {},
): MessageRecord => ({
  id,
  role,
  content,
  thinking: role === 'assistant' ? 'geheime Gedanken' : '',
  status: 'done',
  ...(role === 'assistant' && { model: 'gemma4:12b' }),
  ...extra,
});

const chat: ChatDetail = {
  id: 'c1',
  title: 'Median',
  model: 'gemma4:12b',
  updatedAt: 0,
  settings: {},
  messages: [
    msg('u1', 'user', 'Was ist ein Median?'),
    msg('a1', 'assistant', 'Der mittlere Wert [1].', {
      sources: [
        {
          n: 1,
          collectionId: 'k',
          collectionName: 'Studium',
          documentId: 'd',
          path: 'C:/Studium/Median.md',
          heading: 'Median › Definition',
          page: 3,
          text: '…',
          score: 0.8,
        },
      ],
    }),
    msg('u2', 'user', 'Und der Mittelwert?'),
    msg('a2', 'assistant', 'Die Summe durch die Anzahl.', {
      model: 'qwen3:14b',
    }),
  ],
};
const date = new Date(2026, 9, 27, 23, 30); // lokale Zeit, nach Mitternacht UTC egal

describe('formatChatNote', () => {
  it('speichert den ganzen Chat mit Kopf, Fragen, Antworten und Quellen', () => {
    const note = formatChatNote(chat, date, { projectName: 'Klausur "A"' })!;
    expect(note.title).toBe('2026-10-27 Median');
    expect(note.content).toContain('tags: [localdesk/chat]');
    expect(note.content).toContain('erstellt: 2026-10-27');
    expect(note.content).toContain('modell: "gemma4:12b, qwen3:14b"');
    expect(note.content).toContain('projekt: "Klausur \\"A\\""');
    expect(note.content).toContain('chat-id: c1');
    expect(note.content).toContain('## Frage\n\nWas ist ein Median?');
    expect(note.content).toContain('## Antwort (qwen3:14b)');
    expect(note.content).toContain(
      '1. Studium: C:/Studium/Median.md (S. 3, Median › Definition)',
    );
    expect(note.content).not.toContain('geheime Gedanken');
  });

  it('lässt das „…“ gekürzter Titel im Dateinamen weg', () => {
    const note = formatChatNote({ ...chat, title: 'Was ist ein M…' }, date)!;
    expect(note.title).toBe('2026-10-27 Was ist ein M');
    expect(note.content).toContain('# Was ist ein M…');
  });

  it('speichert eine Antwort mit ihrer Frage', () => {
    const note = formatChatNote(chat, date, { answerId: 'a2' })!;
    expect(note.content).toContain('Und der Mittelwert?');
    expect(note.content).toContain('Die Summe durch die Anzahl.');
    expect(note.content).not.toContain('Was ist ein Median?');
    expect(note.content).not.toContain('projekt:');
  });

  it('lässt leere Antworten weg und liefert null ohne Antwort', () => {
    const empty: ChatDetail = {
      ...chat,
      messages: [msg('u1', 'user', 'Hallo'), msg('a1', 'assistant', '')],
    };
    expect(formatChatNote(empty, date)).toBeNull();
    expect(formatChatNote(chat, date, { answerId: 'u1' })).toBeNull();
    expect(
      formatChatNote(chat, date, { answerId: 'gibt-es-nicht' }),
    ).toBeNull();
  });
});
