import { useCallback, useEffect, useRef, useState } from 'react';
import { applyChatEvent, toRequestMessages, type UiMessage } from './chatState';

/**
 * Hält die Nachrichten eines Chats und spricht über `window.api` mit dem Main-Prozess.
 * Noch nichts wird gespeichert – das kommt im nächsten Schritt (SQLite).
 */
export function useChat() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  // requestId der Antwort, die gerade läuft (oder null).
  const [runningId, setRunningId] = useState<string | null>(null);
  // Refs spiegeln den aktuellen Stand für Funktionen, die nicht neu erzeugt werden.
  const runningRef = useRef<string | null>(null);
  runningRef.current = runningId;
  const messagesRef = useRef<UiMessage[]>(messages);
  messagesRef.current = messages;

  useEffect(() => {
    return window.api.onChatEvent((event) => {
      setMessages((current) => applyChatEvent(current, event));
      const finished =
        event.type === 'done' ||
        event.type === 'error' ||
        event.type === 'aborted';
      if (finished && event.requestId === runningRef.current) {
        setRunningId(null);
      }
    });
  }, []);

  const send = useCallback((text: string, model: string) => {
    const content = text.trim();
    if (!content || runningRef.current) return;

    const requestId = crypto.randomUUID();
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      thinking: '',
      status: 'done',
    };
    const answer: UiMessage = {
      id: requestId,
      role: 'assistant',
      content: '',
      thinking: '',
      status: 'streaming',
      model,
    };

    // Die Anfrage startet hier und nicht in setMessages: React darf Update-Funktionen
    // mehrfach aufrufen (im Entwicklungsmodus absichtlich) – das gäbe doppelte Anfragen.
    const history = toRequestMessages([...messagesRef.current, userMessage]);
    runningRef.current = requestId;
    setRunningId(requestId);
    setMessages((current) => [...current, userMessage, answer]);
    void window.api.chatStart(requestId, { model, messages: history });
  }, []);

  const stop = useCallback(() => {
    if (runningRef.current) void window.api.chatCancel(runningRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setRunningId(null);
  }, [stop]);

  return { messages, isRunning: runningId !== null, send, stop, reset };
}
