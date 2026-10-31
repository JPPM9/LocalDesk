import { describe, expect, it } from 'vitest';
import type { MessageRecord } from '../../src/shared/api';
import type { ChatCompaction } from '../../src/shared/compaction';
import { ChatRepository } from '../../src/main/db/chat-repository';
import {
  migrate,
  openDatabase,
  SCHEMA_VERSION,
} from '../../src/main/db/database';
import { DatabaseSync } from 'node:sqlite';

const message = (
  id: string,
  role: 'user' | 'assistant',
  content: string,
): MessageRecord => ({ id, role, content, thinking: '', status: 'done' });

const compaction = (upTo: string): ChatCompaction => ({
  summary: 'Der Hund heißt Bello.',
  upToMessageId: upTo,
  messagesCovered: 2,
  tokensBefore: 900,
  tokensAfter: 200,
  createdAt: 42,
});

function chatWith(...messages: MessageRecord[]) {
  const repo = new ChatRepository(openDatabase(':memory:'));
  repo.createChat({ id: 'c1', title: 'Test', model: 'm' });
  for (const m of messages) repo.appendMessage('c1', m);
  return repo;
}

const four = () =>
  chatWith(
    message('u1', 'user', 'Frage 1'),
    message('a1', 'assistant', 'Antwort 1'),
    message('u2', 'user', 'Frage 2'),
    message('a2', 'assistant', 'Antwort 2'),
  );

describe('Verdichtung speichern', () => {
  it('speichert und liest sie mit dem Chat, ohne die Nachrichten zu ändern', () => {
    const repo = four();
    expect(repo.getChat('c1')?.compaction).toBeUndefined();
    repo.setCompaction('c1', compaction('a1'));
    const chat = repo.getChat('c1')!;
    expect(chat.compaction).toEqual(compaction('a1'));
    expect(chat.messages.map((m) => m.id)).toEqual(['u1', 'a1', 'u2', 'a2']);
  });

  it('ändert den Zeitpunkt des Chats nicht (die Liste springt nicht nach oben)', () => {
    const repo = four();
    const before = repo.getChat('c1')!.updatedAt;
    repo.setCompaction('c1', compaction('a1'));
    expect(repo.getChat('c1')!.updatedAt).toBe(before);
  });

  it('lässt sich aufheben', () => {
    const repo = four();
    repo.setCompaction('c1', compaction('a1'));
    repo.setCompaction('c1', null);
    expect(repo.getChat('c1')?.compaction).toBeUndefined();
  });

  it('ignoriert kaputte Einträge in der Datenbank', () => {
    const db = openDatabase(':memory:');
    const repo = new ChatRepository(db);
    repo.createChat({ id: 'c1', title: 'T', model: 'm' });
    db.prepare('UPDATE chats SET compaction_json = \'{"kaputt":1}\'').run();
    expect(repo.getChat('c1')?.compaction).toBeUndefined();
  });
});

describe('Verdichtung und „Bearbeiten/Wiederholen“', () => {
  it('bleibt, wenn nur Nachrichten nach der verdichteten wegfallen', () => {
    const repo = four();
    repo.setCompaction('c1', compaction('a1'));
    expect(repo.truncateFrom('c1', 'u2')).toBe(true);
    expect(repo.getChat('c1')?.compaction).toEqual(compaction('a1'));
  });

  it('fällt weg, wenn die verdichtete Nachricht (oder davor) gelöscht wird', () => {
    const repo = four();
    repo.setCompaction('c1', compaction('a1'));
    expect(repo.truncateFrom('c1', 'a1')).toBe(true);
    expect(repo.getChat('c1')?.compaction).toBeUndefined();

    const other = four();
    other.setCompaction('c1', compaction('a1'));
    expect(other.truncateFrom('c1', 'u1')).toBe(true);
    expect(other.getChat('c1')?.compaction).toBeUndefined();
  });

  it('berührt die Verdichtung anderer Chats nicht', () => {
    const repo = four();
    repo.createChat({ id: 'c2', title: 'Zwei', model: 'm' });
    repo.appendMessage('c2', message('x1', 'user', 'a'));
    repo.appendMessage('c2', message('x2', 'assistant', 'b'));
    repo.setCompaction('c2', compaction('x2'));
    repo.truncateFrom('c1', 'u1');
    expect(repo.getChat('c2')?.compaction).toEqual(compaction('x2'));
  });
});

describe('Datenbank-Umstellung 19', () => {
  it('fügt die Spalte einer älteren Datenbank hinzu, ohne etwas zu verlieren', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db, 18);
    db.prepare(
      "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES ('c1', 'Alt', 'm', 1, 1)",
    ).run();
    migrate(db);
    const repo = new ChatRepository(db);
    expect(repo.getChat('c1')?.title).toBe('Alt');
    repo.setCompaction('c1', compaction('x'));
    expect(repo.getChat('c1')?.compaction?.summary).toBe(
      'Der Hund heißt Bello.',
    );
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(19);
  });
});
