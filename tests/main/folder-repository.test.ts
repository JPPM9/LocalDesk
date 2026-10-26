import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrate, openDatabase } from '../../src/main/db/database';
import { ChatRepository } from '../../src/main/db/chat-repository';
import { FolderRepository } from '../../src/main/db/folder-repository';

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
