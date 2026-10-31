import type { ChatRequest, MessageRecord, SourceRef } from './api';
import { tr } from './messages';

/** Gespeicherte Quellen lesen – eine kaputte Zeile soll die App nicht stoppen. */
export function parseSources(
  json: string | null,
): Pick<MessageRecord, 'sources' | 'knowledgeError'> {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as { sources?: unknown; error?: unknown };
    const sources = Array.isArray(raw.sources)
      ? raw.sources.filter(isSourceRef)
      : [];
    return {
      sources,
      ...(typeof raw.error === 'string' && { knowledgeError: raw.error }),
    };
  } catch {
    return {};
  }
}

function isSourceRef(value: unknown): value is SourceRef {
  const s = value as Partial<SourceRef> | null;
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.n === 'number' &&
    typeof s.documentId === 'string' &&
    typeof s.path === 'string' &&
    typeof s.text === 'string'
  );
}

/** Wörter, die in fast jeder Frage stehen und nichts über das Thema sagen. */
const STOPWORDS = new Set(
  (
    'der die das den dem des ein eine einen einem einer eines und oder aber ist sind war ' +
    'wie was wer wo wann warum wieso welche welcher welches ich du er sie es wir ihr mir mich ' +
    'mein meine dein deine sein seine kann können muss müssen soll sollen wird werden hat ' +
    'haben habe bin bist mit von für auf aus bei nach über unter vor zum zur im in an am ' +
    'nicht kein keine auch noch nur schon sehr mal bitte gibt steht stehen dazu darin ' +
    'the and for are was what which who how why with from this that have has can does ' +
    'is of to in on at it you your me my we our they their do did will would should could not no yes ' +
    'also only very just please there here about into than then when where'
  ).split(' '),
);

/** Die Wörter einer Frage, die etwas über das Thema sagen (klein, ohne Doppelte). */
export function contentWords(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => (w.length >= 3 || /\d/.test(w)) && !STOPWORDS.has(w)),
    ),
  ];
}

/**
 * Wonach im Wissen gesucht wird: die neue Nachricht – und bei einer Nachfrage
 * ohne eigenes Thema („Und die Nebenkosten?“, „Was noch?“) zusätzlich die vorige
 * Frage. Bewusst nicht nach Länge entschieden: „Wer hat die WM 2014 gewonnen?“
 * ist kurz, wechselt aber das Thema – mit der vorigen Frage zusammen hätte die
 * Suche zum alten Thema gegriffen (so im Test passiert).
 */
export function knowledgeQuery(
  history: MessageRecord[],
  question: string,
): string {
  const trimmed = question.trim();
  if (contentWords(trimmed).length > 1) return trimmed;
  const previous = [...history].reverse().find((m) => m.role === 'user');
  return previous ? `${previous.content.trim()}\n${trimmed}` : trimmed;
}

/** Kurzbezeichnung einer Quelle für das Modell und die Anzeige, z. B. „skript.pdf, S. 12“. */
export function sourceLabel(source: Pick<SourceRef, 'path' | 'page'>): string {
  const name = source.path.split(/[\\/]/).pop() ?? source.path;
  return source.page
    ? `${name}, ${tr('prompt.page', { page: source.page })}`
    : name;
}

/**
 * Gibt dem Modell die gefundenen Textstellen mit – nur für diese eine Anfrage.
 * Gespeichert wird weiter die Frage, wie du sie geschrieben hast; so bleibt der
 * Verlauf kurz, und jede neue Frage sucht frisch.
 */
export function withKnowledge(
  request: ChatRequest,
  sources: SourceRef[],
): ChatRequest {
  if (sources.length === 0) return request;
  const messages = [...request.messages];
  const last = messages.length - 1;
  if (last < 0 || messages[last].role !== 'user') return request;

  const excerpts = sources
    .map((s) => `[${s.n}] ${sourceLabel(s)}\n${s.text}`)
    .join('\n\n');
  messages[last] = {
    ...messages[last],
    content:
      `${tr('prompt.knowledgeIntro')}\n\n` +
      `${excerpts}\n\n---\n\n${tr('prompt.knowledgeQuestion', { question: messages[last].content })}`,
  };
  return { ...request, messages };
}
