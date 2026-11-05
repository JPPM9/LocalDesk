import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  migrate,
  openDatabase,
  SCHEMA_VERSION,
} from '../../src/main/db/database';
import {
  ChatRepository,
  type StoredFile,
} from '../../src/main/db/chat-repository';
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

describe('Bilder in Nachrichten', () => {
  const picture = (id: string, name: string, fill: number, length = 5) => ({
    id,
    name,
    mime: 'image/jpeg' as const,
    data: new Uint8Array(length).fill(fill),
  });
  const imageCount = () =>
    (
      db.prepare('SELECT COUNT(*) AS n FROM message_images').get() as {
        n: number;
      }
    ).n;

  beforeEach(() => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.appendMessage('c1', userMessage('u1', 'Was ist das?'));
    repo.addImages('u1', [
      picture('img-b', 'zweites.jpg', 2),
      picture('img-a', 'erstes.jpg', 1, 7),
    ]);
    repo.appendMessage('c1', {
      ...answer('a1'),
      content: 'Eine Katze.',
      status: 'done',
    });
  });

  it('getChat liefert Name und Größe in der gespeicherten Reihenfolge – ohne die Bytes', () => {
    const [user, reply] = repo.getChat('c1')!.messages;
    expect(user.images).toEqual([
      { id: 'img-b', name: 'zweites.jpg', size: 5 },
      { id: 'img-a', name: 'erstes.jpg', size: 7 },
    ]);
    expect(JSON.stringify(user)).not.toContain('data');
    // Nachrichten ohne Bilder haben gar kein Feld.
    expect(reply).not.toHaveProperty('images');
  });

  it('getImage holt die Bytes eines Bildes', () => {
    const image = repo.getImage('img-a');
    expect(image).toMatchObject({ name: 'erstes.jpg', mime: 'image/jpeg' });
    expect([...image!.data]).toEqual(Array(7).fill(1));
    expect(repo.getImage('gibt-es-nicht')).toBeNull();
  });

  it('Bilder anderer Chats erscheinen nicht in diesem Chat', () => {
    repo.createChat({ id: 'c2', title: 'y', model: 'm' });
    repo.appendMessage('c2', userMessage('u2', 'Anderes'));
    repo.addImages('u2', [picture('img-x', 'fremd.jpg', 9)]);
    expect(repo.getChat('c1')!.messages[0].images).toHaveLength(2);
    expect(repo.getChat('c2')!.messages[0].images).toEqual([
      { id: 'img-x', name: 'fremd.jpg', size: 5 },
    ]);
  });

  it('„Bearbeiten“ (truncateFrom) löscht die Bilder der entfernten Nachrichten mit', () => {
    expect(imageCount()).toBe(2);
    repo.appendMessage('c1', { ...userMessage('u2', 'Noch eins') });
    repo.addImages('u2', [picture('img-c', 'drittes.jpg', 3)]);
    expect(imageCount()).toBe(3);
    expect(repo.truncateFrom('c1', 'u2')).toBe(true);
    expect(imageCount()).toBe(2);
    expect(repo.getImage('img-c')).toBeNull();
    // Bilder davor bleiben.
    expect(repo.getImage('img-a')).not.toBeNull();
    expect(repo.truncateFrom('c1', 'u1')).toBe(true);
    expect(imageCount()).toBe(0);
  });

  it('beim Löschen des Chats verschwinden die Bilder', () => {
    repo.deleteChat('c1');
    expect(imageCount()).toBe(0);
    expect(repo.getImage('img-a')).toBeNull();
  });

  it('dieselbe Bild-Kennung geht nicht zweimal', () => {
    repo.appendMessage('c1', userMessage('u2', 'Noch eins'));
    expect(() =>
      repo.addImages('u2', [picture('img-a', 'doppelt.jpg', 1)]),
    ).toThrow();
  });

  it('bringt eine Datenbank von vor den Bildern ohne Datenverlust auf den neuen Stand', () => {
    const old = new DatabaseSync(':memory:');
    migrate(old, 19);
    old.exec('PRAGMA foreign_keys = ON');
    old
      .prepare(
        "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES ('alt', 'Alt', 'm', 1, 1)",
      )
      .run();
    old
      .prepare(
        `INSERT INTO messages (id, chat_id, position, role, content, thinking, status, created_at)
         VALUES ('m1', 'alt', 0, 'user', 'Hallo', '', 'done', 1)`,
      )
      .run();
    migrate(old);
    const alt = new ChatRepository(old);
    expect(alt.getChat('alt')!.messages[0]).toMatchObject({ content: 'Hallo' });
    expect(alt.getChat('alt')!.messages[0]).not.toHaveProperty('images');
    alt.addImages('m1', [picture('img-1', 'a.jpg', 1)]);
    expect(alt.getChat('alt')!.messages[0].images).toHaveLength(1);
  });
});

