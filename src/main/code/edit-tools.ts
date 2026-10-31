import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { CODE_TOOL_SERVER } from '../../shared/code';
import type { OfferedTool } from '../../shared/tools';
import type { CodeBackups } from './backups';
import { CODE_FILE_MAX, type Workspace } from './workspace';
import { tr } from '../../shared/messages';

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
      description: tr('tool.editFile'),
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: tr('tool.pathInProject') },
          old_text: { type: 'string', description: tr('tool.oldText') },
          new_text: {
            type: 'string',
            description: tr('tool.newText'),
          },
        },
        required: ['path', 'old_text', 'new_text'],
      },
      ...ask('edit_file'),
    },
    {
      ...base,
      toolName: 'write_file',
      description: tr('tool.writeFile'),
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: tr('tool.pathInProject') },
          content: { type: 'string', description: tr('tool.fullContent') },
        },
        required: ['path', 'content'],
      },
      ...ask('write_file'),
    },
    {
      ...base,
      toolName: 'delete_file',
      description: tr('tool.deleteFile'),
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: tr('tool.pathInProject') },
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
  if (!relative.trim()) throw new Error(tr('code.pathMissing'));
  // Nur write_file darf eine neue Datei anlegen.
  const full = await ws.resolve(relative, toolName !== 'write_file');
  const rel = ws.relative(full);
  const before = await readText(full, rel);

  switch (toolName) {
    case 'edit_file': {
      if (before === null) throw new Error(tr('code.notFound', { path: rel }));
      const oldText = typeof args.old_text === 'string' ? args.old_text : '';
      const newText = typeof args.new_text === 'string' ? args.new_text : '';
      if (!oldText) throw new Error(tr('code.oldTextMissing'));
      if (oldText === newText) throw new Error(tr('code.textsEqual'));
      // Windows-Zeilenenden: vergleichen mit \n, zurückschreiben wie vorher.
      const crlf = before.includes('\r\n');
      const text = crlf ? before.replace(/\r\n/g, '\n') : before;
      const find = oldText.replace(/\r\n/g, '\n');
      const count = text.split(find).length - 1;
      if (count === 0) {
        throw new Error(tr('code.oldTextNotFound', { path: rel }));
      }
      if (count > 1) {
        throw new Error(tr('code.oldTextAmbiguous', { path: rel, count }));
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
      if (content === null) throw new Error(tr('code.contentMissing'));
      if (content.length > CODE_FILE_MAX)
        throw new Error(tr('code.contentTooLarge'));
      if (before === content)
        throw new Error(tr('code.sameContent', { path: rel }));
      return { path: rel, full, before, after: content };
    }
    case 'delete_file': {
      if (before === null) throw new Error(tr('code.notFound', { path: rel }));
      return { path: rel, full, before, after: null };
    }
    default:
      throw new Error(tr('error.toolMissing', { tool: toolName }));
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
      tr('code.moreLines', { count: lines.length - PREVIEW_LINES_MAX }),
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
    return tr('code.deleted', { path: plan.path });
  }
  await mkdir(path.dirname(plan.full), { recursive: true });
  await writeFile(plan.full, plan.after, 'utf8');
  return plan.before === null
    ? tr('code.created', { path: plan.path })
    : tr('code.changed', { path: plan.path });
}

async function readText(full: string, rel: string): Promise<string | null> {
  const info = await stat(full).catch(() => null);
  if (!info) return null;
  if (!info.isFile()) throw new Error(tr('code.notAFile', { path: rel }));
  if (info.size > CODE_FILE_MAX)
    throw new Error(tr('code.fileTooLarge', { path: rel }));
  const bytes = await readFile(full);
  if (bytes.subarray(0, 8000).includes(0)) {
    throw new Error(tr('code.notText', { path: rel }));
  }
  return bytes.toString('utf8');
}
