import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CodeBackups } from '../../src/main/code/backups';
import { callReadTool } from '../../src/main/code/code-tools';
import { commandArgs, runCommand } from '../../src/main/code/command-tool';
import {
  applyChange,
  changePreview,
  planChange,
} from '../../src/main/code/edit-tools';
import {
  callGitTool,
  describeCommit,
  git,
} from '../../src/main/code/git-tools';
import { Workspace } from '../../src/main/code/workspace';
import { setMessageLanguage } from '../../src/shared/messages';

let base: string;
let ws: Workspace;

beforeEach(async () => {
  base = await mkdtemp(path.join(os.tmpdir(), 'localdesk-en-'));
  await mkdir(path.join(base, 'src'));
  await writeFile(path.join(base, 'src', 'a.py'), 'x = 1\nx = 1\ny = 2\n');
  ws = await Workspace.open(base);
  setMessageLanguage('en');
});

afterEach(async () => {
  setMessageLanguage('de');
  await rm(base, { recursive: true, force: true });
});

/** Alles, was hier ausgegeben wird, darf kein Deutsch mehr enthalten. */
const german = /[äöüß]|\b(nicht|Datei|Ordner|fehlt|gibt|keine?)\b/i;

describe('Code-Bereich auf Englisch', () => {
  it('Pfad- und Ordnerfehler', async () => {
    await mkdir(path.join(base, '.git'));
    await writeFile(path.join(base, '.git', 'config'), '[core]\n');
    const errors = [
      await ws.resolve('../x').catch((e) => e.message),
      await ws.resolve('src/fehlt.py').catch((e) => e.message),
      await ws.resolve('.git/config').catch((e) => e.message),
      await ws.read('src').catch((e) => e.message),
      await Workspace.open('relativ').catch((e) => e.message),
      await Workspace.open(path.join(base, 'weg')).catch((e) => e.message),
    ];
    expect(errors[0]).toBe(
      'Only paths inside the project folder are allowed: ../x',
    );
    expect(errors[1]).toBe("Doesn't exist: src/fehlt.py");
    expect(errors[2]).toBe('The .git folder is blocked: .git/config');
    expect(errors[3]).toBe('Not a file: src');
    expect(errors[4]).toBe('Not a valid folder.');
    expect(errors[5]).toContain("doesn't exist");
    for (const e of errors)
      expect(e.replace(/fehlt\.py|weg/, ''), e).not.toMatch(german);
  });

  it('Datei ändern: Prüfungen, Vorschau und Ergebnis', async () => {
    const edit = (args: Record<string, unknown>) =>
      planChange(ws, 'edit_file', args).catch((e) => e.message);
    expect(await edit({})).toBe('Path is missing.');
    expect(await edit({ path: 'src/a.py', old_text: '', new_text: 'z' })).toBe(
      'old_text is missing.',
    );
    expect(
      await edit({ path: 'src/a.py', old_text: 'q', new_text: 'z' }),
    ).toContain("doesn't occur in src/a.py");
    expect(
      await edit({ path: 'src/a.py', old_text: 'x = 1', new_text: 'z' }),
    ).toBe(
      'old_text occurs 2 times in src/a.py – include more surrounding lines so it is unique.',
    );
    const plan = await planChange(ws, 'edit_file', {
      path: 'src/a.py',
      old_text: 'y = 2',
      new_text: 'y = 3',
    });
    expect(changePreview(plan)).toContain('+y = 3');
    const backups = new CodeBackups(path.join(base, 'backups'));
    expect(
      await applyChange(ws, backups, 'c1', 'edit_file', {
        path: 'src/a.py',
        old_text: 'y = 2',
        new_text: 'y = 3',
      }),
    ).toBe('Changed: src/a.py');
    expect(
      await applyChange(ws, backups, 'c2', 'write_file', {
        path: 'neu.txt',
        content: 'hi',
      }),
    ).toBe('Created: neu.txt');
    expect(
      await applyChange(ws, backups, 'c3', 'delete_file', { path: 'neu.txt' }),
    ).toBe('Deleted: neu.txt');
    expect(await backups.undo('c1')).toEqual({ ok: true });
    expect(await backups.undo('c1')).toEqual({
      ok: false,
      error: 'Already undone.',
    });
    expect(await backups.undo('c9')).toEqual({
      ok: false,
      error: 'There is no backup for this change.',
    });
  });

  it('Lesen und Suchen', async () => {
    expect(await callReadTool(ws, 'list_files', {})).toContain('src/');
    expect(await callReadTool(ws, 'read_file', { path: 'src/a.py' })).toMatch(
      /^src\/a\.py \(lines 1–4 of 4\):/,
    );
    expect(await callReadTool(ws, 'search_text', { query: 'nope' })).toBe(
      'No match for “nope”.',
    );
    expect(await callReadTool(ws, 'search_text', { query: 'y = 2' })).toMatch(
      /^1 matches for “y = 2”:/,
    );
    await mkdir(path.join(base, 'leer'));
    expect(await callReadTool(ws, 'list_files', { path: 'leer' })).toBe(
      'leer: empty',
    );
  });

  it('Befehl: Vorschau, Ergebnis, Fehler', async () => {
    expect(() => commandArgs({})).toThrow('Command is missing.');
    const result = await runCommand(
      base,
      { command: 'exit 3' },
      new AbortController().signal,
    );
    expect(result).toMatch(/^Exit code: 3 \(\d+\.\d s\)\n\(no output\)$/);
  }, 30_000);

  it('Git: Vorschau und Fehler', async () => {
    await expect(callGitTool(ws, 'git_status', {})).rejects.toThrow(
      'The project folder is not a Git project.',
    );
    await git(base, ['init', '-q', '-b', 'main']);
    await expect(describeCommit(base, { message: '  ' })).rejects.toThrow(
      'Commit message is missing.',
    );
    await writeFile(path.join(base, 'neu.py'), 'neu\n');
    expect(await describeCommit(base, { message: 'Hallo' })).toContain(
      'Message:\nHallo\n\nFiles:\n',
    );
    expect(await callGitTool(ws, 'git_diff', {})).toContain(
      'New files (not in Git yet):',
    );
  });
});
