import type { ChatMessage } from './api';
import { tr } from './messages';
import { normalizeLink, webPageChars, type WebSearchHit } from './web';

/**
 * Deep Research: LocalDesk führt die Recherche in einem festen Ablauf aus – Plan (Suchanfragen),
 * Suchen, Seiten lesen, je Seite Notizen, Bericht. Das Modell macht je Aufruf nur eine kleine
 * Aufgabe; es wählt nie selbst Adressen. Dieses Modul hat die reinen Bausteine (ohne Netz, ohne
 * Modell), damit sie sich einzeln testen lassen.
 */

export const RESEARCH_TOOL_SERVER = 'research';

export type ResearchDepth = 'quick' | 'normal' | 'deep';

export interface DepthSpec {
  /** So viele Suchanfragen (und damit Anfragen an den Suchdienst) höchstens. */
  searches: number;
  /** So viele Seiten werden höchstens gelesen. */
  pages: number;
  /** So viel Kontext braucht der Chat mindestens. */
  minContext: number;
}

export const RESEARCH_DEPTHS: Record<ResearchDepth, DepthSpec> = {
  quick: { searches: 2, pages: 5, minContext: 8192 },
  normal: { searches: 4, pages: 10, minContext: 8192 },
  deep: { searches: 6, pages: 16, minContext: 16384 },
};

export const RESEARCH_DEFAULT_DEPTH: ResearchDepth = 'normal';
export const RESEARCH_DEPTH_LIST: readonly ResearchDepth[] = [
  'quick',
  'normal',
  'deep',
];

export function isResearchDepth(value: unknown): value is ResearchDepth {
  return (
    typeof value === 'string' &&
    (RESEARCH_DEPTH_LIST as readonly string[]).includes(value)
  );
}

/** Längster Rechercheauftrag (Zeichen). */
export const RESEARCH_QUESTION_MAX = 2000;
/** Länge einer Suchanfrage aus dem Plan. */
export const RESEARCH_QUERY_MAX = 150;
/** So viele Fakten notiert das Modell höchstens je Seite, jeder höchstens so lang. */
export const RESEARCH_FACTS_MAX = 5;
export const RESEARCH_FACT_CHARS = 300;
/** Eine Seite braucht mindestens so viel Text, sonst lohnt sich ein Notiz-Aufruf nicht. */
export const RESEARCH_PAGE_MIN_CHARS = 200;
/** Von einer Seite liest das Modell höchstens so viel (der Anfang), auch bei großem Kontext. */
const PAGE_CHARS_MAX = 12_000;
/** Zeit je Modell-Aufruf für Plan und Notizen – danach gilt der Aufruf als gescheitert. */
export const RESEARCH_PLAN_TIMEOUT_MS = 90_000;
export const RESEARCH_NOTES_TIMEOUT_MS = 180_000;

/** Die Endungen, die LocalDesk nicht als Text liest – solche Treffer werden übersprungen. */
const SKIPPED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'zip',
  'gz',
  'tar',
  '7z',
  'rar',
  'mp3',
  'mp4',
  'avi',
  'mov',
  'mkv',
  'wav',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'exe',
  'dmg',
  'iso',
]);

/** Wie viel Kontext das Modell für den Bericht abzüglich Anweisung und Antwort bekommt, in Zeichen. */
export function notesBudgetChars(contextLength: number): number {
  return Math.max(3000, Math.floor((contextLength - 3000) * 3.6));
}

/** Wie viel Text einer Seite in einen Notiz-Aufruf geht. */
export function pageChars(contextLength: number): number {
  return Math.min(PAGE_CHARS_MAX, webPageChars(contextLength));
}

/** Reicht die Kontextlänge des Chats für diese Stufe? */
export function contextFits(
  depth: ResearchDepth,
  contextLength: number,
): boolean {
  return contextLength >= RESEARCH_DEPTHS[depth].minContext;
}

/** Ein Text als eine Zeile, gekürzt. */
export function oneLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Der Rechercheauftrag: nicht leer, höchstens `RESEARCH_QUESTION_MAX` Zeichen; sonst null. */
export function checkQuestion(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const text = input.replace(/\r\n?/g, '\n').trim();
  return text !== '' && text.length <= RESEARCH_QUESTION_MAX ? text : null;
}

// ---------------------------------------------------------------- Plan

