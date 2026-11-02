import type { ChatMessage, SourceRef } from './api';
import { sourceLabel } from './knowledge';
import { tr } from './messages';

/**
 * Treffer neu sortieren („Reranker“): Das Modell des Chats ordnet die Kandidaten der
 * Wissens-Suche in einem Aufruf nach ihrem Nutzen für die Frage. Es wird nur
 * umsortiert, nichts aussortiert – bei jedem Problem gilt die alte Reihenfolge.
 */

/** So viele Kandidaten der Suche werden dem Modell zum Sortieren gezeigt. */
export const RERANK_CANDIDATES = 12;
/** Wie lange das Sortieren höchstens dauern darf – danach gilt die alte Reihenfolge. */
export const RERANK_TIMEOUT_MS = 15_000;
/** Von jeder Textstelle sieht das Modell höchstens so viel (der Anfang): 400 bis 1500 Zeichen. */
const PASSAGE_CHARS_MIN = 400;
const PASSAGE_CHARS_MAX = 1500;
/** So viel vom Kontext darf die Anfrage zum Sortieren belegen (Rest: Antwort und Anweisung). */
const PROMPT_SHARE = 0.55;

/**
 * Wie viel jeder Textstelle das Modell sieht: so viel, dass alle Kandidaten in den Kontext
 * des Chats passen – mit demselben Kontext wie die Antwort, damit Ollama das Modell nicht
 * neu laden muss. Gemessen mit 600 Zeichen bei 4096 und 1500 bei 8192 Kontext.
 */
export function passageCharsFor(contextLength: number): number {
  const fit = Math.floor(
    (contextLength * PROMPT_SHARE * 4) / RERANK_CANDIDATES,
  );
  return Math.min(PASSAGE_CHARS_MAX, Math.max(PASSAGE_CHARS_MIN, fit - 20));
}

/** Antwortformat (JSON-Schema): eine Liste von Nummern – mehr kann das Modell nicht schreiben. */
export function rerankSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: { ranking: { type: 'array', items: { type: 'integer' } } },
    required: ['ranking'],
  };
}

/** Die Anfrage ans Modell: Frage und nummerierte Textstellen, klar als fremder Inhalt abgegrenzt. */
export function rerankMessages(
  question: string,
  sources: SourceRef[],
  passageChars: number,
): ChatMessage[] {
  const passages = sources
    .map((s, index) => {
      const text =
        s.text.length > passageChars
          ? `${s.text.slice(0, passageChars).trimEnd()} …`
          : s.text;
      const label = s.heading
        ? `${sourceLabel(s)} – ${s.heading}`
        : sourceLabel(s);
      return `[${index + 1}] ${label}\n${text}`;
    })
    .join('\n\n');
  return [
    { role: 'system', content: tr('prompt.rerankSystem') },
    {
      role: 'user',
      content: tr('prompt.rerankUser', {
        question: question.trim(),
        passages: `<<<STELLEN\n${passages}\nSTELLEN>>>`,
      }),
    },
  ];
}

/**
 * Liest die Antwort: gültige, nicht doppelte Nummern von 1 bis `count` in der Reihenfolge
 * des Modells; was fehlt, kommt in der alten Reihenfolge dahinter. Null = unbrauchbar.
 */
export function parseRanking(answer: string, count: number): number[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(answer);
  } catch {
    return null;
  }
  const list = (raw as { ranking?: unknown })?.ranking;
  if (!Array.isArray(list)) return null;
  const order: number[] = [];
  for (const item of list) {
    if (
      typeof item === 'number' &&
      Number.isInteger(item) &&
      item >= 1 &&
      item <= count &&
      !order.includes(item - 1)
    ) {
      order.push(item - 1);
    }
  }
  if (order.length === 0) return null;
  for (let i = 0; i < count; i++) if (!order.includes(i)) order.push(i);
  return order;
}

/** Ordnet die Einträge nach einer Reihenfolge aus `parseRanking`. */
export function applyRanking<T>(items: T[], order: number[]): T[] {
  return order.map((index) => items[index]);
}

/**
 * Die Treffer, die ans Modell gehen: die ersten `k` – in der neuen Reihenfolge, falls das
 * Sortieren geklappt hat (dann mit `reranked`), sonst in der alten. Neu durchnummeriert,
 * damit [1], [2] … im Text zu den Quellen passen.
 */
export function topSources(
  sources: SourceRef[],
  reranked: SourceRef[] | null,
  k: number,
): SourceRef[] {
  return (reranked ?? sources).slice(0, k).map((source, index) => ({
    ...source,
    n: index + 1,
    ...(reranked && { reranked: true }),
  }));
}
