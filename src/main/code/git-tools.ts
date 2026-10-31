import { execFile } from 'node:child_process';
import { CODE_TOOL_SERVER } from '../../shared/code';
import type { OfferedTool } from '../../shared/tools';
import { findProgram } from './executables';
import type { Workspace } from './workspace';
import { tr } from '../../shared/messages';

export const GIT_TOOLS = ['git_status', 'git_diff', 'git_commit'] as const;
const DIFF_MAX = 20_000;
const MESSAGE_MAX = 2000;

const base = { serverId: CODE_TOOL_SERVER, serverName: 'Code' } as const;

/**
 * Git im Projektordner: Status und Diff ohne Rückfrage, Commit nur nach deiner
 * Freigabe. Push gibt es nicht. Git läuft ohne Shell – Eingaben des Modells
 * werden nie als Befehlszeile gelesen. Alles gilt nur für den Projektordner
 * (`-- .`), auch wenn das Git-Projekt größer ist.
 */
export function gitTools(
  describeCommit: (args: Record<string, unknown>) => Promise<string>,
): OfferedTool[] {
  return [
    {
      ...base,
      toolName: 'git_status',
      description:
        'Zeigt den Git-Stand des Projekts: Branch und geänderte Dateien.',
      inputSchema: { type: 'object', properties: {} },
      destructive: false,
      permission: 'always',
    },
    {
      ...base,
      toolName: 'git_diff',
      description:
        'Zeigt alle noch nicht committeten Änderungen (gegenüber dem letzten Commit), ' +
        'optional nur für eine Datei.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Datei relativ zum Projekt (optional).',
          },
        },
      },
      destructive: false,
      permission: 'always',
    },
    {
      ...base,
      toolName: 'git_commit',
      description:
        'Committet ALLE Änderungen im Projektordner mit der Nachricht. Sieh dir VORHER mit git_diff an, was sich wirklich geändert hat, und beschreibe genau das. Nur wenn der Nutzer ' +
        'einen Commit möchte; er sieht vorher Nachricht und Dateien und bestätigt. Push gibt es nicht.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit-Nachricht.' },
        },
        required: ['message'],
      },
      destructive: false,
      permission: 'ask',
      alwaysAsk: true,
      describe: describeCommit,
    },
  ];
}

/**
 * Git liest die Einstellungen aus dem Projekt selbst (.git/config). Ein fremdes
 * Projekt könnte dort Programme eintragen, die bei „status“ oder „diff“ mitlaufen
 * (core.fsmonitor, Hooks). Auf der Kommandozeile gesetzt, gelten diese Werte
 * vor allem anderen. Dazu kommt `--no-ext-diff --no-textconv` beim Diff.
 * Folge: Git-Hooks des Projekts laufen bei Commits aus LocalDesk nicht.
 */
export const GIT_SAFE_CONFIG = [
  '-c',
  'core.quotepath=false',
  '-c',
  'color.ui=false',
  '-c',
  'core.fsmonitor=false',
  '-c',
  `core.hooksPath=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`,
];

/** Führt git ohne Shell aus; wirft mit Gits eigener Meldung. */
export function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Voller Pfad, nie aus dem Projektordner (siehe executables.ts).
    const program = findProgram('git', cwd);
    if (!program) {
      reject(new Error(tr('code.gitMissing')));
      return;
    }
    execFile(
      program,
      [...GIT_SAFE_CONFIG, ...args],
      {
        cwd,
        windowsHide: true,
        timeout: 60_000,
        maxBuffer: 10_000_000,
        // Pfade sind immer Pfade – nie Git-Zeichenfolgen wie „:(top)“.
        env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
      },
      (error, stdout, stderr) => {
        if (error) {
          const text = `${stderr}`.trim() || error.message;
          reject(
            new Error(
              /not a git repository/i.test(text)
                ? tr('code.notGitRepo')
                : tr('code.gitSays', { text: text.slice(0, 1000) }),
            ),
          );
        } else {
          resolve(stdout.replace(/\s+$/, ''));
        }
      },
    );
  });
}

function commitMessage(args: Record<string, unknown>): string {
  const message = typeof args.message === 'string' ? args.message.trim() : '';
  if (!message) throw new Error(tr('code.commitMessageMissing'));
  if (message.length > MESSAGE_MAX)
    throw new Error(tr('code.commitMessageTooLong'));
  return message;
}

/** Vorschau für die Rückfrage: Nachricht und betroffene Dateien. */
export async function describeCommit(
  cwd: string,
  args: Record<string, unknown>,
): Promise<string> {
  const message = commitMessage(args);
  const files = await git(cwd, [
    'status',
    '--short',
    '--untracked-files=all',
    '--',
    '.',
  ]);
  if (!files) throw new Error(tr('code.nothingToCommit'));
  return tr('code.commitPreview', { message, files });
}

/** Führt ein Git-Werkzeug aus (Commit erst nach deiner Freigabe). */
export async function callGitTool(
  ws: Workspace,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const cwd = ws.root;
  switch (toolName) {
    case 'git_status': {
      const out = await git(cwd, ['status', '--short', '--branch', '--', '.']);
      return out.includes('\n') ? out : `${out}\n${tr('code.noChanges')}`;
    }
    case 'git_diff': {
      // Auch hier gilt der Pfad-Schutz – das Git-Projekt kann größer sein als der Ordner.
      const path =
        typeof args.path === 'string' && args.path.trim()
          ? ws.relative(await ws.resolve(args.path, false)) || '.'
          : '.';
      // Neue, noch unbekannte Dateien zeigt „git diff“ nicht – also zusätzlich nennen.
      const hasHead = await git(cwd, [
        'rev-parse',
        '--verify',
        '--quiet',
        'HEAD',
      ])
        .then(() => true)
        .catch(() => false);
      const diff = await git(cwd, [
        'diff',
        '--no-ext-diff',
        '--no-textconv',
        ...(hasHead ? ['HEAD'] : []),
        '--',
        path,
      ]);
      const untracked = await git(cwd, [
        'ls-files',
        '--others',
        '--exclude-standard',
        '--',
        path,
      ]);
      const parts = [
        diff || tr('code.noKnownChanges'),
        ...(untracked ? [tr('code.newFiles', { files: untracked })] : []),
      ];
      const text = parts.join('\n\n');
      return text.length > DIFF_MAX
        ? `${text.slice(0, DIFF_MAX)}\n${tr('code.diffTruncated')}`
        : text;
    }
    case 'git_commit': {
      const message = commitMessage(args);
      await git(cwd, ['add', '--all', '--', '.']);
      await git(cwd, ['commit', '-m', message, '--', '.']);
      return tr('code.committed', {
        commit: await git(cwd, ['log', '-1', '--format=%h %s']),
      });
    }
    default:
      throw new Error(tr('error.toolMissing', { tool: toolName }));
  }
}
