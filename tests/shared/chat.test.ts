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

describe('toRequestMessages mit Bildern', () => {
  const photo = (id: string, name = `${id}.jpg`) => ({ id, name, size: 10 });
  const withImages = (
    id: string,
    content: string,
    ...images: ReturnType<typeof photo>[]
  ): MessageRecord => ({ ...user, id, content, images });
  const source = (vision: boolean) => ({
    vision,
    data: (id: string) => `base64-${id}`,
  });

  it('schickt Bilder als Base64 mit der Nachricht, wenn das Modell Bilder kann', () => {
    expect(
      toRequestMessages(
        [withImages('u1', 'Was ist das?', photo('a'), photo('b'))],
        source(true),
      ),
    ).toEqual([
      {
        role: 'user',
        content: 'Was ist das?',
        images: ['base64-a', 'base64-b'],
      },
    ]);
  });

  it('eine Nachricht nur mit Bild geht mit (leerer Text)', () => {
    expect(
      toRequestMessages([withImages('u1', '', photo('a'))], source(true)),
    ).toEqual([{ role: 'user', content: '', images: ['base64-a'] }]);
  });

  it('ohne Bild-Fähigkeit steht an der Stelle ein Text-Hinweis', () => {
    expect(
      toRequestMessages(
        [withImages('u1', 'Was ist das?', photo('a', 'urlaub.jpg'))],
        source(false),
      ),
    ).toEqual([{ role: 'user', content: '[Bild: urlaub.jpg]\nWas ist das?' }]);
    expect(
      toRequestMessages(
        [withImages('u1', '', photo('a', 'urlaub.jpg'))],
        source(false),
      ),
    ).toEqual([{ role: 'user', content: '[Bild: urlaub.jpg]' }]);
  });

  it('ohne Bild-Quelle (z. B. beim Zählen) gehen keine Bilder mit', () => {
    expect(toRequestMessages([withImages('u1', 'Hallo', photo('a'))])).toEqual([
      { role: 'user', content: '[Bild: a.jpg]\nHallo' },
    ]);
  });

  it('nur die letzten 4 Bilder des Verlaufs gehen mit, ältere werden zum Hinweis', () => {
    const history: MessageRecord[] = [
      withImages('u1', 'Erst', photo('a'), photo('b')),
      { ...answer, id: 'r1', content: 'Ok', status: 'done' },
      withImages('u2', 'Dann', photo('c'), photo('d'), photo('e')),
    ];
    const result = toRequestMessages(history, source(true));
    expect(result[0]).toEqual({
      role: 'user',
      content: '[Bild: a.jpg]\nErst',
      images: ['base64-b'],
    });
    expect(result[2]).toEqual({
      role: 'user',
      content: 'Dann',
      images: ['base64-c', 'base64-d', 'base64-e'],
    });
  });

  it('fehlen die Bytes eines Bildes, bleibt der Hinweis', () => {
    expect(
      toRequestMessages([withImages('u1', 'Hi', photo('a'))], {
        vision: true,
        data: () => undefined,
      }),
    ).toEqual([{ role: 'user', content: '[Bild: a.jpg]\nHi' }]);
  });

  it('Nachrichten ohne Bilder bleiben unverändert', () => {
    expect(toRequestMessages([user], source(true))).toEqual([
      { role: 'user', content: 'Hallo' },
    ]);
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