/** Antwortformat des Plans: nur eine Liste von Suchanfragen. */
export function planSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: { queries: { type: 'array', items: { type: 'string' } } },
    required: ['queries'],
  };
}

export function planMessages(question: string, count: number): ChatMessage[] {
  return [
    { role: 'system', content: tr('research.planSystem') },
    { role: 'user', content: tr('research.planUser', { question, count }) },
  ];
}

/**
 * Die Suchanfragen aus der Antwort des Modells: eine Zeile, höchstens 150 Zeichen, ohne
 * Doppelte, höchstens `max`. Ist die Antwort unbrauchbar, sucht LocalDesk mit der Frage selbst.
 */
export function parsePlan(
  answer: string,
  max: number,
  question: string,
): string[] {
  const fallback = [oneLine(question, RESEARCH_QUERY_MAX)];
  let raw: unknown;
  try {
    raw = JSON.parse(answer);
  } catch {
    return fallback;
  }
  const list = (raw as { queries?: unknown })?.queries;
  if (!Array.isArray(list)) return fallback;
  const queries: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const query = oneLine(item, RESEARCH_QUERY_MAX);
    const key = query.toLowerCase();
    if (!query || seen.has(key)) continue;
    seen.add(key);
    queries.push(query);
    if (queries.length >= max) break;
  }
  return queries.length > 0 ? queries : fallback;
}

// ---------------------------------------------------------------- Seiten auswählen

/** Eine Seite, die gelesen werden soll. */
export interface PagePick {
  url: string;
  title: string;
  /** Aus welcher Suchanfrage (Nummer ab 0). */
  query: number;
}

function isSkippedUrl(url: string): boolean {
  try {
    const last = new URL(url).pathname.split('/').pop() ?? '';
    const dot = last.lastIndexOf('.');
    return (
      dot >= 0 && SKIPPED_EXTENSIONS.has(last.slice(dot + 1).toLowerCase())
    );
  } catch {
    return true;
  }
}

/**
 * Welche Seiten gelesen werden: reihum über die Suchanfragen (erst der beste Treffer jeder
 * Anfrage, dann der zweite …), damit jeder Aspekt Seiten bekommt. Ohne Doppelte, ohne Treffer,
 * die LocalDesk nicht als Text liest (PDF, Bilder, Archive …).
 */
export function selectPages(hits: WebSearchHit[][], max: number): PagePick[] {
  const picks: PagePick[] = [];
  const seen = new Set<string>();
  const rounds = Math.max(0, ...hits.map((list) => list.length));
  for (let rank = 0; rank < rounds && picks.length < max; rank++) {
    for (let query = 0; query < hits.length && picks.length < max; query++) {
      const hit = hits[query][rank];
      if (!hit) continue;
      const url = normalizeLink(hit.url);
      if (!url || seen.has(url) || isSkippedUrl(url)) continue;
      seen.add(url);
      picks.push({ url, title: hit.title, query });
    }
  }
  return picks;
}

// ---------------------------------------------------------------- Notizen

/** Antwortformat der Notizen: „relevant“ und eine Liste kurzer Fakten. */
export function notesSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      relevant: { type: 'boolean' },
      facts: { type: 'array', items: { type: 'string' } },
    },
    required: ['relevant', 'facts'],
  };
}

/** Der Host einer Adresse für die Anzeige (ohne „www.“). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Die Anfrage zum Notieren: Frage und der Anfang der Seite, klar als fremder Inhalt abgegrenzt. */
export function notesMessages(
  question: string,
  page: { title: string; url: string; text: string },
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: tr('research.notesSystem', { max: RESEARCH_FACTS_MAX }),
    },
    {
      role: 'user',
      content: tr('research.notesUser', {
        question,
        title: oneLine(page.title, 150) || hostOf(page.url),
        host: hostOf(page.url),
        page: `<<<SEITE\n${page.text}\nSEITE>>>`,
      }),
    },
  ];
}

/**
 * Die Fakten aus der Antwort: höchstens 5, je eine Zeile bis 300 Zeichen, ohne Doppelte.
 * Leere Liste = nicht relevant, null = unlesbare Antwort.
 */
export function parseNotes(answer: string): string[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(answer);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const { relevant, facts } = raw as { relevant?: unknown; facts?: unknown };
  if (!Array.isArray(facts)) return null;
  if (relevant === false) return [];
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const item of facts) {
    const fact = oneLine(item, RESEARCH_FACT_CHARS);
    const key = fact.toLowerCase();
    if (!fact || seen.has(key)) continue;
    seen.add(key);
    notes.push(fact);
    if (notes.length >= RESEARCH_FACTS_MAX) break;
  }
  return notes;
}

