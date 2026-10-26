import type { ChatMessage, ChatStreamEvent, MessageRecord } from './api';

/**
 * Baut ein Ereignis aus dem Stream in die Nachrichtenliste ein. Die Oberfläche
 * nutzt das zum Anzeigen, der Main-Prozess zum Speichern – beide rechnen gleich.
 * Gibt immer eine neue Liste zurück, statt die alte zu verändern – so erkennt
 * React zuverlässig, dass neu gezeichnet werden muss.
 */
export function applyChatEvent(
  messages: MessageRecord[],
  event: ChatStreamEvent,
): MessageRecord[] {
  return messages.map((message) => {
    if (message.id !== event.requestId) return message;
    switch (event.type) {
      case 'content':
        return { ...message, content: message.content + event.text };
      case 'thinking':
        return { ...message, thinking: message.thinking + event.text };
      case 'done':
        return { ...message, status: 'done', stats: event.stats };
      case 'error':
        return { ...message, status: 'error', error: event.error };
      case 'aborted':
        return { ...message, status: 'aborted' };
    }
  });
}

/**
 * Der Verlauf, den das Modell als Kontext bekommt. Fehlgeschlagene und leere
 * Antworten lassen wir weg; Gedanken schickt man nicht zurück – sie würden nur
 * den Kontext füllen.
 */
export function toRequestMessages(messages: MessageRecord[]): ChatMessage[] {
  return messages
    .filter((m) => m.status !== 'error' && m.content.trim() !== '')
    .map((m) => ({ role: m.role, content: m.content }));
}

const TITLE_MAX_LENGTH = 60;

/** Titel für einen neuen Chat: die erste Zeile der ersten Nachricht, gekürzt. */
export function titleFromMessage(content: string): string {
  const firstLine = content.trim().split('\n')[0].replace(/\s+/g, ' ');
  if (firstLine.length <= TITLE_MAX_LENGTH) return firstLine;
  return firstLine.slice(0, TITLE_MAX_LENGTH - 1).trimEnd() + '…';
}
