import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { CODE_TOOL_SERVER } from '../../shared/code';
import type { OfferedTool } from '../../shared/tools';
import type { CodeBackups } from './backups';
import { CODE_FILE_MAX, type Workspace } from './workspace';

/** So viele Zeilen zeigt die Vorher/Nachher-Ansicht höchstens. */
const PREVIEW_LINES_MAX = 400;

/** Was eine Änderung tun würde – berechnet für Vorschau UND beim Ausführen. */
interface Planned {
  /** Pfad relativ zum Projekt. */
  path: string;
  full: string;
  before: string | null;
  after: string | null;
}

const base = { serverId: CODE_TOOL_SERVER, serverName: 'Code' } as const;

/**
 * Werkzeuge, die Dateien ändern: IMMER mit Rückfrage und Vorher/Nachher-Ansicht,
 * vor dem Schreiben wird der alte Stand gesichert („Rückgängig“).
 */
export function editTools(
  describe: (
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<string>,
): OfferedTool[] {
  const ask = (toolName: string) => ({
    destructive: toolName === 'delete_file',
    permission: 'ask' as const,
    alwaysAsk: true,
    describe: (args: Record<string, unknown>) => describe(toolName, args),
  });
  return [
    {
      ...base,
      toolName: 'edit_file',
      description:
        'Ändert eine bestehende Datei: ersetzt old_text durch new_text. old_text muss genau ' +
        'EINMAL in der Datei vorkommen – kopiere ihn exakt (mit Einrückung) aus read_file, ohne ' +
        'Zeilennummern, und nimm genug Zeilen, damit er eindeutig ist. Für mehrere Stellen ' +
        'mehrere Aufrufe. Der Nutzer sieht vorher die Änderung und bestätigt sie.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Datei relativ zum Projekt.' },
          old_text: { type: 'string', description: 'Exakter bisheriger Text.' },
          new_text: {
            type: 'string',
            description: 'Neuer Text an seiner Stelle.',
          },
        },
        required: ['path', 'old_text', 'new_text'],
      },
      ...ask('edit_file'),
    },
    {
      ...base,
      toolName: 'write_file',
      description:
        'Legt eine neue Datei an (Ordner werden angelegt) oder ersetzt eine Datei ganz. ' +
        'Für Änderungen an bestehenden Dateien lieber edit_file. Der Nutzer bestätigt vorher.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Datei relativ zum Projekt.' },
          content: { type: 'string', description: 'Vollständiger Inhalt.' },
        },
        required: ['path', 'content'],
      },
      ...ask('write_file'),
    },
    {
      ...base,
      toolName: 'delete_file',
      description:
        'Löscht eine Datei (keine Ordner). Nur wenn der Nutzer es möchte; er bestätigt vorher.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Datei relativ zum Projekt.' },
        },
        required: ['path'],
      },
      ...ask('delete_file'),
    },
  ];
}

