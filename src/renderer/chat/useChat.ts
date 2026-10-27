import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatDetail, ChatSettings, MessageRecord } from '../../shared/api';
import { applyChatEvent } from '../../shared/chat';

interface UseChatOptions {
  /** Ein neuer Chat wurde durch die erste Nachricht angelegt. */
  onCreated: (chatId: string) => void;
  /** Etwas an der Chat-Liste hat sich geändert (neuer Chat, neue Nachricht). */
  onChanged: () => void;
}

/**
 * Hält die Nachrichten des geöffneten Chats. Gespeichert wird im Main-Prozess;
 * hier wird nur angezeigt, gesendet und gestoppt.
 * `chatId` ist null für einen neuen, noch leeren Chat.
 */
export function useChat(
  chatId: string | null,
  { onCreated, onChanged }: UseChatOptions,
) {
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [notFound, setNotFound] = useState(false);
  // Einstellungen des Chats – bei einem neuen Chat erst lokal, ab der ersten
  // Nachricht in der Datenbank.
  const [settings, setSettings] = useState<ChatSettings>({});
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Refs spiegeln den aktuellen Stand für Rückruf-Funktionen, die nicht neu erzeugt werden.
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const callbacks = useRef({ onCreated, onChanged });
  callbacks.current = { onCreated, onChanged };
  // Chat, den wir gerade selbst angelegt haben – den nicht aus der Datenbank
  // nachladen, sonst überschreibt der Datenbank-Stand die schon gestreamten Wörter.
  const createdHereRef = useRef<string | null>(null);

  const reload = useCallback(async (id: string) => {
    const detail = await window.api.getChat(id);
    if (chatIdRef.current !== id) return; // inzwischen anderer Chat geöffnet
    setChat(detail);
    setMessages(detail?.messages ?? []);
    setSettings(detail?.settings ?? {});
    setNotFound(detail === null);
  }, []);

  useEffect(() => {
    setNotFound(false);
    if (chatId === null) {
      setChat(null);
      setMessages([]);
      setSettings({});
      return;
    }
    if (chatId === createdHereRef.current) return;
    void reload(chatId);
  }, [chatId, reload]);

  useEffect(() => {
    return window.api.onChatEvent((event) => {
      setMessages((current) => applyChatEvent(current, event));
      const finished =
        event.type === 'done' ||
        event.type === 'error' ||
        event.type === 'aborted';
      if (!finished) return;
      callbacks.current.onChanged();
      // Am Ende mit der Datenbank abgleichen – so stimmt die Anzeige auch dann,
      // wenn man zwischendurch in einen anderen Chat gewechselt ist.
      const id = chatIdRef.current;
      if (id && messagesRef.current.some((m) => m.id === event.requestId)) {
        createdHereRef.current = null;
        void reload(id);
      }
    });
  }, [reload]);

  /** `folderId`: nur für einen neuen Chat – gleich in diesem Projekt anlegen. */
  const send = useCallback((text: string, model: string, folderId?: string) => {
    const content = text.trim();
    if (!content) return;
    if (messagesRef.current.some((m) => m.status === 'streaming')) return;

    const isNew = chatIdRef.current === null;
    const id = chatIdRef.current ?? crypto.randomUUID();
    const userMessage: MessageRecord = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      thinking: '',
      status: 'done',
    };
    const answer: MessageRecord = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      thinking: '',
      status: 'streaming',
      model,
    };

    setMessages((current) => [...current, userMessage, answer]);
    void window.api
      .chatSend({
        chatId: id,
        userMessageId: userMessage.id,
        requestId: answer.id,
        model,
        content,
        ...(isNew && { settings: settingsRef.current }),
        ...(isNew && folderId && { folderId }),
      })
      .then(() => callbacks.current.onChanged());

    if (isNew) {
      createdHereRef.current = id;
      chatIdRef.current = id;
      callbacks.current.onCreated(id);
    }
  }, []);

  const stop = useCallback(() => {
    const running = messagesRef.current.find((m) => m.status === 'streaming');
    if (running) void window.api.chatCancel(running.id);
  }, []);

  const updateSettings = useCallback((next: ChatSettings) => {
    setSettings(next);
    // Gilt ab der nächsten Nachricht. Gespeichert wird sofort, falls der Chat existiert.
    const id = chatIdRef.current;
    if (id) void window.api.updateChatSettings(id, next);
  }, []);

  const isRunning = messages.some((m) => m.status === 'streaming');
  return {
    chat,
    messages,
    settings,
    isRunning,
    notFound,
    send,
    stop,
    updateSettings,
  };
}