describe('Dateien in Nachrichten', () => {
  const file = (
    id: string,
    name: string,
    text: string,
    pages?: number,
  ): StoredFile => ({
    id,
    name,
    kind: pages ? 'pdf' : 'text',
    text,
    ...(pages !== undefined && { pages }),
  });
  const fileCount = () =>
    (
      db.prepare('SELECT COUNT(*) AS n FROM message_files').get() as {
        n: number;
      }
    ).n;

  beforeEach(() => {
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.appendMessage('c1', userMessage('u1', 'Fasse zusammen.'));
    repo.addFiles('u1', [
      file('f-zwei', 'zweite.txt', 'Zweiter Text'),
      file('f-eins', 'erste.pdf', '[Seite 1]\nErster Text', 3),
    ]);
    repo.appendMessage('c1', {
      ...answer('a1'),
      content: 'Zusammenfassung.',
      status: 'done',
    });
  });

  it('getChat liefert Name, Art, Länge und Seiten in der gespeicherten Reihenfolge – ohne den Text', () => {
    const [user, reply] = repo.getChat('c1')!.messages;
    expect(user.files).toEqual([
      { id: 'f-zwei', name: 'zweite.txt', kind: 'text', chars: 12 },
      { id: 'f-eins', name: 'erste.pdf', kind: 'pdf', chars: 21, pages: 3 },
    ]);
    expect(JSON.stringify(user)).not.toContain('Zweiter Text');
    expect(reply).not.toHaveProperty('files');
  });

  it('getFile holt den gelesenen Text einer Datei', () => {
    expect(repo.getFile('f-eins')).toEqual({
      name: 'erste.pdf',
      kind: 'pdf',
      text: '[Seite 1]\nErster Text',
      chars: 21,
      pages: 3,
    });
    expect(repo.getFile('f-zwei')).not.toHaveProperty('pages');
    expect(repo.getFile('gibt-es-nicht')).toBeNull();
  });

  it('Dateien anderer Chats erscheinen nicht in diesem Chat', () => {
    repo.createChat({ id: 'c2', title: 'y', model: 'm' });
    repo.appendMessage('c2', userMessage('u2', 'Anderes'));
    repo.addFiles('u2', [file('f-fremd', 'fremd.txt', 'Fremd')]);
    expect(repo.getChat('c1')!.messages[0].files).toHaveLength(2);
    expect(repo.getChat('c2')!.messages[0].files).toEqual([
      { id: 'f-fremd', name: 'fremd.txt', kind: 'text', chars: 5 },
    ]);
  });

  it('„Bearbeiten“ (truncateFrom) und Chat löschen nehmen die Dateien mit', () => {
    repo.appendMessage('c1', userMessage('u2', 'Noch eine'));
    repo.addFiles('u2', [file('f-drei', 'dritte.txt', 'Dritter Text')]);
    expect(fileCount()).toBe(3);
    expect(repo.truncateFrom('c1', 'u2')).toBe(true);
    expect(fileCount()).toBe(2);
    expect(repo.getFile('f-drei')).toBeNull();
    expect(repo.getFile('f-eins')).not.toBeNull();
    repo.deleteChat('c1');
    expect(fileCount()).toBe(0);
  });

  it('dieselbe Datei-Kennung geht nicht zweimal', () => {
    repo.appendMessage('c1', userMessage('u2', 'Noch eine'));
    expect(() =>
      repo.addFiles('u2', [file('f-eins', 'doppelt.txt', 'x')]),
    ).toThrow();
  });

  it('Bilder und Dateien einer Nachricht stören sich nicht', () => {
    repo.addImages('u1', [
      {
        id: 'img-a',
        name: 'a.jpg',
        mime: 'image/jpeg',
        data: new Uint8Array(4),
      },
    ]);
    const [user] = repo.getChat('c1')!.messages;
    expect(user.images).toHaveLength(1);
    expect(user.files).toHaveLength(2);
  });

  it('bringt eine Datenbank von vor den Dateien ohne Datenverlust auf den neuen Stand', () => {
    const old = new DatabaseSync(':memory:');
    migrate(old, 20);
    old.exec('PRAGMA foreign_keys = ON');
    old
      .prepare(
        "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES ('alt', 'Alt', 'm', 1, 1)",
      )
      .run();
    old
      .prepare(
        `INSERT INTO messages (id, chat_id, position, role, content, thinking, status, created_at)
         VALUES ('m1', 'alt', 0, 'user', 'Hallo', '', 'done', 1)`,
      )
      .run();
    migrate(old);
    const alt = new ChatRepository(old);
    expect(alt.getChat('alt')!.messages[0]).toMatchObject({ content: 'Hallo' });
    expect(alt.getChat('alt')!.messages[0]).not.toHaveProperty('files');
    alt.addFiles('m1', [file('f-1', 'a.txt', 'Text')]);
    expect(alt.getChat('alt')!.messages[0].files).toHaveLength(1);
  });
});

