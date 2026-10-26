import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  migrate,
  openDatabase,
  SCHEMA_VERSION,
} from '../../src/main/db/database';
import { ChatRepository } from '../../src/main/db/chat-repository';
import type { MessageRecord } from '../../src/shared/api';

// Jeder Test bekommt eine frische Datenbank im Arbeitsspeicher und eine
// steuerbare Uhr, damit Zeitstempel vorhersagbar sind.
let db: DatabaseSync;
let clock: number;
let repo: ChatRepository;

beforeEach(() => {
  db = openDatabase(':memory:');
  clock = 1_000;
  repo = new ChatRepository(db, () => clock);
});

const userMessage = (id: string, content: string): MessageRecord => ({
  id,
  role: 'user',
  content,
  thinking: '',
  status: 'done',
});

const answer = (id: string, model = 'qwen3:14b'): MessageRecord => ({
  id,
  role: 'assistant',
  content: '',
  thinking: '',
  status: 'streaming',
  model,
});

describe('Datenbank-Migrationen', () => {
  it('setzt die Schema-Version und läuft beim zweiten Mal nicht erneut', () => {
    const { user_version } = db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    expect(user_version).toBe(SCHEMA_VERSION);
    expect(() => migrate(db)).not.toThrow();
  });

  it('bringt eine Datenbank aus Phase 1 ohne Datenverlust auf den neuen Stand', () => {
    const old = new DatabaseSync(':memory:');
    migrate(old, 1); // Stand von Phase 1: noch keine Einstellungen
    old
      .prepare(
        "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES ('alt', 'Alter Chat', 'm', 1, 1)",
      )
      .run();

    migrate(old);

    const chat = new ChatRepository(old).getChat('alt');
    expect(chat?.title).toBe('Alter Chat');
    expect(chat?.settings).toEqual({});
  });
});

describe('Chat-Einstellungen', () => {
  it('speichert Einstellungen beim Anlegen und beim Ändern', () => {
    repo.createChat({
      id: 'c1',
      title: 'x',
      model: 'm',
      settings: { systemPrompt: 'Sei knapp.', contextLength: 8192 },
    });
    expect(repo.getChat('c1')?.settings).toEqual({
      systemPrompt: 'Sei knapp.',
      contextLength: 8192,
    });

    repo.updateSettings('c1', { temperature: 0.2, think: 'low' });
    expect(repo.getChat('c1')?.settings).toEqual({
      temperature: 0.2,
      think: 'low',
    });
  });

  it('prüft Werte auch beim Speichern', () => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.updateSettings('c1', { temperature: 99 } as never);
    expect(repo.getChat('c1')?.settings).toEqual({ temperature: 2 });
  });

  it('übersteht kaputtes JSON in der Datenbank', () => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    db.prepare(
      "UPDATE chats SET settings_json = '{kaputt' WHERE id = 'c1'",
    ).run();
    expect(repo.getChat('c1')?.settings).toEqual({});
  });
});

describe('ChatRepository', () => {
  it('legt einen Chat an und liest ihn mit Nachrichten in Reihenfolge', () => {
    repo.createChat({ id: 'c1', title: 'Primzahlen', model: 'gemma4:12b' });
    repo.appendMessage('c1', userMessage('m1', 'Ist 7 prim?'));
    repo.appendMessage('c1', answer('m2'));

    const chat = repo.getChat('c1');
    expect(chat?.title).toBe('Primzahlen');
    expect(chat?.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(chat?.messages[1]).toMatchObject({
      role: 'assistant',
      status: 'streaming',
    });
  });

  it('merkt sich das zuletzt benutzte Modell eines Chats', () => {
    repo.createChat({ id: 'c1', title: 'x', model: 'gemma4:12b' });
    repo.appendMessage('c1', answer('m1', 'gpt-oss:20b'));
    expect(repo.getChat('c1')?.model).toBe('gpt-oss:20b');
  });

  it('speichert Antwort, Gedanken, Status und Statistik', () => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.appendMessage('c1', answer('a1'));
    const stats = {
      outputTokens: 3,
      tokensPerSecond: 37.4,
      promptTokens: 22,
      totalMs: 2638,
    };

    repo.updateMessage('a1', {
      content: 'Ja.',
      thinking: 'Hm',
      status: 'done',
      stats,
    });

    expect(repo.getChat('c1')?.messages[0]).toEqual({
      id: 'a1',
      role: 'assistant',
      content: 'Ja.',
      thinking: 'Hm',
      status: 'done',
      model: 'qwen3:14b',
      error: undefined,
      stats,
    });
  });

  it('sortiert die Liste nach der letzten Nachricht', () => {
    repo.createChat({ id: 'alt', title: 'Alt', model: 'm' });
    clock = 2_000;
    repo.createChat({ id: 'neu', title: 'Neu', model: 'm' });
    clock = 3_000;
    repo.appendMessage('alt', userMessage('m1', 'wieder da'));

    expect(repo.listChats().map((c) => c.id)).toEqual(['alt', 'neu']);
    expect(repo.listChats()[0].updatedAt).toBe(3_000);
  });

  it('benennt um und löscht samt Nachrichten', () => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.appendMessage('c1', userMessage('m1', 'Hallo'));

    repo.renameChat('c1', 'Neuer Name');
    expect(repo.getChat('c1')?.title).toBe('Neuer Name');

    repo.deleteChat('c1');
    expect(repo.getChat('c1')).toBeNull();
    expect(repo.chatExists('c1')).toBe(false);
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM messages').get() as {
      n: number;
    };
    expect(n).toBe(0);
  });

  it('markiert beim Start noch laufende Antworten als abgebrochen', () => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.appendMessage('c1', answer('a1'));

    expect(repo.markInterrupted()).toBe(1);
    expect(repo.getChat('c1')?.messages[0].status).toBe('aborted');
  });

  it('speichert Umlaute und Sonderzeichen unverändert', () => {
    repo.createChat({ id: 'c1', title: 'Grüße 🚀', model: 'm' });
    repo.appendMessage(
      'c1',
      userMessage('m1', "Straße; DROP TABLE chats; --'"),
    );
    expect(repo.getChat('c1')?.title).toBe('Grüße 🚀');
    expect(repo.getChat('c1')?.messages[0].content).toBe(
      "Straße; DROP TABLE chats; --'",
    );
  });
});
