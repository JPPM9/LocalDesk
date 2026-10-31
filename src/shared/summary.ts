import type { ChatMessage, MessageRecord } from './api';
import { tr } from './messages';

/** Vereinbart: Vorschlag ab 6 Nachrichten … */
export const SUMMARY_MIN_MESSAGES = 6;
/** … wenn die letzte Nachricht mindestens 30 Minuten alt ist. */
export const SUMMARY_IDLE_MS = 30 * 60 * 1000;
/** So viel vom Gespräch bekommt das Modell höchstens (das Ende zählt). */
export const SUMMARY_TRANSCRIPT_MAX = 24_000;

/**
 * Soll beim Öffnen die Karte „Zusammenfassung speichern?“ erscheinen?
 * Nach Speichern oder „Nein danke“ merkt sich LocalDesk die Zahl der Nachrichten
 * (`summaryAtCount`) – die Karte kommt erst wieder, wenn 6 neue dazukamen.
 */
export function shouldSuggestSummary(
  chat: { messageCount: number; updatedAt: number; summaryAtCount?: number },
  now: number,
): boolean {
  return (
    chat.messageCount - (chat.summaryAtCount ?? 0) >= SUMMARY_MIN_MESSAGES &&
    now - chat.updatedAt >= SUMMARY_IDLE_MS
  );
}

/**
 * Die Anfrage zum Zusammenfassen: Anweisung plus das Gespräch als Text (nur Fragen
 * und Antworten, ohne Gedanken und Tool-Aufrufe). Ist es zu lang, zählt das Ende.
 */
export function summaryMessages(messages: MessageRecord[]): ChatMessage[] {
  let transcript = messages
    .filter((m) => m.content.trim() !== '')
    .map(
      (m) =>
        `${m.role === 'user' ? tr('prompt.summaryUser') : tr('prompt.summaryAssistant')}: ${m.content.trim()}`,
    )
    .join('\n\n');
  if (transcript.length > SUMMARY_TRANSCRIPT_MAX) {
    transcript = `${tr('prompt.summaryOlderOmitted')}\n\n${transcript.slice(-SUMMARY_TRANSCRIPT_MAX)}`;
  }
  return [
    {
      role: 'system',
      content: tr('prompt.summarySystem'),
    },
    {
      role: 'user',
      content: tr('prompt.summaryRequest', { transcript }),
    },
  ];
}

/** Zerlegt die Antwort des Modells in Titel (erste Zeile) und Text. */
export function parseSummary(
  answer: string,
  fallbackTitle: string,
): { title: string; text: string } {
  const lines = answer.trim().split(/\r?\n/);
  const first = (lines[0] ?? '')
    .replace(/^#+\s*/, '')
    .replace(/^(titel|title)\s*:\s*/i, '')
    .replace(/^[*_"„“]+|[*_"“”]+$/g, '')
    .trim();
  // Eine sehr lange erste Zeile ist kein Titel, sondern schon Text.
  if (!first || first.length > 100) {
    return { title: fallbackTitle, text: answer.trim() };
  }
  return { title: first, text: lines.slice(1).join('\n').trim() };
}
