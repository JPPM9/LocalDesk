import { ipcMain } from 'electron';
import {
  IpcChannels,
  type ChatRequest,
  type MessageRecord,
  type Result,
} from '../shared/api';
import { CODE_CONTEXT_DEFAULT } from '../shared/code-agent';
import {
  COMPACTION_SUMMARY_MAX,
  compactedHistory,
  compactionChunks,
  compactionMessages,
  historyTokens,
  pickCut,
  targetWords,
  type ChatCompaction,
  type CompactionDraft,
} from '../shared/compaction';
import { OLLAMA_DEFAULT_CONTEXT } from '../shared/context';
import { tr } from '../shared/messages';
import { thinkStyle } from '../shared/settings';
import { describeChatError } from './chat-errors';
import type { ChatRepository } from './db/chat-repository';
import type { Provider } from './providers/provider';

interface CompactionDeps {
  getProvider: () => Provider;
  chats: ChatRepository;
  now?: () => number;
}

/**
 * Kontext verdichten: Das Modell des Chats fasst den älteren Teil zusammen (erst nach
 * deinem Klick), du prüfst und bearbeitest den Vorschlag, erst „Übernehmen“ speichert.
 * Die Nachrichten bleiben unverändert; nur die Anfrage ans Modell wird kürzer.
 */
export function registerCompactionHandlers(deps: CompactionDeps) {
  const now = deps.now ?? Date.now;
  /** Laufende Verdichtungen (Chat-ID → Abbruch). */
  const running = new Map<string, AbortController>();

  const contextOf = (chat: {
    settings: { contextLength?: number };
    workspace?: string;
  }) =>
    chat.settings.contextLength ??
    (chat.workspace ? CODE_CONTEXT_DEFAULT : OLLAMA_DEFAULT_CONTEXT);

  ipcMain.handle(
    IpcChannels.compactChat,
    async (
      _event,
      chatId: unknown,
      model: unknown,
    ): Promise<Result<CompactionDraft>> => {
      if (typeof chatId !== 'string' || typeof model !== 'string' || !model) {
        return { ok: false, error: tr('error.invalidInput') };
      }
      const chat = deps.chats.getChat(chatId);
      if (!chat) return { ok: false, error: tr('error.chatNotFound') };
      if (chat.messages.some((m) => m.status === 'streaming')) {
        return { ok: false, error: tr('compact.busy') };
      }
      const contextLength = contextOf(chat);
      // Was jetzt noch einzeln im Verlauf steht (nach einer früheren Verdichtung weniger).
      const current = compactedHistory(chat.messages, chat.compaction);
      const cut = pickCut(current.messages, contextLength);
      if (cut <= 0) return { ok: false, error: tr('compact.nothing') };
      const older = current.messages.slice(0, cut);
      const rest = current.messages.slice(cut);

      running.get(chatId)?.abort();
      const controller = new AbortController();
      running.set(chatId, controller);
      const provider = deps.getProvider();
      try {
        const models = await provider.listModels();
        const info = models.ok
          ? models.value.find((m) => m.name === model)
          : undefined;
        // Denken kostet nur Zeit – fürs Verdichten aus (bzw. niedrig bei gpt-oss).
        const style = thinkStyle(info);
        const words = targetWords(
          historyTokens(older, current.compaction?.summary),
        );
        let summary = current.compaction?.summary ?? '';
        // Abschnittsweise: Passt der alte Teil nicht auf einmal in den Kontext, nimmt jeder
        // Durchgang die bisherige Zusammenfassung mit.
        for (const chunk of compactionChunks(older, contextLength, summary)) {
          const request: ChatRequest = {
            model,
            messages: compactionMessages(summary, chunk, words),
            ...(style === 'toggle' && { think: false }),
            ...(style === 'levels' && { think: 'low' }),
            options: { contextLength, temperature: 0.2 },
          };
          let answer = '';
          for await (const part of provider.chat(request, controller.signal)) {
            if (part.type === 'content') answer += part.text;
          }
          if (!answer.trim()) {
            return { ok: false, error: tr('compact.noAnswer') };
          }
          summary = answer.trim();
        }
        summary = summary.slice(0, COMPACTION_SUMMARY_MAX);
        return {
          ok: true,
          value: {
            summary,
            upToMessageId: older[older.length - 1].id,
            messagesCovered:
              chat.messages.findIndex(
                (m) => m.id === older[older.length - 1].id,
              ) + 1,
            tokensBefore: historyTokens(
              current.messages,
              current.compaction?.summary,
            ),
            tokensAfter: historyTokens(rest, summary),
          },
        };
      } catch (error) {
        if (controller.signal.aborted) {
          return { ok: false, error: tr('error.cancelled') };
        }
        return { ok: false, error: describeChatError(error) };
      } finally {
        if (running.get(chatId) === controller) running.delete(chatId);
      }
    },
  );

  ipcMain.handle(IpcChannels.cancelCompaction, (_event, chatId: unknown) => {
    if (typeof chatId === 'string') running.get(chatId)?.abort();
  });

  // Übernehmen: Zusammenfassung und letzte ersetzte Nachricht werden geprüft; die Zahlen
  // rechnet LocalDesk selbst nach (nicht die Oberfläche).
  ipcMain.handle(
    IpcChannels.applyCompaction,
    (_event, chatId: unknown, draft: unknown): Result<ChatCompaction> => {
      const chat =
        typeof chatId === 'string' ? deps.chats.getChat(chatId) : null;
      if (!chat) return { ok: false, error: tr('error.chatNotFound') };
      if (chat.messages.some((m) => m.status === 'streaming')) {
        return { ok: false, error: tr('compact.busy') };
      }
      const raw = (draft ?? {}) as {
        summary?: unknown;
        upToMessageId?: unknown;
      };
      const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
      if (
        !summary ||
        summary.length > COMPACTION_SUMMARY_MAX ||
        typeof raw.upToMessageId !== 'string'
      ) {
        return { ok: false, error: tr('compact.invalid') };
      }
      const index = chat.messages.findIndex((m) => m.id === raw.upToMessageId);
      if (index < 0) return { ok: false, error: tr('compact.gone') };
      const before = compactedHistory(chat.messages, chat.compaction);
      const after = chat.messages.slice(index + 1);
      const compaction: ChatCompaction = {
        summary,
        upToMessageId: raw.upToMessageId,
        messagesCovered: index + 1,
        tokensBefore: historyTokens(
          before.messages,
          before.compaction?.summary,
        ),
        tokensAfter: historyTokens(after as MessageRecord[], summary),
        createdAt: now(),
      };
      deps.chats.setCompaction(chat.id, compaction);
      return { ok: true, value: compaction };
    },
  );

  ipcMain.handle(IpcChannels.clearCompaction, (_event, chatId: unknown) => {
    if (typeof chatId === 'string') deps.chats.setCompaction(chatId, null);
  });
}
