import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrate, openDatabase } from '../../src/main/db/database';
import { ChatRepository } from '../../src/main/db/chat-repository';
import { FolderRepository } from '../../src/main/db/folder-repository';
import { KnowledgeRepository } from '../../src/main/db/knowledge-repository';

let chats: ChatRepository;
let folders: FolderRepository;
let nextId: number;

beforeEach(() => {
  const db = openDatabase(':memory:');
  nextId = 1;
  chats = new ChatRepository(db);
  folders = new FolderRepository(
    db,
    () => 1_000,
    () => `f${nextId++}`,
  );
  chats.createChat({ id: 'c1', title: 'Python-Fragen', model: 'm' });
  chats.createChat({ id: 'c2', title: 'Urlaub', model: 'm' });
});

const folderOf = (chatId: string) =>
  chats.listChats().find((c) => c.id === chatId)?.folderId;

describe('Ordner', () => {
  it('legt Ordner an und sortiert sie nach deutschen Regeln', () => {
    folders.createFolder('Studium');
    folders.createFolder(' Übungen ');
    folders.createFolder('arbeit');
    expect(folders.listFolders().map((f) => f.name)).toEqual([
      'arbeit',
      'Studium',
      'Übungen',
    ]);
  });

  it('lehnt leere Namen ab', () => {
    expect(folders.createFolder('   ')).toMatchObject({ ok: false });
    expect(folders.createFolder(42)).toMatchObject({ ok: false });
    expect(folders.listFolders()).toEqual([]);
  });

  it('legt Chats in Ordner und nimmt sie wieder heraus', () => {
    const result = folders.createFolder('Coding');
    if (!result.ok) throw new Error(result.error);

    expect(chats.moveChat('c1', result.value.id)).toBe(true);
    expect(folderOf('c1')).toBe('f1');
    expect(folderOf('c2')).toBeUndefined();
    expect(chats.getChat('c1')?.folderId).toBe('f1');

    chats.moveChat('c1', null);
    expect(folderOf('c1')).toBeUndefined();
  });

  it('lehnt einen Ordner ab, den es nicht gibt', () => {
    expect(chats.moveChat('c1', 'gibtsnicht')).toBe(false);
    expect(folderOf('c1')).toBeUndefined();
  });

  it('benennt um', () => {
    folders.createFolder('Alt');
    expect(folders.renameFolder('f1', 'Neu')).toEqual({
      ok: true,
      value: { id: 'f1', name: 'Neu' },
    });
    expect(folders.renameFolder('fehlt', 'X')).toMatchObject({ ok: false });
  });

  it('behält beim Löschen eines Ordners seine Chats', () => {
    folders.createFolder('Weg damit');
    chats.moveChat('c1', 'f1');

    folders.deleteFolder('f1');

    expect(folders.listFolders()).toEqual([]);
    expect(chats.getChat('c1')?.title).toBe('Python-Fragen');
    expect(folderOf('c1')).toBeUndefined();
  });

  it('übernimmt bestehende Chats beim Update ohne Ordner', () => {
    const old = new DatabaseSync(':memory:');
    migrate(old, 5); // Stand vor den Ordnern
    old.exec(
      "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES ('alt', 'Alter Chat', 'm', 1, 1)",
    );
    old.exec('PRAGMA foreign_keys = ON');
    migrate(old);
    const [chat] = new ChatRepository(old).listChats();
    expect(chat).toMatchObject({ id: 'alt', title: 'Alter Chat' });
    expect(chat.folderId).toBeUndefined();
  });
});

describe('Projekte', () => {
  let db: DatabaseSync;
  let knowledge: KnowledgeRepository;

  beforeEach(() => {
    db = openDatabase(':memory:');
    nextId = 1;
    chats = new ChatRepository(db);
    folders = new FolderRepository(
      db,
      () => 1_000,
      () => `f${nextId++}`,
    );
    knowledge = new KnowledgeRepository(db);
    chats.createChat({ id: 'c1', title: 'Klausur', model: 'm' });
  });

  it('speichert Anweisungen (gekürzt auf das Wesentliche)', () => {
    folders.createFolder('Studium');
    folders.setInstructions('f1', '  Antworte als Tutor.  ');
    expect(folders.getFolder('f1')).toEqual({
      id: 'f1',
      name: 'Studium',
      instructions: 'Antworte als Tutor.',
    });
    folders.setInstructions('f1', '');
    expect(folders.getFolder('f1')).not.toHaveProperty('instructions');
  });

  it('legt die Projekt-Sammlung nur einmal an und benennt sie mit um', () => {
    folders.createFolder('Studium');
    const first = knowledge.ensureProjectCollection(
      'f1',
      'Studium',
      'qwen3-embedding:0.6b',
    );
    const second = knowledge.ensureProjectCollection(
      'f1',
      'Studium',
      'qwen3-embedding:0.6b',
    );
    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({
      projectId: 'f1',
      name: 'Studium',
      sources: [],
    });
    expect(folders.getFolder('f1')?.collectionId).toBe(first.id);

    folders.renameFolder('f1', 'Uni');
    expect(knowledge.getCollection(first.id)?.name).toBe('Uni');
  });

  it('behält beim Speichern der Quellen die Zugehörigkeit zum Projekt', () => {
    folders.createFolder('Studium');
    const collection = knowledge.ensureProjectCollection('f1', 'Studium', 'm');
    knowledge.saveCollection(
      {
        id: collection.id,
        name: 'Studium',
        sources: [{ kind: 'folder', path: 'C:\Uni' }],
      },
      'm',
    );
    expect(knowledge.getCollection(collection.id)?.projectId).toBe('f1');
  });

  it('löscht mit dem Projekt seine Dokumente, aber nicht seine Chats', () => {
    folders.createFolder('Studium');
    chats.moveChat('c1', 'f1');
    const collection = knowledge.ensureProjectCollection('f1', 'Studium', 'm');
    knowledge.saveDocument(
      collection.id,
      { path: 'C:\Uni\skript.md', size: 1, mtime: 1, hash: 'h', status: 'ok' },
      [
        {
          chunk: { text: 'Median', start: 0, end: 6 },
          vector: new Float32Array([1]),
        },
      ],
    );

    folders.deleteFolder('f1');

    expect(knowledge.getCollection(collection.id)).toBeNull();
    const count = (table: string) =>
      (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number })
        .n;
    expect(count('chunks')).toBe(0);
    expect(count('documents')).toBe(0);
    expect(chats.getChat('c1')).not.toBeNull();
    expect(folderOf('c1')).toBeUndefined();
  });
});

describe('Skills eines Projekts', () => {
  it('speichert die Kennungen geprüft und liefert sie mit dem Projekt', () => {
    const created = folders.createFolder('Klausur');
    if (!created.ok) throw new Error(created.error);
    const { id } = created.value;
    expect(folders.getFolder(id)?.skills).toBeUndefined();

    folders.setSkills(id, ['code-review', 'code-review', '', 42, 'lernkarten']);
    expect(folders.getFolder(id)?.skills).toEqual([
      'code-review',
      'lernkarten',
    ]);

    folders.setSkills(id, []);
    expect(folders.getFolder(id)?.skills).toBeUndefined();
    folders.setSkills(id, 'kein Array');
    expect(folders.getFolder(id)?.skills).toBeUndefined();
  });
});
