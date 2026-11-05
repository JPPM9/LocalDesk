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

describe('toRequestMessages mit Dateien', () => {
  const doc = (id: string, name = `${id}.pdf`, chars = 100) => ({
    id,
    name,
    kind: 'pdf' as const,
    chars,
    pages: 2,
  });
  const withFiles = (
    id: string,
    content: string,
    ...files: ReturnType<typeof doc>[]
  ): MessageRecord => ({ ...user, id, content, files });
  const source = (texts: Record<string, string>) => ({
    vision: true,
    data: () => undefined,
    fileText: (id: string) => texts[id],
  });

  it('der Text der Datei steht als Block vor der Frage', () => {
    expect(
      toRequestMessages(
        [withFiles('u1', 'Fasse zusammen.', doc('a', 'bericht.pdf'))],
        source({ a: '[Seite 1]\nHallo' }),
      ),
    ).toEqual([
      {
        role: 'user',
        content:
          '[Datei: bericht.pdf]\n[Seite 1]\nHallo\n[Ende der Datei: bericht.pdf]\n\nFasse zusammen.',
      },
    ]);
  });

  it('mehrere Dateien einer Nachricht, getrennt durch eine Leerzeile', () => {
    const [message] = toRequestMessages(
      [withFiles('u1', 'Vergleiche.', doc('a', 'a.txt'), doc('b', 'b.txt'))],
      source({ a: 'AAA', b: 'BBB' }),
    );
    expect(message.content).toBe(
      '[Datei: a.txt]\nAAA\n[Ende der Datei: a.txt]\n\n[Datei: b.txt]\nBBB\n[Ende der Datei: b.txt]\n\nVergleiche.',
    );
  });

  it('eine Nachricht nur mit Datei geht mit (ohne Frage)', () => {
    expect(
      toRequestMessages(
        [withFiles('u1', '', doc('a', 'a.txt'))],
        source({ a: 'AAA' }),
      ),
    ).toEqual([
      { role: 'user', content: '[Datei: a.txt]\nAAA\n[Ende der Datei: a.txt]' },
    ]);
  });

  it('nur die letzten 3 Dateien des Verlaufs gehen mit, ältere werden zum Hinweis', () => {
    const history: MessageRecord[] = [
      withFiles('u1', 'Erst', doc('a', 'a.txt'), doc('b', 'b.txt')),
      { ...answer, id: 'r1', content: 'Ok', status: 'done' },
      withFiles('u2', 'Dann', doc('c', 'c.txt'), doc('d', 'd.txt')),
    ];
    const result = toRequestMessages(
      history,
      source({ a: 'AAA', b: 'BBB', c: 'CCC', d: 'DDD' }),
    );
    expect(result[0].content).toBe(
      '[Datei: a.txt – nicht mehr im Kontext]\n\n[Datei: b.txt]\nBBB\n[Ende der Datei: b.txt]\n\nErst',
    );
    expect(result[2].content).toContain('[Datei: c.txt]\nCCC');
    expect(result[2].content).toContain('[Datei: d.txt]\nDDD');
  });

  it('fehlt der Text einer Datei, bleibt der Hinweis', () => {
    expect(
      toRequestMessages([withFiles('u1', 'Hi', doc('a', 'a.txt'))], source({})),
    ).toEqual([
      { role: 'user', content: '[Datei: a.txt – nicht mehr im Kontext]\n\nHi' },
    ]);
  });

  it('ohne Quelle (z. B. beim Zählen) geht kein Text mit – nur der Hinweis', () => {
    expect(
      toRequestMessages([withFiles('u1', 'Hi', doc('a', 'a.txt'))]),
    ).toEqual([{ role: 'user', content: '[Datei: a.txt]\n\nHi' }]);
  });

  it('Dateien und Bilder zusammen: Dateien zuerst, dann Bild-Hinweis, dann die Frage', () => {
    const message: MessageRecord = {
      ...user,
      id: 'u1',
      content: 'Was ist das?',
      files: [doc('a', 'a.txt')],
      images: [{ id: 'i', name: 'foto.jpg', size: 1 }],
    };
    const [result] = toRequestMessages([message], {
      vision: false,
      data: () => undefined,
      fileText: () => 'AAA',
    });
    expect(result.content).toBe(
      '[Datei: a.txt]\nAAA\n[Ende der Datei: a.txt]\n\n[Bild: foto.jpg]\nWas ist das?',
    );
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
