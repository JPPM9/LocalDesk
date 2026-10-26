import { ipcMain } from 'electron';
import { IpcChannels } from '../shared/api';
import type { ChatRepository } from './db/chat-repository';
import type { FolderRepository } from './db/folder-repository';

/** Ordner für die Oberfläche: auflisten, anlegen, umbenennen, löschen, Chats verschieben. */
export function registerFolderHandlers(
  folders: FolderRepository,
  chats: ChatRepository,
) {
  ipcMain.handle(IpcChannels.listFolders, () => folders.listFolders());

  // Die Namensprüfung übernimmt das Repository.
  ipcMain.handle(IpcChannels.createFolder, (_event, name: unknown) =>
    folders.createFolder(name),
  );

  ipcMain.handle(
    IpcChannels.renameFolder,
    (_event, folderId: unknown, name: unknown) =>
      typeof folderId === 'string'
        ? folders.renameFolder(folderId, name)
        : { ok: false, error: 'Ungültige ID' },
  );

  ipcMain.handle(IpcChannels.deleteFolder, (_event, folderId: unknown) => {
    if (typeof folderId === 'string') folders.deleteFolder(folderId);
  });

  ipcMain.handle(
    IpcChannels.moveChat,
    (_event, chatId: unknown, folderId: unknown) => {
      if (typeof chatId !== 'string') return;
      if (folderId !== null && typeof folderId !== 'string') return;
      chats.moveChat(chatId, folderId);
    },
  );
}
