import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import started from 'electron-squirrel-startup';
import { IpcChannels, type AppInfo, type GpuStatus } from '../shared/api';
import { isLocalServer } from '../shared/server';
import { queryGpus } from './system/gpu';
import { registerChatHandlers } from './chat-service';
import { registerDownloadHandlers } from './download-service';
import { openDatabase } from './db/database';
import { ChatRepository } from './db/chat-repository';
import { FolderRepository } from './db/folder-repository';
import { ServerRepository } from './db/server-repository';
import { registerFolderHandlers } from './folder-service';
import { TemplateRepository } from './db/template-repository';
import { registerServerHandlers } from './server-service';
import { registerTemplateHandlers } from './template-service';

// Der Windows-Installer (Squirrel) startet die App kurz beim Installieren,
// um Verknüpfungen anzulegen – in dem Fall sofort wieder beenden.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'LocalDesk',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // Sicherheit: Die Oberfläche bekommt keinen direkten Zugriff auf Node/Dateien.
      // Diese Werte sind in Electron schon Standard; wir setzen sie bewusst sichtbar.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Links aus Chat-Antworten sollen im normalen Browser aufgehen,
  // nicht als neues Fenster innerhalb der App.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Die App-Seite darf nicht auf fremde Seiten wegnavigieren
  // (im Entwicklungsmodus ist nur der Vite-Server erlaubt, z. B. beim Neuladen).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    if (!devUrl || !url.startsWith(devUrl)) {
      event.preventDefault();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

function registerIpcHandlers(db: DatabaseSync, chats: ChatRepository) {
  registerTemplateHandlers(new TemplateRepository(db));
  registerFolderHandlers(new FolderRepository(db), chats);
  // Welcher Ollama-Server gerade gilt, entscheidet das aktive Server-Profil.
  const { getProvider } = registerServerHandlers(new ServerRepository(db));
  ipcMain.handle(IpcChannels.getOllamaStatus, () =>
    getProvider().checkStatus(),
  );
  ipcMain.handle(IpcChannels.listModels, () => getProvider().listModels());
  ipcMain.handle(IpcChannels.listRunningModels, () =>
    getProvider().listRunning(),
  );
  // Die Grafikkarte lässt sich nur messen, wenn Ollama auf diesem PC rechnet –
  // bei einem Server im LAN wäre es die falsche Karte.
  ipcMain.handle(
    IpcChannels.getGpuStatus,
    (): Promise<GpuStatus> | GpuStatus =>
      isLocalServer(getProvider().baseUrl)
        ? queryGpus()
        : { available: false, reason: 'remote' },
  );
  registerChatHandlers(getProvider, chats);
  registerDownloadHandlers(getProvider);

  ipcMain.handle(IpcChannels.getAppInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    dataPath: app.getPath('userData'),
  }));
}

app.whenReady().then(() => {
  // Die Datenbank liegt im Benutzerordner, z. B. %APPDATA%\LocalDesk\localdesk.db
  const db = openDatabase(path.join(app.getPath('userData'), 'localdesk.db'));
  app.on('will-quit', () => db.close());
  const chats = new ChatRepository(db);
  chats.markInterrupted();

  registerIpcHandlers(db, chats);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