describe('Tool-Aufrufe', () => {
  const toolCall = {
    id: 'c1',
    round: 1,
    name: 'read_text_file',
    toolName: 'read_text_file',
    serverId: 's1',
    serverName: 'Notizen',
    arguments: { path: 'C:/notizen/ä.md' },
    status: 'running' as const,
  };

  it('speichert Aufrufe mit der Antwort', () => {
    repo.createChat({ id: 'c', title: 'T', model: 'qwen3:14b' });
    repo.appendMessage('c', answer('r1'));
    repo.updateMessage('r1', {
      content: 'Fertig',
      thinking: '',
      status: 'done',
      toolCalls: [{ ...toolCall, status: 'done', result: 'Inhalt' }],
    });
    expect(repo.getChat('c')?.messages[0].toolCalls).toEqual([
      { ...toolCall, status: 'done', result: 'Inhalt' },
    ]);
  });

  it('zeigt nach einem Absturz laufende Aufrufe als abgebrochen', () => {
    repo.createChat({ id: 'c', title: 'T', model: 'qwen3:14b' });
    repo.appendMessage('c', { ...answer('r1'), toolCalls: [toolCall] });
    repo.markInterrupted();
    expect(repo.getChat('c')?.messages[0].toolCalls?.[0].status).toBe(
      'cancelled',
    );
  });

  it('lässt Nachrichten ohne Aufrufe ohne toolCalls', () => {
    repo.createChat({ id: 'c', title: 'T', model: 'qwen3:14b' });
    repo.appendMessage('c', answer('r1'));
    expect(repo.getChat('c')?.messages[0]).not.toHaveProperty('toolCalls');
  });
});

describe('Quellen aus dem Wissen', () => {
  const source = {
    n: 1,
    collectionId: 'k',
    collectionName: 'Verträge',
    documentId: 'd1',
    path: 'C:\docs\mietvertrag.md',
    text: 'Die Kündigungsfrist beträgt drei Monate.',
    score: 0.76,
  };

  it('speichert Quellen und einen Suchfehler mit der Antwort', () => {
    repo.createChat({ id: 'c', title: 'T', model: 'qwen3:14b' });
    repo.appendMessage('c', answer('r1'));
    repo.appendMessage('c', answer('r2'));
    repo.updateMessage('r1', {
      content: 'A',
      thinking: '',
      status: 'done',
      sources: [source],
    });
    repo.updateMessage('r2', {
      content: 'B',
      thinking: '',
      status: 'done',
      sources: [],
      knowledgeError: 'Embedding-Modell fehlt',
    });
    const [first, second] = repo.getChat('c')!.messages;
    expect(first.sources).toEqual([source]);
    expect(first).not.toHaveProperty('knowledgeError');
    expect(second).toMatchObject({
      sources: [],
      knowledgeError: 'Embedding-Modell fehlt',
    });
  });

  it('lässt Antworten ohne Wissenssuche ohne sources', () => {
    repo.createChat({ id: 'c', title: 'T', model: 'qwen3:14b' });
    repo.appendMessage('c', answer('r1'));
    expect(repo.getChat('c')!.messages[0]).not.toHaveProperty('sources');
  });
});

describe('Zusammenfassung merken', () => {
  it('speichert die Nachrichtenzahl, ohne den Chat nach oben zu schieben', () => {
    let time = 1000;
    const repo = new ChatRepository(openDatabase(':memory:'), () => time);
    repo.createChat({ id: 'c', title: 'T', model: 'm', settings: {} });
    for (const id of ['u1', 'a1', 'u2']) {
      repo.appendMessage('c', {
        id,
        role: id.startsWith('u') ? 'user' : 'assistant',
        content: 'x',
        thinking: '',
        status: 'done',
      });
    }
    expect(repo.getChat('c')?.summaryAtCount).toBeUndefined();
    const before = repo.getChat('c')!.updatedAt;
    time = 99_999;
    repo.markSummarized('c');
    expect(repo.getChat('c')?.summaryAtCount).toBe(3);
    expect(repo.getChat('c')?.updatedAt).toBe(before);
  });
});
