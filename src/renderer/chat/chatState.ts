import type { ChatMessage, ChatStats, ChatStreamEvent } from '../../shared/api';

/** Eine Nachricht, wie die Oberfläche sie anzeigt. */
export interface UiMessage {
  /** Bei Antworten des Modells zugleich die requestId der Anfrage. */
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** „Gedanken“ von Denkmodellen (qwen3, gpt-oss …), getrennt von der Antwort. */
  thinking: string;
  status: 'streaming' | 'done' | 'error' | 'aborted';
  model?: string;
  stats?: ChatStats;
  error?: string;
}

/**
 * Baut ein Ereignis aus dem Stream in die Nachrichtenliste ein.
 * Gibt immer eine neue Liste zurück, statt die alte zu verändern – so erkennt
 * React zuverlässig, dass neu gezeichnet werden muss.
 */
export function applyChatEvent(
  messages: UiMessage[],
  event: ChatStreamEvent,
): UiMessage[] {
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
export function toRequestMessages(messages: UiMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m.status !== 'error' && m.content.trim() !== '')
    .map((m) => ({ role: m.role, content: m.content }));
}