/** Rechnet aus, was eine Änderung bewirkt – wirft bei allem, was nicht geht. */
export async function planChange(
  ws: Workspace,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Planned> {
  const relative = typeof args.path === 'string' ? args.path : '';
  if (!relative.trim()) throw new Error('Pfad fehlt.');
  // Nur write_file darf eine neue Datei anlegen.
  const full = await ws.resolve(relative, toolName !== 'write_file');
  const rel = ws.relative(full);
  const before = await readText(full, rel);

  switch (toolName) {
    case 'edit_file': {
      if (before === null) throw new Error(`Gibt es nicht: ${rel}`);
      const oldText = typeof args.old_text === 'string' ? args.old_text : '';
      const newText = typeof args.new_text === 'string' ? args.new_text : '';
      if (!oldText) throw new Error('old_text fehlt.');
      if (oldText === newText)
        throw new Error('old_text und new_text sind gleich.');
      // Windows-Zeilenenden: vergleichen mit \n, zurückschreiben wie vorher.
      const crlf = before.includes('\r\n');
      const text = crlf ? before.replace(/\r\n/g, '\n') : before;
      const find = oldText.replace(/\r\n/g, '\n');
      const count = text.split(find).length - 1;
      if (count === 0) {
        throw new Error(
          `old_text kommt in ${rel} nicht vor – erst mit read_file den genauen Text nachsehen.`,
        );
      }
      if (count > 1) {
        throw new Error(
          `old_text kommt in ${rel} ${count}-mal vor – mehr Zeilen drumherum mitnehmen, damit er eindeutig ist.`,
        );
      }
      const replaced = text.replace(find, () => newText.replace(/\r\n/g, '\n'));
      return {
        path: rel,
        full,
        before,
        after: crlf ? replaced.replace(/\n/g, '\r\n') : replaced,
      };
    }
    case 'write_file': {
      const content = typeof args.content === 'string' ? args.content : null;
      if (content === null) throw new Error('content fehlt.');
      if (content.length > CODE_FILE_MAX)
        throw new Error('Inhalt ist größer als 1 MB.');
      if (before === content)
        throw new Error(`${rel} hat schon genau diesen Inhalt.`);
      return { path: rel, full, before, after: content };
    }
    case 'delete_file': {
      if (before === null) throw new Error(`Gibt es nicht: ${rel}`);
      return { path: rel, full, before, after: null };
    }
    default:
      throw new Error(`Das Werkzeug „${toolName}“ gibt es nicht.`);
  }
}

/** Vorher/Nachher als Unified Diff (für die Karte), gekürzt bei sehr großen Änderungen. */
export function changePreview(plan: Planned): string {
  const patch = createTwoFilesPatch(
    plan.before === null ? '/dev/null' : plan.path,
    plan.after === null ? '/dev/null' : plan.path,
    (plan.before ?? '').replace(/\r\n/g, '\n'),
    (plan.after ?? '').replace(/\r\n/g, '\n'),
    '',
    '',
    { context: 3 },
  );
  // Kopfzeilen von jsdiff („===“, „Index:“) brauchen wir nicht.
  const lines = patch.split('\n').filter((l) => !/^(=+|Index:)/.test(l));
  if (lines.at(-1) === '') lines.pop();
  if (lines.length > PREVIEW_LINES_MAX) {
    return [
      ...lines.slice(0, PREVIEW_LINES_MAX),
      `[… ${lines.length - PREVIEW_LINES_MAX} weitere Zeilen]`,
    ].join('\n');
  }
  return lines.join('\n');
}

/** Führt eine bestätigte Änderung aus – vorher wird der alte Stand gesichert. */
export async function applyChange(
  ws: Workspace,
  backups: CodeBackups,
  callId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  // Neu berechnen: Die Datei könnte sich seit der Vorschau geändert haben.
  const plan = await planChange(ws, toolName, args);
  await backups.save(callId, {
    workspace: ws.root,
    path: plan.path,
    before: plan.before,
    after: plan.after,
  });
  if (plan.after === null) {
    await rm(plan.full);
    return `Gelöscht: ${plan.path}`;
  }
  await mkdir(path.dirname(plan.full), { recursive: true });
  await writeFile(plan.full, plan.after, 'utf8');
  return plan.before === null
    ? `Angelegt: ${plan.path}`
    : `Geändert: ${plan.path}`;
}

async function readText(full: string, rel: string): Promise<string | null> {
  const info = await stat(full).catch(() => null);
  if (!info) return null;
  if (!info.isFile()) throw new Error(`Keine Datei: ${rel}`);
  if (info.size > CODE_FILE_MAX) throw new Error(`${rel} ist größer als 1 MB.`);
  const bytes = await readFile(full);
  if (bytes.subarray(0, 8000).includes(0)) {
    throw new Error(`${rel} ist keine Textdatei.`);
  }
  return bytes.toString('utf8');
}
