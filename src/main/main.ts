import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { IpcChannels, type AppInfo } from '../shared/api';
import { OllamaProvider } from './providers/ollama';
import { registerChatHandlers } from './chat-service';
import { openDatabase } from './db/database';
import { ChatRepository } from './db/chat-repository';
import { TemplateRepository } from './db/template-repository';
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

// Feste Standard-Adresse; umschaltbare Server-Profile (lokal/LAN) kommen in Phase 2.
const ollama = new OllamaProvider();

function registerIpcHandlers(
  chats: ChatRepository,
  templates: TemplateRepository,
) {
  registerTemplateHandlers(templates);
  ipcMain.handle(IpcChannels.getOllamaStatus, () => ollama.checkStatus());
  ipcMain.handle(IpcChannels.listModels, () => ollama.listModels());
  registerChatHandlers(ollama, chats);

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

  registerIpcHandlers(chats, new TemplateRepository(db));
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
