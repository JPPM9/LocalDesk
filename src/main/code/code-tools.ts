import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { OfferedTool } from '../../shared/tools';
import { CODE_FILE_MAX, HIDDEN_DIRS, type Workspace } from './workspace';

export { CODE_TOOL_SERVER } from '../../shared/code';
import { CODE_TOOL_SERVER } from '../../shared/code';
import { tr } from '../../shared/messages';

/** Ordner, die beim Auflisten und Suchen übersprungen werden (riesig, erzeugt). */
const SKIPPED_DIRS = new Set([
  ...HIDDEN_DIRS,
  'node_modules',
  '__pycache__',
  '.venv',
  'venv',
  'dist',
  'build',
  'out',
  '.next',
  'target',
  '.gradle',
  '.idea',
  '.vs',
]);

const LIST_MAX = 300;
const READ_LINES_MAX = 400;
const READ_CHARS_MAX = 30_000;
const SEARCH_HITS_MAX = 100;
const SEARCH_FILES_MAX = 5000;

const base = { serverId: CODE_TOOL_SERVER, serverName: 'Code' } as const;

/** Lese-Werkzeuge: ohne Rückfrage, aber nur im Projektordner. */
export function readTools(): OfferedTool[] {
  return [
    {
      ...base,
      toolName: 'list_files',
      description:
        'Zeigt Ordner und Dateien im Projekt als Baum (Standard: 2 Ebenen). Große, ' +
        'erzeugte Ordner wie node_modules werden nur genannt.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ordner relativ zum Projekt; leer = oberste Ebene.',
          },
          depth: { type: 'integer', description: 'Ebenen, 1–4.' },
        },
      },
      destructive: false,
      permission: 'always',
    },
    {
      ...base,
      toolName: 'read_file',
      description:
        `Liest eine Textdatei mit Zeilennummern (höchstens ${READ_LINES_MAX} Zeilen pro Aufruf). ` +
        'Für lange Dateien start_line/end_line angeben.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Datei relativ zum Projekt.' },
          start_line: { type: 'integer', description: 'Erste Zeile (ab 1).' },
          end_line: { type: 'integer', description: 'Letzte Zeile.' },
        },
        required: ['path'],
      },
      destructive: false,
      permission: 'always',
    },
    {
      ...base,
      toolName: 'search_text',
      description:
        'Sucht Text in allen Dateien des Projekts (ohne Groß-/Kleinschreibung) und liefert ' +
        '„Datei:Zeile: Inhalt“. Optional nur in einem Unterordner.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Gesuchter Text.' },
          path: {
            type: 'string',
            description:
              'Unterordner relativ zum Projekt; leer = ganzes Projekt.',
          },
        },
        required: ['query'],
      },
      destructive: false,
      permission: 'always',
    },
  ];
}

const text = (args: Record<string, unknown>, key: string) =>
  typeof args[key] === 'string' ? (args[key] as string) : '';
const int = (args: Record<string, unknown>, key: string) =>
  typeof args[key] === 'number' && Number.isFinite(args[key])
    ? Math.round(args[key] as number)
    : undefined;

