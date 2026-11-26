import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';

/** Wo CodeGraph liegen kann: beim Installieren des Programms und auf dem PATH. Nie ein Pfad aus der Oberfläche. */
export function codegraphCandidates(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const own = env.LOCALAPPDATA
    ? [
        path.join(
          env.LOCALAPPDATA,
          'codegraph',
          'current',
          'bin',
          'codegraph.cmd',
        ),
      ]
    : [];
  const onPath = (env.PATH ?? env.Path ?? '')
    .split(path.delimiter)
    .filter(Boolean)
    .flatMap((dir) => [
      path.join(dir, 'codegraph.cmd'),
      path.join(dir, 'codegraph.exe'),
    ]);
  return [...own, ...onPath];
}

export function findCodegraphCli(
  exists: (file: string) => boolean = existsSync,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return codegraphCandidates(env).find((file) => exists(file)) ?? null;
}

/** Start als MCP-Server für genau einen Projektordner. */
export function codegraphArgs(folder: string): string[] {
  return ['serve', '--mcp', '--path', folder];
}

/**
 * CodeGraph sendet auf Wunsch anonyme Statistik. LocalDesk schaltet sie immer ab (Umgebungsvariablen
 * gelten für jede Version; das Argument `--no-telemetry` kennen nur neuere).
 */
export const CODEGRAPH_ENV = { CODEGRAPH_TELEMETRY: '0', DO_NOT_TRACK: '1' };

/** Hat der Ordner schon einen CodeGraph-Index? */
export function hasCodegraphIndex(
  folder: string,
  exists: (file: string) => boolean = existsSync,
): boolean {
  return exists(path.join(folder, '.codegraph'));
}

/** Baut den Index (`codegraph init`); dauert bei großen Projekten Minuten. Legt `.codegraph/` im Ordner an. */
export function runCodegraphInit(cli: string, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cli,
      ['init', folder],
      {
        timeout: 15 * 60_000,
        windowsHide: true,
        shell: cli.toLowerCase().endsWith('.cmd'),
        env: { ...process.env, ...CODEGRAPH_ENV },
      },
      (error, stdout, stderr) =>
        error
          ? reject(new Error(stderr.trim() || error.message))
          : resolve(stdout),
    );
  });
}

/** Gleicher Ordner? (Windows: ohne Groß-/Kleinschreibung und ohne Schrägstrich-Unterschiede) */
export function sameFolder(a: string, b: string): boolean {
  const norm = (p: string) =>
    path.win32
      .normalize(p)
      .replace(/[\\/]+$/, '')
      .toLowerCase();
  return norm(a) === norm(b);
}
