import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODE_FILE_MAX, Workspace } from '../../src/main/code/workspace';
import { ChatRepository } from '../../src/main/db/chat-repository';
import { openDatabase } from '../../src/main/db/database';

let base: string;
let root: string;
let outside: string;

beforeEach(async () => {
  base = await mkdtemp(path.join(os.tmpdir(), 'localdesk-code-'));
  root = path.join(base, 'projekt');
  outside = path.join(base, 'geheim');
  await mkdir(path.join(root, 'src'), { recursive: true });
  await mkdir(path.join(root, '.git'), { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(root, 'src', 'main.py'), 'print("Hallo")\n');
  await writeFile(path.join(root, 'README.md'), '# Test\n');
  await writeFile(path.join(root, '.git', 'config'), '[core]\n');
  await writeFile(path.join(outside, 'passwort.txt'), 'geheim');
});

afterEach(async () => {
  // Nur unseren eigenen Testordner entfernen.
  await rm(base, { recursive: true, force: true });
});

describe('Workspace.resolve', () => {
  it('findet Pfade im Projekt, mit / und \\', async () => {
    const ws = await Workspace.open(root);
    expect(await ws.resolve('src/main.py')).toBe(
      path.join(ws.root, 'src', 'main.py'),
    );
    expect(await ws.resolve('src\\main.py')).toBe(
      path.join(ws.root, 'src', 'main.py'),
    );
    expect(await ws.resolve('')).toBe(ws.root);
  });

  it('lehnt alles außerhalb ab', async () => {
    const ws = await Workspace.open(root);
    for (const bad of [
      '../geheim/passwort.txt',
      'src/../../geheim/passwort.txt',
      path.join(outside, 'passwort.txt'),
      'C:/Windows/system.ini',
      'C:Windows',
      '/etc/passwd',
    ]) {
      await expect(ws.resolve(bad), bad).rejects.toThrow();
    }
  });

  it('sperrt den Ordner .git', async () => {
    const ws = await Workspace.open(root);
    await expect(ws.resolve('.git/config')).rejects.toThrow('.git');
  });

  it('sperrt .git auch unter anderer Schreibweise (Windows)', async () => {
    const ws = await Workspace.open(root);
    for (const bad of ['.GIT/config', '.Git/config', '.git./config']) {
      await expect(ws.resolve(bad), bad).rejects.toThrow();
    }
    // Neue Dateien in .git (z. B. Hooks) ebenso.
    for (const bad of ['.GIT/hooks/pre-commit', '.git/hooks/pre-commit']) {
      await expect(ws.resolve(bad, false), bad).rejects.toThrow();
    }
    // Ähnliche Namen bleiben erlaubt.
    expect(await ws.resolve('.gitignore', false)).toBe(
      path.join(ws.root, '.gitignore'),
    );
  });

  it('lehnt „:“ ab: Datenströme, Laufwerke und Git-Pfadzauber', async () => {
    const ws = await Workspace.open(root);
    for (const bad of [
      ':(top)',
      ':(top)geheim',
      'src/:(glob)*',
      'README.md:strom',
      '.git::$INDEX_ALLOCATION/config',
    ]) {
      await expect(ws.resolve(bad, false), bad).rejects.toThrow(
        'Projektordner',
      );
    }
  });

  it('lässt sich nicht über Verknüpfungen nach draußen locken', async () => {
    // Junctions gehen unter Windows ohne Adminrechte.
    await symlink(outside, path.join(root, 'abkuerzung'), 'junction');
    const ws = await Workspace.open(root);
    await expect(ws.resolve('abkuerzung/passwort.txt')).rejects.toThrow(
      'hinaus',
    );
    await expect(ws.resolve('abkuerzung/neu.txt', false)).rejects.toThrow(
      'hinaus',
    );
  });

  it('erlaubt neue Dateien nur, wenn danach gefragt wird', async () => {
    const ws = await Workspace.open(root);
    await expect(ws.resolve('src/neu.py')).rejects.toThrow('Gibt es nicht');
    expect(await ws.resolve('src/neu/tief/datei.py', false)).toBe(
      path.join(ws.root, 'src', 'neu', 'tief', 'datei.py'),
    );
  });
});

describe('Workspace.list / read', () => {
  it('listet Ordner zuerst und versteckt .git', async () => {
    const ws = await Workspace.open(root);
    expect((await ws.list()).map((e) => [e.path, e.kind])).toEqual([
      ['src', 'dir'],
      ['README.md', 'file'],
    ]);
    expect(await ws.list('src')).toEqual([
      { path: 'src/main.py', name: 'main.py', kind: 'file', size: 15 },
    ]);
  });

  it('liest Text, erkennt Binärdateien und zu große Dateien', async () => {
    await writeFile(path.join(root, 'bild.png'), Buffer.from([137, 80, 0, 1]));
    await writeFile(
      path.join(root, 'gross.txt'),
      'x'.repeat(CODE_FILE_MAX + 1),
    );
    const ws = await Workspace.open(root);
    expect(await ws.read('README.md')).toEqual({
      path: 'README.md',
      size: 7,
      text: '# Test\n',
    });
    expect(await ws.read('bild.png')).toMatchObject({ binary: true });
    expect(await ws.read('gross.txt')).toMatchObject({ tooLarge: true });
    await expect(ws.read('src')).rejects.toThrow('Keine Datei');
  });
});

describe('Workspace.open', () => {
  it('lehnt Laufwerke, den Benutzerordner und Fehlendes ab', async () => {
    await expect(Workspace.open(path.parse(root).root)).rejects.toThrow(
      'Laufwerk',
    );
    if (process.env.USERPROFILE) {
      await expect(Workspace.open(process.env.USERPROFILE)).rejects.toThrow(
        'Benutzerordner',
      );
    }
    await expect(Workspace.open(path.join(base, 'fehlt'))).rejects.toThrow(
      'gibt es nicht',
    );
    await expect(Workspace.open('relativ/pfad')).rejects.toThrow();
  });
});

describe('Code-Sitzungen in der Datenbank', () => {
  it('stehen nicht in der Chat-Liste und nicht in der Suche', () => {
    const chats = new ChatRepository(openDatabase(':memory:'));
    chats.createChat({ id: 'c1', title: 'Normal', model: 'm' });
    chats.createChat({
      id: 'k1',
      title: 'projekt',
      model: '',
      workspace: 'D:\\projekt',
    });
    chats.appendMessage('k1', {
      id: 'u1',
      role: 'user',
      content: 'Geheimwort Zebra',
      thinking: '',
      status: 'done',
    });
    expect(chats.listChats().map((c) => c.id)).toEqual(['c1']);
    expect(chats.listCodeSessions()).toEqual([
      expect.objectContaining({ id: 'k1', workspace: 'D:\\projekt' }),
    ]);
    expect(chats.getChat('k1')?.workspace).toBe('D:\\projekt');
    expect(chats.getChat('c1')).not.toHaveProperty('workspace');
    expect(chats.search('Zebra').hits).toEqual([]);
  });
});

describe('Rückgängig im Verlauf', () => {
  it('ergänzt das gespeicherte Werkzeug-Ergebnis', () => {
    const chats = new ChatRepository(openDatabase(':memory:'));
    chats.createChat({ id: 'k1', title: 'p', model: '', workspace: 'D:\p' });
    const call = {
      id: 'call-7',
      round: 1,
      name: 'edit_file',
      toolName: 'edit_file',
      serverId: 'localdesk:code',
      serverName: 'Code',
      arguments: { path: 'a.py' },
      status: 'done' as const,
      result: 'Geändert: a.py',
    };
    chats.appendMessage('k1', {
      id: 'a1',
      role: 'assistant',
      content: 'Fertig',
      thinking: '',
      status: 'done',
      toolCalls: [call, { ...call, id: 'call-8', result: 'Geändert: b.py' }],
    });
    expect(chats.appendToolResult('call-7', 'Rückgängig gemacht.')).toBe(true);
    expect(chats.appendToolResult('gibt-es-nicht', 'x')).toBe(false);
    const saved = chats.getChat('k1')?.messages[0].toolCalls;
    expect(saved?.map((c) => c.result)).toEqual([
      'Geändert: a.py\nRückgängig gemacht.',
      'Geändert: b.py',
    ]);
  });
});
