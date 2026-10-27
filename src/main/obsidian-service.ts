import { ipcMain, shell } from 'electron';
import {
  IpcChannels,
  type ChatDetail,
  type ChatFolder,
  type MemoryView,
  type ObsidianStatus,
  type Result,
} from '../shared/api';
import { selectMemories } from '../shared/memory';
import type { AppSettingsRepository } from './db/app-settings-repository';
import { CHATS_DIR, formatChatNote } from './obsidian/chat-notes';
import { isMemoryPath, MemoryStore } from './obsidian/memories';
import {
  checkFolderName,
  DEFAULT_FOLDER,
  inspectVault,
  VaultWriter,
} from './obsidian/vault';
import type { Provider } from './providers/provider';
import { normalize, queryText, similarity } from './rag/vectors';

const VAULT_KEY = 'obsidian.vault';
const FOLDER_KEY = 'obsidian.folder';

export interface ObsidianDeps {
  getProvider: () => Provider;
  /** Projekte (für Projekt-Erinnerungen und ihre Namen). */
  projects: () => ChatFolder[];
  embeddingModel: string;
  /** Chats aus der Datenbank – gespeichert wird, was dort steht, nicht was die Oberfläche schickt. */
  getChat: (chatId: string) => ChatDetail | null;
}

/** Was der Chat von den Erinnerungen braucht. */
export interface ChatMemory {
  /** Texte der Erinnerungen für einen Chat (global + Projekt), im Budget. */
  forChat(projectId: string | undefined, question: string): Promise<string[]>;
  /** Ist ein Vault eingerichtet? Sonst wird „Erinnerung speichern“ nicht angeboten. */
  available(): boolean;
  /** Speichert eine bestätigte Erinnerung (mit Projekt: nur für dieses Projekt). */
  save(text: string, projectId?: string): Promise<MemoryView>;
}

/**
 * Obsidian-Vault für die Oberfläche: einrichten, prüfen, vergessen – und die
 * Erinnerungen. Geschrieben wird immer nur im eigenen Unterordner (VaultWriter).
 */
