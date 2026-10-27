import { randomUUID } from 'node:crypto';
import { ipcMain, type WebContents } from 'electron';
import {
  IpcChannels,
  type ChatRequest,
  type ChatSendRequest,
  type ChatStreamEvent,
  type MessageRecord,
  type ToolDecision,
} from '../shared/api';
import { applyChatEvent, titleFromMessage } from '../shared/chat';
import { knowledgeQuery, withKnowledge } from '../shared/knowledge';
import { buildChatRequest } from '../shared/settings';
import { describeChatError } from './chat-errors';
import type { ChatRepository } from './db/chat-repository';
import type { ChatKnowledge } from './knowledge-service';
import type { McpTools } from './mcp-service';
import type { Provider } from './providers/provider';
import { runAnswer, type ToolRuntime } from './tool-loop';

/** Wie oft eine laufende Antwort zwischengespeichert wird (falls die App abstürzt). */
const SAVE_INTERVAL_MS = 1000;

const TOOL_DECISIONS: readonly ToolDecision[] = ['once', 'always', 'deny'];

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
  mcpTools: McpTools,
  knowledge: ChatKnowledge,
) {
  const running = new Map<string, AbortController>();
  /** Rückfragen, auf deren Antwort ein Tool-Aufruf wartet (Aufruf-ID → Antwort). */
  const pendingDecisions = new Map<string, (decision: ToolDecision) => void>();

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
    const settings = chat?.settings ?? {};

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
    const chatRequest = buildChatRequest(
      request.model,
      [...history, userMessage],
      settings,
    );
    const runtime = toolRuntime(settings.mcpServers ?? [], controller.signal);
    const knowledgeSearch = settings.collections?.length
      ? {
          collectionIds: settings.collections,
          query: knowledgeQuery(history, request.content),
        }
      : null;
    // Bewusst nicht abwarten: Die Oberfläche bekommt die Antwort über Ereignisse.
    // Der Server wird beim Absenden festgelegt – ein Umschalten während der
    // Antwort lässt diese Antwort auf ihrem Server zu Ende laufen.
    void stream(
      getProvider(),
      event.sender,
      chatRequest,
      runtime,
      knowledgeSearch,
      answer,
      controller,
    ).finally(() => running.delete(request.requestId));
  });

  ipcMain.handle(IpcChannels.chatCancel, (_event, requestId: unknown) => {
    if (typeof requestId === 'string') running.get(requestId)?.abort();
  });

  // Nur Antworten auf Rückfragen, die wirklich offen sind, zählen.
  ipcMain.handle(
    IpcChannels.chatToolDecision,
    (_event, callId: unknown, decision: unknown) => {
      if (typeof callId !== 'string') return;
      if (!(TOOL_DECISIONS as readonly unknown[]).includes(decision)) return;
      pendingDecisions.get(callId)?.(decision as ToolDecision);
    },
  );

  /** Verbindet die Tool-Schleife mit den MCP-Servern dieses Chats und den Rückfragen. */
  function toolRuntime(serverIds: string[], signal: AbortSignal): ToolRuntime {
    return {
      tools: () => mcpTools.offered(serverIds),
      call: (tool, args, callSignal) => mcpTools.call(tool, args, callSignal),
      allowAlways: (tool) => mcpTools.allowAlways(tool),
      ask: (call) =>
        new Promise<ToolDecision>((resolve) => {
          const finish = (decision: ToolDecision) => {
            pendingDecisions.delete(call.id);
            signal.removeEventListener('abort', onAbort);
            resolve(decision);
          };
          // „Stopp“ während der Rückfrage = nicht ausführen.
          const onAbort = () => finish('deny');
          pendingDecisions.set(call.id, finish);
          signal.addEventListener('abort', onAbort, { once: true });
        }),
    };
  }

  async function stream(
    provider: Provider,
    sender: WebContents,
    chatRequest: ChatRequest,
    runtime: ToolRuntime,
    knowledgeSearch: { collectionIds: string[]; query: string } | null,
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
      // Tool-Aufrufe und Quellen sofort speichern – sie sind selten, aber wichtig.
      if (
        event.type === 'tool-call' ||
        event.type === 'sources' ||
        Date.now() - lastSave > SAVE_INTERVAL_MS
      ) {
        save();
      }
    };

    try {
      // Erst im Wissen suchen, dann antworten. Geht die Suche schief, kommt die
      // Antwort ohne Wissen – mit Hinweis, statt gar nicht.
      let request = chatRequest;
      if (knowledgeSearch) {
        const found = await knowledge.search(
          knowledgeSearch.collectionIds,
          knowledgeSearch.query,
        );
        controller.signal.throwIfAborted();
        if (found.ok) {
          emit({ requestId, type: 'sources', sources: found.value });
          request = withKnowledge(chatRequest, found.value);
        } else {
          emit({ requestId, type: 'sources', sources: [], error: found.error });
        }
      }
      await runAnswer({
        provider,
        request,
        requestId,
        runtime,
        emit,
        signal: controller.signal,
        newId: randomUUID,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        emit({ requestId, type: 'aborted' });
      } else {
        emit({ requestId, type: 'error', error: describeChatError(error) });
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
