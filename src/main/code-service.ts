import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { IpcChannels, type CodeSession, type Result } from '../shared/api';
import type { CodeEntry, CodeFile } from '../shared/code';
import { Workspace } from './code/workspace';
import type { ChatRepository } from './db/chat-repository';

/**
 * Seite „Code“: Sitzungen mit Projektordner, Dateibaum und Datei-Ansicht.
 * Den Ordner wählst du immer im Windows-Dialog – die Oberfläche kann keinen
 * Pfad vorgeben.
 */
export function registerCodeHandlers(chats: ChatRepository) {
  /** Projektordner einer Sitzung, frisch geprüft. */
  const workspaceOf = async (sessionId: unknown): Promise<Workspace> => {
    const chat =
      typeof sessionId === 'string' ? chats.getChat(sessionId) : null;
    if (!chat?.workspace) throw new Error('Diese Code-Sitzung gibt es nicht.');
    return Workspace.open(chat.workspace);
  };

  ipcMain.handle(IpcChannels.listCodeSessions, () => chats.listCodeSessions());

  ipcMain.handle(
    IpcChannels.createCodeSession,
    async (event): Promise<Result<CodeSession> | null> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: 'Projektordner wählen',
        properties: ['openDirectory'],
      };
      const picked = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (picked.canceled || picked.filePaths.length === 0) return null;
      return attempt(async () => {
        const workspace = await Workspace.open(picked.filePaths[0]);
        const id = randomUUID();
        chats.createChat({
          id,
          title: path.basename(workspace.root),
          model: '',
          workspace: workspace.root,
        });
        const session = chats.listCodeSessions().find((s) => s.id === id);
        if (!session) throw new Error('Sitzung nicht angelegt.');
        return session;
      });
    },
  );

  ipcMain.handle(
    IpcChannels.listCodeDir,
    (
      _event,
      sessionId: unknown,
      relative: unknown,
    ): Promise<Result<CodeEntry[]>> =>
      attempt(async () =>
        (await workspaceOf(sessionId)).list(
          typeof relative === 'string' ? relative : '',
        ),
      ),
  );

  ipcMain.handle(
    IpcChannels.readCodeFile,
    (
      _event,
      sessionId: unknown,
      relative: unknown,
    ): Promise<Result<CodeFile>> =>
      attempt(async () => {
        if (typeof relative !== 'string') throw new Error('Ungültiger Pfad.');
        return (await workspaceOf(sessionId)).read(relative);
      }),
  );
}

async function attempt<T>(task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
