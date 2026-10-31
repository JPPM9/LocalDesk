import { describe, expect, it } from 'vitest';
import type { MessageRecord } from '../../src/shared/api';
import { ChatRepository } from '../../src/main/db/chat-repository';
import { openDatabase } from '../../src/main/db/database';

const message = (
  id: string,
  role: 'user' | 'assistant',
  content: string,
  status: MessageRecord['status'] = 'done',
): MessageRecord => ({ id, role, content, thinking: '', status });

function chatWith(...messages: MessageRecord[]) {
  const repo = new ChatRepository(openDatabase(':memory:'));
  repo.createChat({ id: 'c1', title: 'Test', model: 'm' });
  repo.createChat({ id: 'c2', title: 'Anderer', model: 'm' });
  for (const m of messages) repo.appendMessage('c1', m);
  repo.appendMessage('c2', message('x1', 'user', 'bleibt'));
  return repo;
}

const ids = (repo: ChatRepository, chat = 'c1') =>
  repo.getChat(chat)?.messages.map((m) => m.id);

describe('ChatRepository.truncateFrom', () => {
  it('löscht die Nachricht und alles danach', () => {
    const repo = chatWith(
      message('u1', 'user', 'Frage 1'),
      message('a1', 'assistant', 'Antwort 1'),
      message('u2', 'user', 'Frage 2'),
      message('a2', 'assistant', 'Antwort 2'),
    );
    expect(repo.truncateFrom('c1', 'u2')).toBe(true);
    expect(ids(repo)).toEqual(['u1', 'a1']);
    // Andere Chats bleiben unberührt.
    expect(ids(repo, 'c2')).toEqual(['x1']);
  });

  it('danach geht es ganz normal weiter (neue Nachrichten hinten dran)', () => {
    const repo = chatWith(
      message('u1', 'user', 'Frage'),
      message('a1', 'assistant', 'Antwort'),
    );
    expect(repo.truncateFrom('c1', 'u1')).toBe(true);
    expect(ids(repo)).toEqual([]);
    repo.appendMessage('c1', message('u3', 'user', 'Neu'));
    repo.appendMessage('c1', message('a3', 'assistant', 'Neue Antwort'));
    expect(ids(repo)).toEqual(['u3', 'a3']);
  });

  it('die Volltextsuche findet gelöschte Nachrichten nicht mehr', () => {
    const repo = chatWith(
      message('u1', 'user', 'Zebra im Zoo'),
      message('a1', 'assistant', 'Streifen'),
    );
    expect(repo.search('Zebra').hits).toHaveLength(1);
    repo.truncateFrom('c1', 'u1');
    expect(repo.search('Zebra').hits).toHaveLength(0);
  });

  it('läuft gerade eine Antwort, passiert nichts', () => {
    const repo = chatWith(
      message('u1', 'user', 'Frage'),
      message('a1', 'assistant', '', 'streaming'),
    );
    expect(repo.truncateFrom('c1', 'u1')).toBe(false);
    expect(ids(repo)).toEqual(['u1', 'a1']);
  });

  it('unbekannte Nachricht oder Nachricht aus einem anderen Chat: nichts', () => {
    const repo = chatWith(message('u1', 'user', 'Frage'));
    expect(repo.truncateFrom('c1', 'gibt-es-nicht')).toBe(false);
    expect(repo.truncateFrom('c1', 'x1')).toBe(false);
    expect(repo.truncateFrom('c2', 'u1')).toBe(false);
    expect(ids(repo)).toEqual(['u1']);
    expect(ids(repo, 'c2')).toEqual(['x1']);
  });

  it('der Merker für „Zusammenfassung vorschlagen“ liegt nie über der Nachrichtenzahl', () => {
    const repo = chatWith(
      message('u1', 'user', 'a'),
      message('a1', 'assistant', 'b'),
      message('u2', 'user', 'c'),
      message('a2', 'assistant', 'd'),
    );
    repo.markSummarized('c1');
    expect(repo.getChat('c1')?.summaryAtCount).toBe(4);
    repo.truncateFrom('c1', 'u2');
    expect(repo.getChat('c1')?.summaryAtCount).toBe(2);
  });
});
