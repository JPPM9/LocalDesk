import type { MessageRecord } from '../../shared/api';
import { tr } from '../../shared/messages';
import type { OfferedTool } from '../../shared/tools';
import {
  extractLinks,
  normalizeLink,
  WEB_SEARCH_QUERY_MAX,
  WEB_SEARCH_RESULTS,
  WEB_SEARCH_TOOL,
  WEB_TOOL_NAME,
  WEB_TOOL_SERVER,
  webPageChars,
  type WebSearchHit,
} from '../../shared/web';
import { checkWebUrl } from './address';
import { extractWebText } from './extract';
import { fetchWebPage, type WebFetchDeps } from './fetch';
import { searchWeb, type WebSearchDeps } from './search';

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
 * nach (ohne „Immer erlauben“) – außer bei Adressen in `userLinks` (normalisiert): die liest es
 * ohne Karte. Das sind die, die du selbst in eine Nachricht dieses Chats geschrieben hast, und
 * (mit der Websuche) die Adressen aus den Suchergebnissen – die Menge wächst mit jeder Suche.
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

/** Die Suchanfrage des Modells als eine Zeile; null, wenn sie fehlt oder zu lang ist. */
export function checkSearchArguments(args: unknown): string | null {
  if (typeof args !== 'object' || args === null) return null;
  const { query } = args as Record<string, unknown>;
  if (typeof query !== 'string') return null;
  // Eine Zeile: So kann die Anfrage keine eigenen Zeilen im Ergebnis vortäuschen.
  const text = query.replace(/\s+/g, ' ').trim();
  return text !== '' && text.length <= WEB_SEARCH_QUERY_MAX ? text : null;
}

/**
 * Das Werkzeug „Im Web suchen“ (nur mit dem Haken „Im Web suchen“ und einem Schlüssel). Läuft
 * ohne Karte – den Haken hast du selbst gesetzt, und die Anfrage steht im Chat. `describe` zeigt
 * sie nur, wenn ein Ollama-Server auf einem anderen Rechner jedes Werkzeug bestätigen lässt.
 */
export function webSearchTool(): OfferedTool {
  return {
    serverId: WEB_TOOL_SERVER,
    serverName: tr('web.serverName'),
    toolName: WEB_SEARCH_TOOL,
    description: tr('web.searchToolDescription', { max: WEB_SEARCH_RESULTS }),
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: tr('web.searchQueryDescription'),
        },
      },
      required: ['query'],
    },
    destructive: false,
    permission: 'always',
    describe: async (args) => {
      const query = checkSearchArguments(args);
      if (!query) {
        throw new Error(
          tr('web.searchBadArguments', { max: WEB_SEARCH_QUERY_MAX }),
        );
      }
      return tr('web.searchPreview', { query });
    },
  };
}

/**
 * Das Ergebnis für das Modell: Rahmen „unzuverlässig“, die Suche, dann je Treffer Titel,
 * Adresse (allein in einer Zeile, eingerückt – so findet `searchResultLinks` sie wieder) und
 * Auszug (mit Beschriftung, kann also nie wie eine Adresszeile aussehen).
 */
export function formatSearchResults(
  query: string,
  hits: WebSearchHit[],
): string {
  const head = [tr('web.searchFrame'), tr('web.searchHeader', { query })];
  if (hits.length === 0)
    return [...head, tr('web.searchNone', { query })].join('\n');
  return [
    ...head,
    ...hits.flatMap((hit, index) => [
      `[${index + 1}] ${hit.title}`,
      `    ${hit.url}`,
      ...(hit.snippet
        ? [`    ${tr('web.searchExcerpt')}: ${hit.snippet}`]
        : []),
    ]),
  ].join('\n');
}

/**
 * Die Adressen der Treffer aus einem früheren Suchergebnis (nur die Adresszeilen, die
 * `formatSearchResults` geschrieben hat – nie Adressen aus Titeln oder Auszügen).
 */
export function searchResultLinks(result: string): string[] {
  const links: string[] = [];
  for (const line of result.split('\n')) {
    const match = /^ {4}(https?:\/\/\S+)$/.exec(line);
    const link = match && normalizeLink(match[1]);
    if (link) links.push(link);
  }
  return links;
}

export interface WebSearchCallOptions {
  /** Der Ollama-Schlüssel; null, wenn keiner (mehr) gespeichert ist. */
  apiKey: string | null;
  signal: AbortSignal;
  /** Hier kommen die Adressen der Treffer hinein – ab dann liest `read_webpage` sie ohne Karte. */
  links: Set<string>;
  /** Nur für Tests. */
  deps?: WebSearchDeps;
}

/** Sucht und gibt dem Modell die Treffer. Wirft mit fertigem Text, wenn die Suche nicht klappt. */
export async function callWebSearchTool(
  args: Record<string, unknown>,
  { apiKey, signal, links, deps }: WebSearchCallOptions,
): Promise<string> {
  const query = checkSearchArguments(args);
  if (!query) {
    throw new Error(
      tr('web.searchBadArguments', { max: WEB_SEARCH_QUERY_MAX }),
    );
  }
  if (!apiKey) throw new Error(tr('web.searchNoKey'));
  const found = await searchWeb(
    query,
    apiKey,
    signal,
    WEB_SEARCH_RESULTS,
    deps,
  );
  if (!found.ok) throw new Error(found.error);
  for (const hit of found.value) links.add(hit.url);
  return formatSearchResults(query, found.value);
}

/** Was das Modell in diesem Chat im Web darf – für eine Antwort. */
export interface WebAccess {
  /** Schalter „Internet“: Webseiten lesen. */
  read: boolean;
  /** Der Ollama-Schlüssel, wenn „Im Web suchen“ an ist und einer gespeichert ist; sonst null (keine Suche). */
  searchKey: string | null;
  /** Adressen, die `read_webpage` ohne Karte liest (normalisiert); wächst mit jeder Suche. */
  links: Set<string>;
}

/**
 * Die Adressen, die in diesem Chat ohne Rückfrage gelesen werden: die du selbst in eine Nachricht
 * geschrieben hast (nur dein eigener Text – nie Datei-, Webseiten- oder Modelltext) und, wenn
 * „Im Web suchen“ an ist, die Adressen aus den Suchergebnissen früherer Antworten.
 */
export function chatWebLinks(
  history: readonly MessageRecord[],
  content: string,
  withSearchResults: boolean,
): string[] {
  const written = extractLinks(
    [
      ...history.filter((m) => m.role === 'user').map((m) => m.content),
      content,
    ].join('\n'),
  );
  if (!withSearchResults) return written;
  const found = history.flatMap((m) =>
    (m.toolCalls ?? [])
      .filter(
        (call) =>
          call.serverId === WEB_TOOL_SERVER &&
          call.toolName === WEB_SEARCH_TOOL &&
          call.status === 'done',
      )
      .flatMap((call) => searchResultLinks(call.result ?? '')),
  );
  return [...new Set([...written, ...found])];
}
