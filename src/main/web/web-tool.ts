import { tr } from '../../shared/messages';
import type { OfferedTool } from '../../shared/tools';
import {
  normalizeLink,
  WEB_TOOL_NAME,
  WEB_TOOL_SERVER,
  webPageChars,
} from '../../shared/web';
import { checkWebUrl } from './address';
import { extractWebText } from './extract';
import { fetchWebPage, type WebFetchDeps } from './fetch';

/** Eingaben des Modells, geprüft. */
export interface WebArguments {
  url: string;
  offset: number;
}

/** Prüft die Eingaben des Modells: „url“ ein Text, „offset“ (optional) eine ganze Zahl ab 0. */
export function checkWebArguments(args: unknown): WebArguments | null {
  if (typeof args !== 'object' || args === null) return null;
  const { url, offset } = args as Record<string, unknown>;
  if (typeof url !== 'string' || url.trim() === '') return null;
  let start = 0;
  if (offset !== undefined && offset !== null && offset !== '') {
    // Manche Modelle schicken Zahlen als Text („20000“).
    const number =
      typeof offset === 'string' && /^\d{1,15}$/.test(offset.trim())
        ? Number(offset.trim())
        : offset;
    if (
      typeof number !== 'number' ||
      !Number.isSafeInteger(number) ||
      number < 0
    )
      return null;
    start = number;
  }
  return { url: url.trim(), offset: start };
}

/**
 * Das Werkzeug „Webseite lesen“ (nur mit eingeschaltetem Schalter „Internet“). Es fragt jedes Mal
 * nach (ohne „Immer erlauben“) – außer bei Adressen, die du selbst in eine Nachricht dieses Chats
 * geschrieben hast (`userLinks`, normalisiert): die liest es ohne Karte.
 */
export function webTool(userLinks: ReadonlySet<string>): OfferedTool {
  return {
    serverId: WEB_TOOL_SERVER,
    serverName: tr('web.serverName'),
    toolName: WEB_TOOL_NAME,
    description: tr('web.toolDescription'),
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: tr('web.urlDescription') },
        offset: { type: 'integer', description: tr('web.offsetDescription') },
      },
      required: ['url'],
    },
    destructive: false,
    permission: 'ask',
    alwaysAsk: true,
    describe: async (args) => {
      const checked = checkWebArguments(args);
      if (!checked) throw new Error(tr('web.badArguments'));
      const url = checkWebUrl(checked.url);
      if (!url.ok) throw new Error(url.error);
      return checked.offset > 0
        ? tr('web.previewFrom', {
            url: url.value.href,
            offset: checked.offset,
          })
        : tr('web.preview', { url: url.value.href });
    },
    autoAllow: (args) => {
      const checked = checkWebArguments(args);
      const link = checked && normalizeLink(checked.url);
      return !!link && userLinks.has(link);
    },
  };
}

/**
 * Wo das Stück endet: lieber nach einem Absatz oder einer Zeile als mitten im Wort,
 * solange dafür nicht mehr als ein Fünftel des Stücks wegfällt.
 */
function cutPoint(text: string, start: number, size: number): number {
  const end = start + size;
  if (end >= text.length) return text.length;
  const window = text.slice(start, end);
  const floor = Math.floor(size * 0.8);
  for (const separator of ['\n\n', '\n', '. ', ' ']) {
    const at = window.lastIndexOf(separator);
    if (at >= floor) return start + at + separator.length;
  }
  return end;
}

export interface WebCallOptions {
  contextLength: number;
  signal: AbortSignal;
  /** Nur für Tests. */
  deps?: WebFetchDeps;
}

/**
 * Liest die Seite und gibt dem Modell ein Stück ihres Haupttextes: gerahmt als unzuverlässiger
 * Inhalt, mit Adresse, Titel und – bei langen Seiten – dem `offset` zum Weiterlesen.
 * Wirft mit fertigem Text, wenn die Seite nicht gelesen werden kann.
 */
export async function callWebTool(
  args: Record<string, unknown>,
  { contextLength, signal, deps }: WebCallOptions,
): Promise<string> {
  const checked = checkWebArguments(args);
  if (!checked) throw new Error(tr('web.badArguments'));
  const url = (deps?.checkUrl ?? checkWebUrl)(checked.url);
  if (!url.ok) throw new Error(url.error);
  const fetched = await fetchWebPage(url.value, signal, deps);
  if (!fetched.ok) throw new Error(fetched.error);
  const page = fetched.value;
  signal.throwIfAborted();

  const { title, text, thin } = extractWebText(
    page.text,
    page.contentType,
    page.url,
  );
  const head = [
    tr('web.frame'),
    tr('web.header', { url: page.url, title: title || '–' }),
  ];
  const notes = [
    ...(thin ? [tr('web.thin')] : []),
    ...(page.truncated ? [tr('web.bigPage')] : []),
  ];
  if (text === '') return [...head, tr('web.empty'), ...notes].join('\n');
  if (checked.offset >= text.length) {
    throw new Error(
      tr('web.beyond', { total: text.length, offset: checked.offset }),
    );
  }

  const end = cutPoint(text, checked.offset, webPageChars(contextLength));
  // Der Rahmen soll nicht von der Seite selbst „geschlossen“ werden können.
  const piece = text
    .slice(checked.offset, end)
    .trimEnd()
    .replaceAll('WEB>>>', 'WEB> >>');
  return [
    ...head,
    ...(checked.offset > 0 || end < text.length
      ? [tr('web.range', { from: checked.offset, to: end, total: text.length })]
      : []),
    `<<<WEB\n${piece}\nWEB>>>`,
    ...(end < text.length
      ? [
          tr('web.more', {
            rest: text.length - end,
            tool: WEB_TOOL_NAME,
            next: end,
          }),
        ]
      : []),
    ...notes,
  ].join('\n');
}
