// Das Preload-Skript ist die einzige Brücke zwischen Oberfläche und Main-Prozess.
// Es legt `window.api` an – nur die hier aufgeführten Funktionen sind von React aus erreichbar.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IpcChannels,
  type ChatStreamEvent,
  type CollectionView,
  type DownloadState,
  type LocalDeskApi,
  type McpServerView,
} from '../shared/api';

const api: LocalDeskApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.getAppInfo),
  getOllamaStatus: () => ipcRenderer.invoke(IpcChannels.getOllamaStatus),
  listModels: () => ipcRenderer.invoke(IpcChannels.listModels),
  listRunningModels: () => ipcRenderer.invoke(IpcChannels.listRunningModels),
  deleteModel: (model) => ipcRenderer.invoke(IpcChannels.deleteModel, model),
  getGpuStatus: () => ipcRenderer.invoke(IpcChannels.getGpuStatus),

  startDownload: (model) =>
    ipcRenderer.invoke(IpcChannels.startDownload, model),
  cancelDownload: (model) =>
    ipcRenderer.invoke(IpcChannels.cancelDownload, model),
  dismissDownload: (model) =>
    ipcRenderer.invoke(IpcChannels.dismissDownload, model),
  listDownloads: () => ipcRenderer.invoke(IpcChannels.listDownloads),
  onDownloadsChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, list: DownloadState[]) =>
      listener(list);
    ipcRenderer.on(IpcChannels.downloadsChanged, handler);
    return () =>
      ipcRenderer.removeListener(IpcChannels.downloadsChanged, handler);
  },

  listMcpServers: () => ipcRenderer.invoke(IpcChannels.listMcpServers),
  saveMcpServer: (input) =>
    ipcRenderer.invoke(IpcChannels.saveMcpServer, input),
  setMcpServerEnabled: (serverId, enabled) =>
    ipcRenderer.invoke(IpcChannels.setMcpServerEnabled, serverId, enabled),
  restartMcpServer: (serverId) =>
    ipcRenderer.invoke(IpcChannels.restartMcpServer, serverId),
  deleteMcpServer: (serverId) =>
    ipcRenderer.invoke(IpcChannels.deleteMcpServer, serverId),
  setToolPermission: (serverId, toolName, permission) =>
    ipcRenderer.invoke(
      IpcChannels.setToolPermission,
      serverId,
      toolName,
      permission,
    ),
  pickFolders: () => ipcRenderer.invoke(IpcChannels.pickFolders),
  onMcpChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, list: McpServerView[]) =>
      listener(list);
    ipcRenderer.on(IpcChannels.mcpChanged, handler);
    return () => ipcRenderer.removeListener(IpcChannels.mcpChanged, handler);
  },

  listCollections: () => ipcRenderer.invoke(IpcChannels.listCollections),
  saveCollection: (input) =>
    ipcRenderer.invoke(IpcChannels.saveCollection, input),
  deleteCollection: (collectionId) =>
    ipcRenderer.invoke(IpcChannels.deleteCollection, collectionId),
  indexCollection: (collectionId) =>
    ipcRenderer.invoke(IpcChannels.indexCollection, collectionId),
  cancelIndexing: (collectionId) =>
    ipcRenderer.invoke(IpcChannels.cancelIndexing, collectionId),
  listDocuments: (collectionId) =>
    ipcRenderer.invoke(IpcChannels.listDocuments, collectionId),
  pickFiles: () => ipcRenderer.invoke(IpcChannels.pickFiles),
  openDocument: (documentId) =>
    ipcRenderer.invoke(IpcChannels.openDocument, documentId),
  onCollectionsChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, list: CollectionView[]) =>
      listener(list);
    ipcRenderer.on(IpcChannels.collectionsChanged, handler);
    return () =>
      ipcRenderer.removeListener(IpcChannels.collectionsChanged, handler);
  },

  listChats: () => ipcRenderer.invoke(IpcChannels.listChats),
  getChat: (chatId) => ipcRenderer.invoke(IpcChannels.getChat, chatId),
  renameChat: (chatId, title) =>
    ipcRenderer.invoke(IpcChannels.renameChat, chatId, title),
  deleteChat: (chatId) => ipcRenderer.invoke(IpcChannels.deleteChat, chatId),
  updateChatSettings: (chatId, settings) =>
    ipcRenderer.invoke(IpcChannels.updateChatSettings, chatId, settings),
  searchChats: (query) => ipcRenderer.invoke(IpcChannels.searchChats, query),

  listFolders: () => ipcRenderer.invoke(IpcChannels.listFolders),
  createFolder: (name) => ipcRenderer.invoke(IpcChannels.createFolder, name),
  renameFolder: (folderId, name) =>
    ipcRenderer.invoke(IpcChannels.renameFolder, folderId, name),
  deleteFolder: (folderId) =>
    ipcRenderer.invoke(IpcChannels.deleteFolder, folderId),
  moveChat: (chatId, folderId) =>
    ipcRenderer.invoke(IpcChannels.moveChat, chatId, folderId),

  listServers: () => ipcRenderer.invoke(IpcChannels.listServers),
  saveServer: (input) => ipcRenderer.invoke(IpcChannels.saveServer, input),
  deleteServer: (profileId) =>
    ipcRenderer.invoke(IpcChannels.deleteServer, profileId),
  setActiveServer: (profileId) =>
    ipcRenderer.invoke(IpcChannels.setActiveServer, profileId),
  testServer: (address) => ipcRenderer.invoke(IpcChannels.testServer, address),

  listTemplates: () => ipcRenderer.invoke(IpcChannels.listTemplates),
  saveTemplate: (template) =>
    ipcRenderer.invoke(IpcChannels.saveTemplate, template),
  deleteTemplate: (templateId) =>
    ipcRenderer.invoke(IpcChannels.deleteTemplate, templateId),

  chatSend: (request) => ipcRenderer.invoke(IpcChannels.chatSend, request),
  chatCancel: (requestId) =>
    ipcRenderer.invoke(IpcChannels.chatCancel, requestId),
  chatToolDecision: (callId, decision) =>
    ipcRenderer.invoke(IpcChannels.chatToolDecision, callId, decision),
  onChatEvent: (listener) => {
    // Das Electron-Ereignisobjekt geben wir nicht weiter – nur die Daten.
    const handler = (_event: IpcRendererEvent, data: ChatStreamEvent) =>
      listener(data);
    ipcRenderer.on(IpcChannels.chatEvent, handler);
    return () => ipcRenderer.removeListener(IpcChannels.chatEvent, handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
