import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import {
  IpcChannels,
  type AppInfo,
  type GpuStatus,
  type Result,
} from '../shared/api';
import { kvBytesPerToken } from '../shared/context';
import { isValidModelName } from '../shared/download';
import { isLocalServer } from '../shared/server';
import { queryGpus } from './system/gpu';
import { registerChatHandlers } from './chat-service';
import { registerDownloadHandlers } from './download-service';
import { AppSettingsRepository } from './db/app-settings-repository';
import { KnowledgeRepository } from './db/knowledge-repository';
import { registerObsidianHandlers } from './obsidian-service';
import { registerSummaryHandlers } from './summary-service';
import {
  DEFAULT_EMBEDDING_MODEL,
  registerKnowledgeHandlers,
} from './knowledge-service';
import { McpRepository } from './db/mcp-repository';
import { registerMcpHandlers } from './mcp-service';
import { openDatabase } from './db/database';
import { ChatRepository } from './db/chat-repository';
import { FolderRepository } from './db/folder-repository';
import { ServerRepository } from './db/server-repository';
import { registerFolderHandlers } from './folder-service';
import { TemplateRepository } from './db/template-repository';
import { registerServerHandlers } from './server-service';
import { registerTemplateHandlers } from './template-service';

// Gleiche Kennung wie im Installer (electron-builder.yml, appId): Taskleiste und
// Verknüpfungen gehören so zusammen.
app.setAppUserModelId('io.github.jppm9.localdesk');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'LocalDesk',
    // In der gebauten App nimmt Windows das Symbol der LocalDesk.exe; beim Entwickeln
    // trüge das Fenster sonst das Electron-Symbol.
    ...(!app.isPackaged && {
      icon: path.join(app.getAppPath(), 'assets', 'icon.ico'),
    }),
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
  // Welcher Ollama-Server gerade gilt, entscheidet das aktive Server-Profil.
  const { getProvider } = registerServerHandlers(new ServerRepository(db));
  const folders = new FolderRepository(db);
  // Obsidian-Vault (Phase 6): Erinnerungen, gespeicherte Chats, Zusammenfassungen.
  // Die Wissens-Dienste kommen erst weiter unten – bis dahin merken wir uns nur den Weg.
  let syncObsidian: (vaultPath: string | null) => void = () => {};
  const obsidian = registerObsidianHandlers(new AppSettingsRepository(db), {
    getProvider,
    projects: () => folders.listFolders(),
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
    getChat: (chatId) => chats.getChat(chatId),
    onVaultChanged: (vaultPath) => syncObsidian(vaultPath),
  });
  registerSummaryHandlers({
    getProvider,
    chats,
    writer: obsidian.writer,
    projects: () => folders.listFolders(),
  });
  ipcMain.handle(IpcChannels.getOllamaStatus, () =>
    getProvider().checkStatus(),
  );
  ipcMain.handle(IpcChannels.listModels, () => getProvider().listModels());
  ipcMain.handle(IpcChannels.listRunningModels, () =>
    getProvider().listRunning(),
  );
  // Löschen ist endgültig – deshalb nur mit gültigem Namen (die Rückfrage stellt die Oberfläche).
  ipcMain.handle(
    IpcChannels.deleteModel,
    (_event, model: unknown): Promise<Result<void>> | Result<void> =>
      typeof model === 'string' && isValidModelName(model)
        ? getProvider().deleteModel(model)
        : { ok: false, error: 'Ungültiger Modellname' },
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
  // Für „Kontextlänge erhöhen“: wie viel Grafikspeicher kostet ein Token mehr?
  ipcMain.handle(
    IpcChannels.getKvBytesPerToken,
    async (_event, model: unknown): Promise<number | null> => {
      if (typeof model !== 'string' || !isValidModelName(model)) return null;
      const info = await getProvider().modelInfo(model);
      return info.ok ? kvBytesPerToken(info.value) : null;
    },
  );
  registerDownloadHandlers(getProvider);
  const { manager: mcp, tools: mcpTools } = registerMcpHandlers(
    new McpRepository(db),
  );
  // MCP-Server sind eigene Programme – beim Beenden der App mit beenden.
  app.on('will-quit', () => void mcp.stopAll());
  const knowledge = registerKnowledgeHandlers(
    new KnowledgeRepository(db),
    getProvider,
  );
  app.on('will-quit', () => knowledge.stop());
  // Sammlung „Obsidian“ passend zum eingerichteten Vault (auch für ältere Installationen).
  syncObsidian = knowledge.syncObsidian;
  syncObsidian(obsidian.vaultPath());
  // Projekte = Ordner mit Anweisungen und eigenen Dokumenten (eine Sammlung).
  registerFolderHandlers(folders, chats, knowledge.projects);
  registerChatHandlers(
    getProvider,
    chats,
    mcpTools,
    knowledge.knowledge,
    (folderId) => folders.getFolder(folderId),
    obsidian.chatMemory,
  );

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
