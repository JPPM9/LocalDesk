import { describe, expect, it } from 'vitest';
import type { MessageRecord } from '../../src/shared/api';
import { titleFromMessage, toRequestMessages } from '../../src/shared/chat';

const user: MessageRecord = {
  id: 'u1',
  role: 'user',
  content: 'Hallo',
  thinking: '',
  status: 'done',
};
const answer: MessageRecord = {
  id: 'r1',
  role: 'assistant',
  content: '',
  thinking: '',
  status: 'streaming',
  model: 'qwen3:14b',
};

describe('toRequestMessages', () => {
  it('schickt nur Rolle und Text, ohne Gedanken, Fehler oder leere Antworten', () => {
    const messages: MessageRecord[] = [
      user,
      { ...answer, content: 'Hallo!', thinking: 'geheim', status: 'done' },
      { ...user, id: 'u2', content: 'Und jetzt?' },
      { ...answer, id: 'r2', status: 'error', error: 'kaputt' },
      { ...answer, id: 'r3', content: '' },
    ];

    expect(toRequestMessages(messages)).toEqual([
      { role: 'user', content: 'Hallo' },
      { role: 'assistant', content: 'Hallo!' },
      { role: 'user', content: 'Und jetzt?' },
    ]);
  });

  it('behält abgebrochene Antworten mit Text als Kontext', () => {
    const messages: MessageRecord[] = [
      user,
      { ...answer, content: 'Teil', status: 'aborted' },
    ];
    expect(toRequestMessages(messages)).toHaveLength(2);
  });
});

describe('titleFromMessage', () => {
  it('nimmt die erste Zeile', () => {
    expect(titleFromMessage('  Primzahlen in Python\nmit Erklärung')).toBe(
      'Primzahlen in Python',
    );
  });

  it('kürzt lange Titel mit Auslassungszeichen', () => {
    const title = titleFromMessage('a'.repeat(100));
    expect(title).toHaveLength(60);
    expect(title.endsWith('…')).toBe(true);
  });
});
