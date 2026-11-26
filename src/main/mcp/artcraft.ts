import { existsSync } from 'node:fs';
import path from 'node:path';
import { ARTCRAFT_APPS, type ArtcraftApp } from '../../shared/artcraft';

/**
 * Wo die ArtCraft-Apps liegen: der Launcher installiert nach „Programme“; auch eine Installation
 * für nur diesen Benutzer wird gefunden. Nur diese festen Orte – nie ein Pfad aus der Oberfläche.
 */
export function artcraftCandidates(
  app: ArtcraftApp,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const { dir, exe } = ARTCRAFT_APPS[app];
  return [
    env.ProgramFiles,
    env['ProgramFiles(x86)'],
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs'),
  ]
    .filter((root): root is string => Boolean(root))
    .map((root) => path.join(root, dir, exe));
}

/** Der Pfad zur Kommandozeile der App oder null, wenn sie nicht installiert ist. */
export function findArtcraftCli(
  app: ArtcraftApp,
  exists: (file: string) => boolean = existsSync,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return artcraftCandidates(app, env).find((file) => exists(file)) ?? null;
}

/**
 * Startargumente des MCP-Servers: Lesen immer nur in den freigegebenen Ordnern, Schreiben nur,
 * wenn du es erlaubt hast – ohne `--automation-write-root` darf die App nirgends schreiben.
 */
export function artcraftArgs(
  app: ArtcraftApp,
  folders: string[],
  allowWrite: boolean,
): string[] {
  // Ohne Ordner-Beschränkung (Craft Anything): nur der eingeschränkte Modus, nie `--allow-run`.
  if (!ARTCRAFT_APPS[app].roots) return ['mcp', '--restricted'];
  return [
    'mcp',
    ...(ARTCRAFT_APPS[app].compact ? ['--compact'] : []),
    ...folders.flatMap((folder) => ['--automation-read-root', folder]),
    ...(allowWrite
      ? folders.flatMap((folder) => ['--automation-write-root', folder])
      : []),
  ];
}
