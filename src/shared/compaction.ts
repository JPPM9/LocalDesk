import type { ChatMessage, ChatRequest, MessageRecord } from './api';
import { estimateTokens } from './context';
import { tr } from './messages';
import { toRequestMessages } from './chat';

/**
 * Kontext verdichten: Der ältere Teil eines langen Chats wird zu einer Zusammenfassung,
 * die im Verlauf an die Stelle der alten Nachrichten tritt. Die Nachrichten bleiben
 * gespeichert und sichtbar; nur die Anfrage ans Modell wird kürzer.
 */

/** Gespeicherte Verdichtung eines Chats. */
export interface ChatCompaction {
  /** Die Zusammenfassung (so, wie du sie übernommen hast). */
  summary: string;
  /** Letzte Nachricht, die sie ersetzt – alles bis dahin steht nur noch als Zusammenfassung im Verlauf. */
  upToMessageId: string;
  /** Wie viele Nachrichten des Chats damit ersetzt sind. */
  messagesCovered: number;
  /** Geschätzte Tokens von Verlauf plus Zusammenfassung davor und danach. */
  tokensBefore: number;
  tokensAfter: number;
  createdAt: number;
}

/** Der Vorschlag des Modells, den du prüfst und bearbeitest, bevor er gilt. */
export interface CompactionDraft {
  summary: string;
  upToMessageId: string;
  messagesCovered: number;
  tokensBefore: number;
  tokensAfter: number;
}

/** Längste Zusammenfassung, die gespeichert wird. */
export const COMPACTION_SUMMARY_MAX = 20_000;
/** So viel vom Kontext bleibt als jüngster Teil des Chats unverändert. */
export const COMPACTION_KEEP_SHARE = 0.4;
/** Das Zusammenfassen läuft in Abschnitten, die höchstens so viel vom Kontext belegen. */
const CHUNK_SHARE = 0.5;
const CHARS_PER_TOKEN = 4;

const messageTokens = (message: MessageRecord) =>
  toRequestMessages([message]).reduce(
    (sum, m) => sum + estimateTokens(m.content) + 4,
    0,
  );

/** Tokens, die diese Nachrichten (plus eine Zusammenfassung davor) in der Anfrage belegen. */
export function historyTokens(
  messages: MessageRecord[],
  summary?: string,
): number {
  return (
    messages.reduce((sum, m) => sum + messageTokens(m), 0) +
    (summary ? estimateTokens(summary) : 0)
  );
}

/**
 * Der Teil des Verlaufs, der noch einzeln ans Modell geht: alles nach der verdichteten
 * Nachricht. Gibt es die Nachricht nicht (mehr), gilt die Verdichtung nicht.
 */
export function compactedHistory(
  messages: MessageRecord[],
  compaction: ChatCompaction | undefined | null,
): { messages: MessageRecord[]; compaction: ChatCompaction | null } {
  if (!compaction) return { messages, compaction: null };
  const index = messages.findIndex((m) => m.id === compaction.upToMessageId);
  if (index < 0) return { messages, compaction: null };
  return { messages: messages.slice(index + 1), compaction };
}

/** Stellt die Zusammenfassung ans Ende der System-Nachricht (oder legt eine an). */
export function withCompaction(
  request: ChatRequest,
  summary: string,
): ChatRequest {
  const block = tr('prompt.compactIntro', { summary: summary.trim() });
  const [first, ...rest] = request.messages;
  const messages: ChatMessage[] =
    first?.role === 'system'
      ? [{ ...first, content: `${first.content}\n\n${block}` }, ...rest]
      : [{ role: 'system', content: block }, ...request.messages];
  return { ...request, messages };
}

/**
 * Wo wird geschnitten? Gibt die Zahl der älteren Nachrichten zurück, die zusammengefasst
 * werden; der Rest bleibt unverändert. Von hinten bleibt so viel stehen, wie in
 * `COMPACTION_KEEP_SHARE` des Kontexts passt – mindestens die letzten zwei Nachrichten,
 * und der Rest beginnt mit einer Nachricht von dir. 0 = nichts zu verdichten.
 */
export function pickCut(
  messages: MessageRecord[],
  contextLength: number,
): number {
  const usable = messages.filter(
    (m) => m.status !== 'error' && m.content.trim() !== '',
  );
  if (usable.length < 4) return 0;
  const budget = contextLength * COMPACTION_KEEP_SHARE;
  let kept = 0;
  let start = usable.length;
  for (let i = usable.length - 1; i >= 0; i--) {
    const tokens = messageTokens(usable[i]);
    const mustKeep = usable.length - i <= 2;
    if (!mustKeep && kept + tokens > budget) break;
    kept += tokens;
    start = i;
  }
  // Der unverändert bleibende Teil beginnt mit einer Nachricht des Nutzers.
  while (start > 0 && usable[start].role !== 'user') start--;
  if (start < 2) return 0;
  // Zurück auf die Nachrichten des ganzen Verlaufs (mit den übersprungenen leeren).
  const firstKept = usable[start];
  return messages.indexOf(firstKept);
}

/** Wie lang die Zusammenfassung höchstens sein soll (Wörter): ein Viertel des alten Teils, 80 bis 450. */
export function targetWords(oldTokens: number): number {
  return Math.min(450, Math.max(80, Math.round(oldTokens * 0.25 * 0.75)));
}

/** Das Gespräch als Text, in Abschnitte geteilt, die in den Kontext passen. */
export function compactionChunks(
  messages: MessageRecord[],
  contextLength: number,
  previousSummary = '',
): string[] {
  const maxChars = Math.max(
    2_000,
    Math.floor(contextLength * CHUNK_SHARE * CHARS_PER_TOKEN) -
      previousSummary.length -
      1_500,
  );
  const lines = messages
    .filter((m) => m.status !== 'error' && m.content.trim() !== '')
    .map((m) => {
      const line = `${m.role === 'user' ? tr('prompt.summaryUser') : tr('prompt.summaryAssistant')}: ${m.content.trim()}`;
      return line.length > maxChars
        ? `${line.slice(0, maxChars - 40)} ${tr('prompt.compactCut')}`
        : line;
    });
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current && current.length + line.length + 2 > maxChars) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current}\n\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Die Anfrage zum Verdichten eines Abschnitts – mit der bisherigen Zusammenfassung davor. */
export function compactionMessages(
  previousSummary: string,
  transcript: string,
  words: number,
): ChatMessage[] {
  const previous = previousSummary.trim()
    ? `${tr('prompt.compactPrevious', { summary: previousSummary.trim() })}\n\n`
    : '';
  return [
    { role: 'system', content: tr('prompt.compactSystem', { words }) },
    {
      role: 'user',
      content: `${previous}${tr('prompt.compactConversation')}\n<<<GESPRAECH\n${transcript}\nGESPRAECH>>>`,
    },
  ];
}

/** Liest eine gespeicherte Verdichtung; Unbrauchbares wird zu undefined. */
export function parseCompaction(
  json: string | null,
): ChatCompaction | undefined {
  if (!json) return undefined;
  try {
    const raw = JSON.parse(json) as Partial<ChatCompaction>;
    if (
      typeof raw.summary !== 'string' ||
      !raw.summary.trim() ||
      typeof raw.upToMessageId !== 'string' ||
      !Number.isFinite(raw.messagesCovered) ||
      !Number.isFinite(raw.tokensBefore) ||
      !Number.isFinite(raw.tokensAfter) ||
      !Number.isFinite(raw.createdAt)
    ) {
      return undefined;
    }
    return raw as ChatCompaction;
  } catch {
    return undefined;
  }
}
