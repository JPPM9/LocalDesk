import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrate, openDatabase } from '../../src/main/db/database';
import { ChatRepository } from '../../src/main/db/chat-repository';
import type { MessageRecord } from '../../src/shared/api';
import { HIGHLIGHT_END, HIGHLIGHT_START } from '../../src/shared/search';

let repo: ChatRepository;

const message = (
  id: string,
  content: string,
  role: 'user' | 'assistant' = 'user',
): MessageRecord => ({ id, role, content, thinking: '', status: 'done' });

beforeEach(() => {
  repo = new ChatRepository(openDatabase(':memory:'));
  repo.createChat({ id: 'c1', title: 'Primzahlen in Python', model: 'm' });
  repo.appendMessage(
    'c1',
    message('m1', 'Wie prüfe ich, ob eine Zahl prim ist?'),
  );
  repo.appendMessage(
    'c1',
    message('m2', 'Teile durch alle Zahlen bis zur Wurzel.', 'assistant'),
  );
  repo.createChat({ id: 'c2', title: 'Reise nach Köln', model: 'm' });
  repo.appendMessage(
    'c2',
    message('m3', 'Was kann ich in Köln am Wochenende machen?'),
  );
});

const hitIds = (input: string) =>
  repo.search(input).hits.map((h) => h.messageId);

describe('Volltextsuche', () => {
  it('findet Wörter unabhängig von Groß- und Kleinschreibung', () => {
    expect(hitIds('WURZEL')).toEqual(['m2']);
  });

  it('findet Wortanfänge', () => {
    expect(hitIds('wurz')).toEqual(['m2']);
    expect(hitIds('Wochen')).toEqual(['m3']);
  });

  it('findet Umlaute auch ohne Punkte', () => {
    expect(hitIds('koln')).toEqual(['m3']);
    expect(hitIds('Köln')).toEqual(['m3']);
    expect(hitIds('prufe')).toEqual(['m1']);
  });

  it('verlangt, dass alle Wörter vorkommen', () => {
    expect(hitIds('Köln Wochenende')).toEqual(['m3']);
    expect(hitIds('Köln Wurzel')).toEqual([]);
  });

  it('markiert den Treffer im Textausschnitt und nennt den Chat', () => {
    const [hit] = repo.search('Wurzel').hits;
    expect(hit).toMatchObject({
      chatId: 'c1',
      chatTitle: 'Primzahlen in Python',
      role: 'assistant',
    });
    expect(hit.snippet).toContain(`${HIGHLIGHT_START}Wurzel${HIGHLIGHT_END}`);
  });

  it('findet Chats über ihren Titel', () => {
    expect(repo.search('python').chats.map((c) => c.id)).toEqual(['c1']);
    expect(repo.search('KÖLN reise').chats.map((c) => c.id)).toEqual(['c2']);
  });

  it('kommt mit Sonderzeichen und FTS-Befehlswörtern klar', () => {
    for (const input of [
      '"',
      'C++',
      'a OR b',
      'NEAR(',
      '*',
      '-Köln',
      'prim"*',
    ]) {
      expect(() => repo.search(input)).not.toThrow();
    }
    expect(repo.search('   ')).toEqual({ chats: [], hits: [] });
  });

  it('hält den Index aktuell, wenn eine Antwort weiterläuft', () => {
    repo.appendMessage('c1', {
      ...message('m4', '', 'assistant'),
      status: 'streaming',
    });
    expect(hitIds('Sieb')).toEqual([]);

    repo.updateMessage('m4', {
      content: 'Alternativ: das Sieb des Eratosthenes.',
      thinking: '',
      status: 'done',
    });
    expect(hitIds('Sieb')).toEqual(['m4']);
    expect(hitIds('Eratosthenes')).toEqual(['m4']);
  });

  it('entfernt Treffer, wenn ein Chat gelöscht wird', () => {
    repo.deleteChat('c2');
    expect(hitIds('Köln')).toEqual([]);
  });

  it('nimmt beim Update bereits vorhandene Nachrichten in den Index auf', () => {
    const old = new DatabaseSync(':memory:');
    migrate(old, 3); // Stand vor der Suche
    old.exec(`
      INSERT INTO chats (id, title, model, created_at, updated_at)
        VALUES ('alt', 'Alter Chat', 'm', 1, 1);
      INSERT INTO messages (id, chat_id, position, role, content, status, created_at)
        VALUES ('x', 'alt', 0, 'user', 'Eine alte Nachricht über Kaffee', 'done', 1);
    `);

    migrate(old);

    expect(
      new ChatRepository(old).search('Kaffee').hits.map((h) => h.messageId),
    ).toEqual(['x']);
  });
});
