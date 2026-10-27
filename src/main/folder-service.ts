import { ipcMain } from 'electron';
import { IpcChannels, type CollectionConfig, type Result } from '../shared/api';
import type { ChatRepository } from './db/chat-repository';
import type { FolderRepository } from './db/folder-repository';

/** Was Projekte vom Wissen brauchen (die Projekt-Dokumente sind eine Sammlung). */
export interface ProjectKnowledge {
  ensureCollection(projectId: string, projectName: string): CollectionConfig;
  /** Läuft gerade ein Einlesen dieser Sammlung, abbrechen. */
  cancel(collectionId: string): void;
  /** Sammlungen haben sich geändert – Oberfläche aktualisieren. */
  changed(): void;
}

/**
 * Projekte (früher „Ordner“) für die Oberfläche: auflisten, anlegen, umbenennen,
 * löschen, Anweisungen setzen, Projekt-Dokumente anlegen, Chats verschieben.
 */
export function registerFolderHandlers(
  folders: FolderRepository,
  chats: ChatRepository,
  knowledge: ProjectKnowledge,
) {
  ipcMain.handle(IpcChannels.listFolders, () => folders.listFolders());

  // Die Namensprüfung übernimmt das Repository.
  ipcMain.handle(IpcChannels.createFolder, (_event, name: unknown) =>
    folders.createFolder(name),
  );

  ipcMain.handle(
    IpcChannels.renameFolder,
    (_event, folderId: unknown, name: unknown) => {
      if (typeof folderId !== 'string') {
        return { ok: false, error: 'Ungültige ID' };
      }
      const result = folders.renameFolder(folderId, name);
      if (result.ok) knowledge.changed(); // Projekt-Dokumente heißen wie das Projekt
      return result;
    },
  );

  ipcMain.handle(IpcChannels.deleteFolder, (_event, folderId: unknown) => {
    if (typeof folderId !== 'string') return;
    const collectionId = folders.getFolder(folderId)?.collectionId;
    if (collectionId) knowledge.cancel(collectionId);
    folders.deleteFolder(folderId);
    if (collectionId) knowledge.changed();
  });

  ipcMain.handle(
    IpcChannels.setProjectInstructions,
    (_event, folderId: unknown, instructions: unknown) => {
      if (typeof folderId === 'string') {
        folders.setInstructions(folderId, instructions);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.ensureProjectCollection,
    (_event, folderId: unknown): Result<CollectionConfig> => {
      const folder =
        typeof folderId === 'string' ? folders.getFolder(folderId) : null;
      if (!folder) return { ok: false, error: 'Projekt nicht gefunden' };
      const collection = knowledge.ensureCollection(folder.id, folder.name);
      knowledge.changed();
      return { ok: true, value: collection };
    },
  );

  ipcMain.handle(
    IpcChannels.moveChat,
    (_event, chatId: unknown, folderId: unknown) => {
      if (typeof chatId !== 'string') return;
      if (folderId !== null && typeof folderId !== 'string') return;
      chats.moveChat(chatId, folderId);
    },
  );
}
