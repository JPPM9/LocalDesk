import { ipcMain, type WebContents } from 'electron';
import {
  IpcChannels,
  type ChatRequest,
  type ChatSendRequest,
  type ChatStreamEvent,
  type MessageRecord,
} from '../shared/api';
import { applyChatEvent, titleFromMessage } from '../shared/chat';
import { buildChatRequest } from '../shared/settings';
import type { ChatRepository } from './db/chat-repository';
import type { Provider } from './providers/provider';

/** Wie oft eine laufende Antwort zwischengespeichert wird (falls die App abstürzt). */
const SAVE_INTERVAL_MS = 1000;

/**
 * Verbindet die Oberfläche mit Chat und Datenbank.
 * Eine Antwort läuft im Hintergrund weiter; jedes Stück geht als Ereignis an das
 * Fenster, das gefragt hat, und landet in der Datenbank. Laufende Antworten merken
 * wir uns, damit „Stopp“ sie abbrechen kann.
 */
export function registerChatHandlers(
  /** Liefert den Provider des gerade aktiven Servers (umschaltbar). */
  getProvider: () => Provider,
  chats: ChatRepository,
) {
  const running = new Map<string, AbortController>();

  ipcMain.handle(IpcChannels.listChats, () => chats.listChats());

  ipcMain.handle(IpcChannels.getChat, (_event, chatId: unknown) =>
    typeof chatId === 'string' ? chats.getChat(chatId) : null,
  );

  ipcMain.handle(
    IpcChannels.renameChat,
    (_event, chatId: unknown, title: unknown) => {
      if (typeof chatId !== 'string' || typeof title !== 'string') return;
      const trimmed = title.trim();
      if (trimmed) chats.renameChat(chatId, trimmed.slice(0, 200));
    },
  );

  ipcMain.handle(IpcChannels.deleteChat, (_event, chatId: unknown) => {
    if (typeof chatId === 'string') chats.deleteChat(chatId);
  });

  ipcMain.handle(IpcChannels.searchChats, (_event, query: unknown) =>
    typeof query === 'string'
      ? chats.search(query.slice(0, 500))
      : { chats: [], hits: [] },
  );

  // Die Prüfung der Werte übernimmt das Repository (normalizeSettings).
  ipcMain.handle(
    IpcChannels.updateChatSettings,
    (_event, chatId: unknown, settings: unknown) => {
      if (typeof chatId === 'string') {
        chats.updateSettings(chatId, settings as object);
      }
    },
  );

  ipcMain.handle(IpcChannels.chatSend, (event, request: unknown) => {
    if (!isChatSendRequest(request)) {
      throw new Error('Ungültige Chat-Anfrage');
    }
    if (running.has(request.requestId)) return;

    if (!chats.chatExists(request.chatId)) {
      chats.createChat({
        id: request.chatId,
        title: titleFromMessage(request.content),
        model: request.model,
        settings: request.settings,
      });
    }
    const chat = chats.getChat(request.chatId);
    const history = chat?.messages ?? [];

    const userMessage: MessageRecord = {
      id: request.userMessageId,
      role: 'user',
      content: request.content,
      thinking: '',
      status: 'done',
    };
    const answer: MessageRecord = {
      id: request.requestId,
      role: 'assistant',
      content: '',
      thinking: '',
      status: 'streaming',
      model: request.model,
    };
    chats.appendMessage(request.chatId, userMessage);
    chats.appendMessage(request.chatId, answer);

    const controller = new AbortController();
    running.set(request.requestId, controller);
    // Bewusst nicht abwarten: Die Oberfläche bekommt die Antwort über Ereignisse.
    const chatRequest = buildChatRequest(
      request.model,
      [...history, userMessage],
      chat?.settings ?? {},
    );
    // Der Server wird beim Absenden festgelegt – ein Umschalten während der
    // Antwort lässt diese Antwort auf ihrem Server zu Ende laufen.
    void stream(
      getProvider(),
      event.sender,
      chatRequest,
      answer,
      controller,
    ).finally(() => running.delete(request.requestId));
  });

  ipcMain.handle(IpcChannels.chatCancel, (_event, requestId: unknown) => {
    if (typeof requestId === 'string') running.get(requestId)?.abort();
  });

  async function stream(
    provider: Provider,
    sender: WebContents,
    chatRequest: ChatRequest,
    initial: MessageRecord,
    controller: AbortController,
  ) {
    const requestId = initial.id;
    let answer = initial;
    let lastSave = Date.now();

    const save = () => {
      chats.updateMessage(answer.id, answer);
      lastSave = Date.now();
    };
    const emit = (event: ChatStreamEvent) => {
      answer = applyChatEvent([answer], event)[0];
      if (!sender.isDestroyed()) sender.send(IpcChannels.chatEvent, event);
    };

    try {
      for await (const chunk of provider.chat(chatRequest, controller.signal)) {
        emit({ requestId, ...chunk });
        if (Date.now() - lastSave > SAVE_INTERVAL_MS) save();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        emit({ requestId, type: 'aborted' });
      } else {
        emit({
          requestId,
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    // Endet der Stream ohne „done“ (Verbindung weg), gilt die Antwort als abgebrochen.
    if (answer.status === 'streaming') {
      emit({ requestId, type: 'aborted' });
    }
    save();
  }
}

// Die Oberfläche gilt als nicht vertrauenswürdig: Eingaben vom Renderer prüfen wir.
function isChatSendRequest(value: unknown): value is ChatSendRequest {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<ChatSendRequest>;
  return (
    typeof r.chatId === 'string' &&
    r.chatId !== '' &&
    typeof r.userMessageId === 'string' &&
    typeof r.requestId === 'string' &&
    typeof r.model === 'string' &&
    r.model !== '' &&
    typeof r.content === 'string' &&
    r.content.trim() !== ''
  );
}
