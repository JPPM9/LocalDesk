import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CodeBackups } from '../../src/main/code/backups';
import {
  applyChange,
  changePreview,
  editTools,
  planChange,
} from '../../src/main/code/edit-tools';
import { Workspace } from '../../src/main/code/workspace';

let base: string;
let root: string;
let ws: Workspace;
let backups: CodeBackups;

const read = (rel: string) => readFile(path.join(root, rel), 'utf8');

beforeEach(async () => {
  base = await mkdtemp(path.join(os.tmpdir(), 'localdesk-edit-'));
  root = path.join(base, 'projekt');
  await import('node:fs/promises').then((fs) => fs.mkdir(root));
  await writeFile(
    path.join(root, 'rechner.py'),
    'def teile(a, b):\n    return a / b\n\n\ndef doppelt(x):\n    return x * 2\n',
  );
  await writeFile(path.join(root, 'windows.txt'), 'eins\r\nzwei\r\ndrei\r\n');
  await writeFile(path.join(root, 'zweimal.py'), 'x = 1\nx = 1\n');
  ws = await Workspace.open(root);
  backups = new CodeBackups(path.join(base, 'backups'));
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe('editTools', () => {
  it('fragen immer, ohne „immer erlauben“, mit Vorschau', () => {
    const tools = editTools(async () => '');
    expect(
      tools.map((t) => [t.toolName, t.permission, t.alwaysAsk, t.destructive]),
    ).toEqual([
      ['edit_file', 'ask', true, false],
      ['write_file', 'ask', true, false],
      ['delete_file', 'ask', true, true],
    ]);
    expect(tools.every((t) => typeof t.describe === 'function')).toBe(true);
  });
});

describe('planChange', () => {
  it('ersetzt genau eine Stelle und zeigt Vorher/Nachher', async () => {
    const plan = await planChange(ws, 'edit_file', {
      path: 'rechner.py',
      old_text: '    return a / b',
      new_text:
        '    if b == 0:\n        raise ValueError("Teilen durch 0")\n    return a / b',
    });
    expect(plan.after).toContain('raise ValueError');
    expect(changePreview(plan)).toBe(
      [
        '--- rechner.py',
        '+++ rechner.py',
        '@@ -1,4 +1,6 @@',
        ' def teile(a, b):',
        '+    if b == 0:',
        '+        raise ValueError("Teilen durch 0")',
        '     return a / b',
        ' ',
        ' ',
      ].join('\n'),
    );
  });

  it('lehnt fehlenden, mehrdeutigen oder gleichen Text ab', async () => {
    await expect(
      planChange(ws, 'edit_file', {
        path: 'rechner.py',
        old_text: 'gibt es nicht',
        new_text: 'x',
      }),
    ).rejects.toThrow('kommt in rechner.py nicht vor');
    await expect(
      planChange(ws, 'edit_file', {
        path: 'zweimal.py',
        old_text: 'x = 1',
        new_text: 'x = 2',
      }),
    ).rejects.toThrow('2-mal');
    await expect(
      planChange(ws, 'edit_file', {
        path: 'rechner.py',
        old_text: 'b',
        new_text: 'b',
      }),
    ).rejects.toThrow('gleich');
    await expect(
      planChange(ws, 'edit_file', {
        path: '../aussen.py',
        old_text: 'a',
        new_text: 'b',
      }),
    ).rejects.toThrow('Projektordner');
  });

  it('behält Windows-Zeilenenden', async () => {
    const plan = await planChange(ws, 'edit_file', {
      path: 'windows.txt',
      old_text: 'zwei\n',
      new_text: 'ZWEI\nzweieinhalb\n',
    });
    expect(plan.after).toBe('eins\r\nZWEI\r\nzweieinhalb\r\ndrei\r\n');
  });

  it('legt neue Dateien an und löscht vorhandene', async () => {
    const neu = await planChange(ws, 'write_file', {
      path: 'tests/test_neu.py',
      content: 'def test(): pass\n',
    });
    expect(neu).toMatchObject({ path: 'tests/test_neu.py', before: null });
    expect(changePreview(neu).split('\n').slice(0, 2)).toEqual([
      '--- /dev/null',
      '+++ tests/test_neu.py',
    ]);
    const weg = await planChange(ws, 'delete_file', { path: 'zweimal.py' });
    expect(weg.after).toBeNull();
    await expect(
      planChange(ws, 'delete_file', { path: 'fehlt.py' }),
    ).rejects.toThrow('Gibt es nicht');
  });
});

describe('applyChange + Rückgängig', () => {
  it('sichert vor dem Ändern und setzt zurück', async () => {
    const result = await applyChange(ws, backups, 'call-1', 'edit_file', {
      path: 'rechner.py',
      old_text: 'x * 2',
      new_text: 'x + x',
    });
    expect(result).toBe('Geändert: rechner.py');
    expect(await read('rechner.py')).toContain('x + x');
    expect(await backups.state('call-1')).toBe('applied');

    expect(await backups.undo('call-1')).toEqual({ ok: true });
    expect(await read('rechner.py')).toContain('x * 2');
    expect(await backups.state('call-1')).toBe('undone');
    expect(await backups.undo('call-1')).toMatchObject({ ok: false });
  });

  it('warnt, wenn die Datei seither geändert wurde – zurück nur mit force', async () => {
    await applyChange(ws, backups, 'call-2', 'edit_file', {
      path: 'rechner.py',
      old_text: 'x * 2',
      new_text: 'x + x',
    });
    await writeFile(path.join(root, 'rechner.py'), 'von Hand geändert\n');
    expect(await backups.undo('call-2')).toMatchObject({
      ok: false,
      conflict: true,
    });
    expect(await read('rechner.py')).toBe('von Hand geändert\n');
    expect(await backups.undo('call-2', true)).toEqual({ ok: true });
    expect(await read('rechner.py')).toContain('x * 2');
  });

  it('macht Anlegen und Löschen rückgängig', async () => {
    await applyChange(ws, backups, 'neu', 'write_file', {
      path: 'ordner/neu.txt',
      content: 'hallo',
    });
    expect(await read('ordner/neu.txt')).toBe('hallo');
    await backups.undo('neu');
    expect(existsSync(path.join(root, 'ordner', 'neu.txt'))).toBe(false);

    await applyChange(ws, backups, 'weg', 'delete_file', {
      path: 'zweimal.py',
    });
    expect(existsSync(path.join(root, 'zweimal.py'))).toBe(false);
    await backups.undo('weg');
    expect(await read('zweimal.py')).toBe('x = 1\nx = 1\n');
  });

  it('kennt nur harmlose Kennungen', async () => {
    expect(await backups.state('../../etwas')).toBe('missing');
    expect(await backups.undo('../x')).toMatchObject({ ok: false });
  });
});