export function registerObsidianHandlers(
  settings: AppSettingsRepository,
  deps: ObsidianDeps,
) {
  const configured = () => {
    const vaultPath = settings.get(VAULT_KEY);
    return vaultPath
      ? { vaultPath, folder: settings.get(FOLDER_KEY) ?? DEFAULT_FOLDER }
      : null;
  };
  const writer = (): VaultWriter | null => {
    const config = configured();
    return config ? new VaultWriter(config.vaultPath, config.folder) : null;
  };
  const memories = (): MemoryStore | null => {
    const w = writer();
    return w ? new MemoryStore(w) : null;
  };
  const projects = () =>
    deps.projects().map((p) => ({ id: p.id, name: p.name }));

  ipcMain.handle(
    IpcChannels.getObsidian,
    async (): Promise<ObsidianStatus | null> => {
      const config = configured();
      return config ? inspectVault(config.vaultPath, config.folder) : null;
    },
  );

  ipcMain.handle(
    IpcChannels.setObsidian,
    async (
      _event,
      vaultPath: unknown,
      folder: unknown,
    ): Promise<ObsidianStatus> => {
      const vault = typeof vaultPath === 'string' ? vaultPath.trim() : '';
      const name = checkFolderName(folder);
      if (!name.ok) {
        return {
          vaultPath: vault,
          folder: String(folder ?? ''),
          ok: false,
          looksLikeVault: false,
          error: name.error,
        };
      }
      const status = await inspectVault(vault, name.value);
      // Nur einen nutzbaren Ordner speichern.
      if (status.ok) {
        settings.set(VAULT_KEY, vault);
        settings.set(FOLDER_KEY, name.value);
      }
      return status;
    },
  );

  ipcMain.handle(IpcChannels.clearObsidian, () => {
    settings.delete(VAULT_KEY);
    settings.delete(FOLDER_KEY);
  });

  const noVault = {
    ok: false as const,
    error: 'Kein Obsidian-Vault eingerichtet (Einstellungen → Obsidian).',
  };

  ipcMain.handle(
    IpcChannels.listMemories,
    async (): Promise<Result<MemoryView[]>> => {
      const store = memories();
      if (!store) return noVault;
      return { ok: true, value: await store.list(projects()) };
    },
  );

  ipcMain.handle(
    IpcChannels.addMemory,
    async (
      _event,
      text: unknown,
      projectId: unknown,
    ): Promise<Result<MemoryView>> => {
      const store = memories();
      if (!store) return noVault;
      if (typeof text !== 'string')
        return { ok: false, error: 'Ungültige Eingabe' };
      const project =
        typeof projectId === 'string'
          ? projects().find((p) => p.id === projectId)
          : undefined;
      try {
        return { ok: true, value: await store.add(text, project) };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.deleteMemory,
    async (_event, id: unknown): Promise<Result<void>> => {
      const store = memories();
      if (!store) return noVault;
      try {
        if (typeof id !== 'string') throw new Error('Ungültige Eingabe');
        await store.remove(id);
        return { ok: true, value: undefined };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  // Nur Erinnerungs-Notizen (.md) öffnen – im Standardprogramm (z. B. Obsidian).
  ipcMain.handle(
    IpcChannels.openMemory,
    async (_event, id: unknown): Promise<Result<void>> => {
      const w = writer();
      if (!w) return noVault;
      if (typeof id !== 'string' || !isMemoryPath(id)) {
        return { ok: false, error: 'Keine Erinnerung' };
      }
      const error = await shell.openPath(w.resolve(id));
      return error ? { ok: false, error } : { ok: true, value: undefined };
    },
  );

  // Chat oder Antwort als Notiz – neue Datei, bei gleichem Namen mit „(2)“.
  ipcMain.handle(
    IpcChannels.saveChatNote,
    async (
      _event,
      chatId: unknown,
      answerId: unknown,
    ): Promise<Result<string>> => {
      const w = writer();
      if (!w) return noVault;
      const chat = typeof chatId === 'string' ? deps.getChat(chatId) : null;
      if (!chat) return { ok: false, error: 'Chat nicht gefunden' };
      const note = formatChatNote(chat, new Date(), {
        ...(typeof answerId === 'string' && { answerId }),
        projectName: deps.projects().find((p) => p.id === chat.folderId)?.name,
      });
      if (!note)
        return {
          ok: false,
          error: 'Nichts zu speichern (noch keine fertige Antwort).',
        };
      try {
        return {
          ok: true,
          value: await w.writeNote(CHATS_DIR, note.title, note.content),
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  // Fingerabdrücke der Erinnerungen merken (Text → Vektor), damit nicht jede
  // Frage alle neu berechnen muss. Nur nötig, wenn das Budget überschritten ist.
  const vectors = new Map<string, Float32Array>();
  const chatMemory: ChatMemory = {
    async forChat(projectId, question) {
      const store = memories();
      if (!store) return [];
      let list: MemoryView[];
      try {
        list = await store.forChat(projectId, projects());
      } catch {
        return []; // Vault gerade nicht erreichbar – Chat läuft ohne Erinnerungen
      }
      const all = selectMemories(list);
      if (all.length === list.length) return list.map((m) => m.text);
      const scores = await scoreMemories(list, question).catch(() => undefined);
      return selectMemories(list, undefined, scores).map((m) => m.text);
    },
    available: () => configured() !== null,
    async save(text, projectId) {
      const store = memories();
      if (!store) throw new Error(noVault.error);
      const project = projectId
        ? projects().find((p) => p.id === projectId)
        : undefined;
      return store.add(text, project);
    },
  };

  async function scoreMemories(list: MemoryView[], question: string) {
    const provider = deps.getProvider();
    const missing = list.map((m) => m.text).filter((t) => !vectors.has(t));
    if (missing.length > 0) {
      const result = await provider.embed(deps.embeddingModel, missing);
      if (!result.ok) throw new Error(result.error);
      missing.forEach((t, i) => vectors.set(t, normalize(result.value[i])));
    }
    const q = await provider.embed(deps.embeddingModel, [
      queryText(deps.embeddingModel, question),
    ]);
    if (!q.ok) throw new Error(q.error);
    const qv = normalize(q.value[0]);
    return list.map((m) => similarity(qv, vectors.get(m.text)!));
  }

  return { writer, chatMemory };
}
