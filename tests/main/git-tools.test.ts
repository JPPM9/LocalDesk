import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  callGitTool,
  describeCommit,
  git,
  gitTools,
} from '../../src/main/code/git-tools';
import { Workspace } from '../../src/main/code/workspace';

let repo: string;
let project: string;
let ws: Workspace;

beforeEach(async () => {
  // Git-Projekt „repo“ mit dem Projektordner „repo/app“ und einem Nachbarordner.
  repo = await mkdtemp(path.join(os.tmpdir(), 'localdesk-git-'));
  project = path.join(repo, 'app');
  await mkdir(project);
  await mkdir(path.join(repo, 'nachbar'));
  await git(repo, ['init', '-q', '-b', 'main']);
  await git(repo, ['config', 'user.name', 'Test']);
  await git(repo, ['config', 'user.email', 'test@example.invalid']);
  await writeFile(path.join(project, 'rechner.py'), 'x = 1\n');
  await writeFile(path.join(repo, 'nachbar', 'geheim.txt'), 'a\n');
  await git(repo, ['add', '-A']);
  await git(repo, ['commit', '-qm', 'Start']);
  ws = await Workspace.open(project);
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe('gitTools', () => {
  it('Status/Diff frei, Commit mit Rückfrage, kein Push', () => {
    const tools = gitTools(async () => '');
    expect(tools.map((t) => [t.toolName, t.permission])).toEqual([
      ['git_status', 'always'],
      ['git_diff', 'always'],
      ['git_commit', 'ask'],
    ]);
    expect(tools[2].alwaysAsk).toBe(true);
    expect(tools.some((t) => /push/i.test(t.toolName))).toBe(false);
  });
});

describe('Git im Projektordner', () => {
  it('Status und Diff zeigen nur den Projektordner', async () => {
    await writeFile(path.join(project, 'rechner.py'), 'x = 2\n');
    await writeFile(path.join(project, 'neu.py'), 'neu\n');
    await writeFile(path.join(repo, 'nachbar', 'geheim.txt'), 'b\n');

    const status = await callGitTool(ws, 'git_status', {});
    expect(status).toContain('## main');
    expect(status).toContain('rechner.py');
    expect(status).not.toContain('geheim');

    const diff = await callGitTool(ws, 'git_diff', {});
    expect(diff).toContain('-x = 1\n+x = 2');
    expect(diff).toContain('Neue Dateien (noch nicht in Git):\nneu.py');
    expect(diff).not.toContain('geheim');
    await expect(
      callGitTool(ws, 'git_diff', { path: '../nachbar/geheim.txt' }),
    ).rejects.toThrow('Projektordner');
  });

  it('Commit nimmt alles im Projektordner – und nichts daneben', async () => {
    await writeFile(path.join(project, 'rechner.py'), 'x = 2\n');
    await writeFile(path.join(project, 'neu.py'), 'neu\n');
    await writeFile(path.join(repo, 'nachbar', 'geheim.txt'), 'b\n');

    expect(await describeCommit(project, { message: 'Teilen prüfen' })).toBe(
      'Nachricht:\nTeilen prüfen\n\nDateien:\n M rechner.py\n?? neu.py\n\nGit-Hooks des Projekts laufen dabei nicht.',
    );
    expect(
      await callGitTool(ws, 'git_commit', { message: 'Teilen prüfen' }),
    ).toMatch(/^Committet: [0-9a-f]{7,} Teilen prüfen$/);
    expect(await git(repo, ['show', '--name-only', '--format=', 'HEAD'])).toBe(
      'app/neu.py\napp/rechner.py',
    );
    // Die Änderung im Nachbarordner bleibt unangetastet und uncommittet.
    expect(await git(repo, ['status', '--short'])).toBe(
      ' M nachbar/geheim.txt',
    );
  });

  it('meldet Nichts-zu-tun und fehlende Nachricht vor der Rückfrage', async () => {
    await expect(describeCommit(project, { message: 'x' })).rejects.toThrow(
      'Nichts zu committen',
    );
    await expect(describeCommit(project, { message: ' ' })).rejects.toThrow(
      'Nachricht fehlt',
    );
  });

  it('startet nie eine git.exe aus dem Projektordner', async () => {
    // Eine Fälschung im Projekt: Würde sie gestartet, schlüge der Aufruf fehl.
    await writeFile(path.join(project, 'git.exe'), 'kein Programm');
    await writeFile(path.join(project, 'git.com'), 'kein Programm');
    const status = await callGitTool(ws, 'git_status', {});
    expect(status).toContain('## main');
    expect(status).toContain('?? git.exe');
    // Auch die Vorschau vor der Rückfrage startet nur das echte Git.
    expect(await describeCommit(project, { message: 'x' })).toContain(
      '?? git.exe',
    );
  });

  it('Einstellungen aus dem Projekt führen nichts aus', async () => {
    const config = path.join(repo, '.git', 'config');
    await git(repo, ['config', '--local', 'core.fsmonitor', 'boese-befehl']);
    await git(repo, ['config', '--local', 'core.hooksPath', 'boese-hooks']);
    // Die Befehlszeile gewinnt gegen die Projekt-Einstellung.
    expect(await git(repo, ['config', '--get', 'core.fsmonitor'])).toBe(
      'false',
    );
    expect(await git(repo, ['config', '--get', 'core.hooksPath'])).toMatch(
      /^(NUL|\/dev\/null)$/,
    );
    expect(config).toContain('.git');

    // Ein Diff-Programm und ein Textumwandler im Projekt dürfen nicht laufen:
    // Gäbe es sie, schlüge „git diff“ fehl (die Programme existieren nicht).
    await git(repo, ['config', '--local', 'diff.external', 'gibt-es-nicht']);
    await git(repo, [
      'config',
      '--local',
      'diff.boese.textconv',
      'gibt-es-nicht',
    ]);
    await writeFile(path.join(project, '.gitattributes'), '*.py diff=boese\n');
    await writeFile(path.join(project, 'rechner.py'), 'x = 2\n');
    expect(await callGitTool(ws, 'git_diff', {})).toContain('+x = 2');
  });

  it('Git-Hooks des Projekts laufen beim Commit nicht', async () => {
    const hook = path.join(repo, '.git', 'hooks', 'pre-commit');
    await writeFile(
      hook,
      '#!/bin/sh\necho Hook lief > hook-lief.txt\nexit 1\n',
    );
    await writeFile(path.join(project, 'neu.py'), 'neu\n');
    expect(
      await callGitTool(ws, 'git_commit', { message: 'Ohne Hook' }),
    ).toMatch(/^Committet: /);
  });

  it('versteht „:(top)“ nur als Dateinamen, nie als Git-Pfadzauber', async () => {
    await writeFile(path.join(repo, 'nachbar', 'geheim.txt'), 'b\n');
    await expect(
      callGitTool(ws, 'git_diff', { path: ':(top)' }),
    ).rejects.toThrow('Projektordner');
    // Auch Git selbst liest den Wert nur noch wörtlich.
    expect(await git(project, ['diff', 'HEAD', '--', ':(top)'])).toBe('');
  });

  it('erkennt Ordner ohne Git', async () => {
    const plain = await mkdtemp(path.join(os.tmpdir(), 'localdesk-nogit-'));
    try {
      const other = await Workspace.open(plain);
      await expect(callGitTool(other, 'git_status', {})).rejects.toThrow(
        'kein Git-Projekt',
      );
    } finally {
      await rm(plain, { recursive: true, force: true });
    }
  });
});
