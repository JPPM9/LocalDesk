import { ipcMain } from 'electron';
import {
  IpcChannels,
  type ChatFolder,
  type ChatRequest,
  type Result,
  type SummaryDraft,
} from '../shared/api';
import { thinkStyle } from '../shared/settings';
import { parseSummary, summaryMessages } from '../shared/summary';
import { describeChatError } from './chat-errors';
import type { ChatRepository } from './db/chat-repository';
import { formatSummaryNote, SUMMARIES_DIR } from './obsidian/summary-notes';
import type { VaultWriter } from './obsidian/vault';
import type { Provider } from './providers/provider';

/** Längster Text, den die Oberfläche als Zusammenfassung speichern darf. */
const SUMMARY_TEXT_MAX = 20_000;

interface SummaryDeps {
  getProvider: () => Provider;
  chats: ChatRepository;
  /** Schreibt in den LocalDesk-Unterordner – null ohne eingerichteten Vault. */
  writer: () => VaultWriter | null;
  projects: () => ChatFolder[];
}

/**
 * Zusammenfassungen: Das Modell des Chats fasst zusammen (erst nach deinem Klick),
 * du bearbeitest den Entwurf, gespeichert wird nach `<Unterordner>/Zusammenfassungen/`.
 */
export function registerSummaryHandlers(deps: SummaryDeps) {
  /** Laufende Zusammenfassungen (Chat-ID → Abbruch). */
  const running = new Map<string, AbortController>();

  ipcMain.handle(
    IpcChannels.summarizeChat,
    async (
      _event,
      chatId: unknown,
      model: unknown,
    ): Promise<Result<SummaryDraft>> => {
      if (typeof chatId !== 'string' || typeof model !== 'string' || !model) {
        return { ok: false, error: 'Ungültige Eingabe' };
      }
      const chat = deps.chats.getChat(chatId);
      if (!chat) return { ok: false, error: 'Chat nicht gefunden' };
      if (
        !chat.messages.some((m) => m.role === 'assistant' && m.content.trim())
      ) {
        return { ok: false, error: 'Noch nichts zum Zusammenfassen.' };
      }
      running.get(chatId)?.abort();
      const controller = new AbortController();
      running.set(chatId, controller);

      const provider = deps.getProvider();
      try {
        const models = await provider.listModels();
        const info = models.ok
          ? models.value.find((m) => m.name === model)
          : undefined;
        // Denken kostet nur Zeit – fürs Zusammenfassen aus (bzw. niedrig bei gpt-oss).
        const style = thinkStyle(info);
        const request: ChatRequest = {
          model,
          messages: summaryMessages(chat.messages),
          ...(style === 'toggle' && { think: false }),
          ...(style === 'levels' && { think: 'low' }),
          ...(chat.settings.contextLength && {
            options: { contextLength: chat.settings.contextLength },
          }),
        };
        let answer = '';
        for await (const chunk of provider.chat(request, controller.signal)) {
          if (chunk.type === 'content') answer += chunk.text;
        }
        if (!answer.trim()) {
          return {
            ok: false,
            error: 'Das Modell hat keine Zusammenfassung geliefert.',
          };
        }
        return {
          ok: true,
          value: parseSummary(answer, chat.title.replace(/\s*…$/, '')),
        };
      } catch (error) {
        if (controller.signal.aborted)
          return { ok: false, error: 'Abgebrochen' };
        return { ok: false, error: describeChatError(error) };
      } finally {
        if (running.get(chatId) === controller) running.delete(chatId);
      }
    },
  );

  ipcMain.handle(IpcChannels.cancelSummary, (_event, chatId: unknown) => {
    if (typeof chatId === 'string') running.get(chatId)?.abort();
  });

  ipcMain.handle(
    IpcChannels.saveSummary,
    async (
      _event,
      chatId: unknown,
      model: unknown,
      draft: unknown,
    ): Promise<Result<string>> => {
      const writer = deps.writer();
      if (!writer) {
        return {
          ok: false,
          error: 'Kein Obsidian-Vault eingerichtet (Einstellungen → Obsidian).',
        };
      }
      const chat =
        typeof chatId === 'string' ? deps.chats.getChat(chatId) : null;
      if (!chat) return { ok: false, error: 'Chat nicht gefunden' };
      const checked = checkDraft(draft);
      if (!checked)
        return { ok: false, error: 'Titel und Text dürfen nicht leer sein.' };
      const note = formatSummaryNote(checked, new Date(), {
        chatId: chat.id,
        model: typeof model === 'string' ? model.slice(0, 200) : chat.model,
        projectName: deps.projects().find((p) => p.id === chat.folderId)?.name,
      });
      try {
        const path = await writer.writeNote(
          SUMMARIES_DIR,
          note.title,
          note.content,
        );
        deps.chats.markSummarized(chat.id);
        return { ok: true, value: path };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  // „Nein danke“: erst nach 6 neuen Nachrichten wieder fragen.
  ipcMain.handle(IpcChannels.dismissSummary, (_event, chatId: unknown) => {
    if (typeof chatId === 'string') deps.chats.markSummarized(chatId);
  });
}

function checkDraft(value: unknown): SummaryDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const { title, text } = value as Partial<SummaryDraft>;
  if (typeof title !== 'string' || typeof text !== 'string') return null;
  const cleanTitle = title.replace(/\s+/g, ' ').trim().slice(0, 150);
  const cleanText = text.trim();
  if (!cleanTitle || !cleanText || cleanText.length > SUMMARY_TEXT_MAX)
    return null;
  return { title: cleanTitle, text: cleanText };
}