/** Führt ein Lese-Werkzeug aus; null = kein Lese-Werkzeug. */
export async function callReadTool(
  ws: Workspace,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string | null> {
  switch (toolName) {
    case 'list_files':
      return listFiles(
        ws,
        text(args, 'path'),
        Math.min(Math.max(int(args, 'depth') ?? 2, 1), 4),
      );
    case 'read_file':
      return readLines(
        ws,
        text(args, 'path'),
        int(args, 'start_line'),
        int(args, 'end_line'),
      );
    case 'search_text':
      return searchText(ws, text(args, 'query'), text(args, 'path'));
    default:
      return null;
  }
}

async function listFiles(
  ws: Workspace,
  relative: string,
  depth: number,
): Promise<string> {
  const start = await ws.resolve(relative);
  const lines: string[] = [];
  let count = 0;
  const walk = async (dir: string, level: number) => {
    const entries = (await readdir(dir, { withFileTypes: true })).sort(
      (a, b) =>
        Number(b.isDirectory()) - Number(a.isDirectory()) ||
        a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      if (count >= LIST_MAX) return;
      const indent = '  '.repeat(level);
      if (entry.isDirectory()) {
        if (HIDDEN_DIRS.has(entry.name)) continue;
        count++;
        if (SKIPPED_DIRS.has(entry.name)) {
          lines.push(`${indent}${tr('code.skippedDir', { name: entry.name })}`);
        } else {
          lines.push(`${indent}${entry.name}/`);
          if (level + 1 < depth)
            await walk(path.join(dir, entry.name), level + 1);
        }
      } else if (entry.isFile()) {
        count++;
        lines.push(`${indent}${entry.name}`);
      }
    }
  };
  await walk(start, 0);
  const title = ws.relative(start) || '.';
  if (lines.length === 0) return tr('code.emptyDir', { title });
  return [
    `${title}/`,
    ...lines.map((l) => `  ${l}`),
    ...(count >= LIST_MAX ? [tr('code.listTruncated', { max: LIST_MAX })] : []),
  ].join('\n');
}

async function readLines(
  ws: Workspace,
  relative: string,
  startLine?: number,
  endLine?: number,
): Promise<string> {
  if (!relative) throw new Error(tr('code.pathMissing'));
  const file = await ws.read(relative);
  if (file.tooLarge)
    throw new Error(tr('code.fileTooLarge', { path: file.path }));
  if (file.binary || file.text === undefined) {
    throw new Error(tr('code.notText', { path: file.path }));
  }
  const all = file.text.split(/\r?\n/);
  const from = Math.max(1, startLine ?? 1);
  let to = Math.min(all.length, endLine ?? from + READ_LINES_MAX - 1);
  to = Math.min(to, from + READ_LINES_MAX - 1);
  const out: string[] = [];
  let chars = 0;
  for (let n = from; n <= to; n++) {
    const line = `${String(n).padStart(4)}| ${all[n - 1]}`;
    chars += line.length + 1;
    if (chars > READ_CHARS_MAX) {
      to = n - 1;
      break;
    }
    out.push(line);
  }
  const more =
    to < all.length
      ? `\n${tr('code.readMore', { total: all.length, next: to + 1 })}`
      : '';
  return `${tr('code.readHeader', { path: file.path, from, to, total: all.length })}\n${out.join('\n')}${more}`;
}

async function searchText(
  ws: Workspace,
  query: string,
  relative: string,
): Promise<string> {
  const needle = query.trim().toLowerCase();
  if (!needle) throw new Error(tr('code.queryMissing'));
  const start = await ws.resolve(relative);
  const hits: string[] = [];
  let files = 0;
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (hits.length >= SEARCH_HITS_MAX || files >= SEARCH_FILES_MAX) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) await walk(full);
      } else if (entry.isFile()) {
        files++;
        const size = (await stat(full)).size;
        if (size > CODE_FILE_MAX) continue;
        const bytes = await readFile(full);
        if (bytes.subarray(0, 8000).includes(0)) continue;
        const lines = bytes.toString('utf8').split(/\r?\n/);
        for (
          let i = 0;
          i < lines.length && hits.length < SEARCH_HITS_MAX;
          i++
        ) {
          if (lines[i].toLowerCase().includes(needle)) {
            hits.push(
              `${ws.relative(full)}:${i + 1}: ${lines[i].trim().slice(0, 200)}`,
            );
          }
        }
      }
    }
  };
  await walk(start);
  if (hits.length === 0) return tr('code.noHit', { query: query.trim() });
  return [
    tr('code.hits', {
      count: `${hits.length}${hits.length >= SEARCH_HITS_MAX ? '+' : ''}`,
      query: query.trim(),
    }),
    ...hits,
  ].join('\n');
}