// ---------------------------------------------------------------- Bericht

/** Eine gelesene Seite mit ihren Fakten – so geht sie in den Bericht. */
export interface ResearchSource {
  /** Nummer, mit der der Bericht zitiert: [1], [2] … (ab 1, ohne Lücken). */
  n: number;
  title: string;
  url: string;
  facts: string[];
}

const textLength = (source: ResearchSource) =>
  source.title.length +
  source.facts.reduce((sum, f) => sum + f.length + 4, 0) +
  20;

/**
 * Passt die Notizen in den Platz für den Bericht: erst weniger Fakten je Quelle (5 → 1), dann
 * fallen die hinteren Quellen weg (die zuletzt gelesenen, also am wenigsten wichtigen). Mindestens
 * eine Quelle bleibt. Neu durchnummeriert, damit [1], [2] … ohne Lücken zu den Quellen passen.
 */
export function fitNotes(
  sources: Omit<ResearchSource, 'n'>[],
  maxChars: number,
): ResearchSource[] {
  const total = (list: ResearchSource[]) =>
    list.reduce((sum, s) => sum + textLength(s), 0);
  const number = (list: Omit<ResearchSource, 'n'>[], perSource: number) =>
    list.map((s, index) => ({
      ...s,
      n: index + 1,
      facts: s.facts.slice(0, perSource),
    }));
  for (let perSource = RESEARCH_FACTS_MAX; perSource >= 1; perSource--) {
    const list = number(sources, perSource);
    if (total(list) <= maxChars) return list;
  }
  let list = number(sources, 1);
  while (list.length > 1 && total(list) > maxChars) list = list.slice(0, -1);
  return list;
}

/** Die Notizen als Text für den Bericht. */
export function notesText(sources: ResearchSource[]): string {
  return sources
    .map(
      (s) =>
        `[${s.n}] ${oneLine(s.title, 150) || hostOf(s.url)} (${hostOf(s.url)})\n${s.facts.map((f) => `- ${f}`).join('\n')}`,
    )
    .join('\n\n');
}

export function reportMessages(
  question: string,
  sources: ResearchSource[],
): ChatMessage[] {
  return [
    { role: 'system', content: tr('research.reportSystem') },
    {
      role: 'user',
      content: tr('research.reportUser', {
        question,
        notes: `<<<NOTIZEN\n${notesText(sources)}\nNOTIZEN>>>`,
      }),
    },
  ];
}

/** Zitate wie [2], [1][3] oder [1, 4] im Bericht: die Nummern, die zu keiner Quelle gehören. */
export function badCitations(report: string, sourceCount: number): number[] {
  const bad = new Set<number>();
  for (const match of report.matchAll(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g)) {
    for (const part of match[1].split(/[,;]/)) {
      const n = Number(part.trim());
      if (n < 1 || n > sourceCount) bad.add(n);
    }
  }
  return [...bad].sort((a, b) => a - b);
}

/** Titel für die Quellenliste: eine Zeile, ohne eckige Klammern (würden den Link zerreißen). */
function linkTitle(source: ResearchSource): string {
  return oneLine(source.title, 150).replace(/[[\]]/g, '') || hostOf(source.url);
}

/**
 * Das, was LocalDesk an den Bericht hängt: die Quellenliste (echte Titel und Adressen, vom
 * Modell nie umgeschrieben), der Hinweis „Quellen prüfen“ und – falls der Bericht Nummern nennt,
 * die es nicht gibt – ein Hinweis darauf.
 */
export function reportFooter(
  report: string,
  sources: ResearchSource[],
): string {
  const bad = badCitations(report, sources.length);
  return [
    '',
    '',
    tr('research.sourcesTitle'),
    '',
    ...sources.map(
      (s) => `${s.n}. [${linkTitle(s)}](${s.url}) – ${hostOf(s.url)}`,
    ),
    '',
    tr('research.disclaimer'),
    ...(bad.length > 0
      ? [
          '',
          tr('research.badCitations', {
            list: bad.map((n) => `[${n}]`).join(', '),
          }),
        ]
      : []),
    '',
  ].join('\n');
}
