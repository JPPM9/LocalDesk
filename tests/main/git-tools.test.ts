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
      'Nachricht:\nTeilen prüfen\n\nDateien:\n M rechner.py\n?? neu.py',
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
