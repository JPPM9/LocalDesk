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
import type { UpdateState } from '../shared/update';

const api: LocalDeskApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.getAppInfo),
  getLicenses: () => ipcRenderer.invoke(IpcChannels.getLicenses),
  getPrivacy: () => ipcRenderer.invoke(IpcChannels.getPrivacy),
  getOllamaStatus: () => ipcRenderer.invoke(IpcChannels.getOllamaStatus),
  listModels: () => ipcRenderer.invoke(IpcChannels.listModels),
  listRunningModels: () => ipcRenderer.invoke(IpcChannels.listRunningModels),
  deleteModel: (model) => ipcRenderer.invoke(IpcChannels.deleteModel, model),
  getGpuStatus: () => ipcRenderer.invoke(IpcChannels.getGpuStatus),
  getKvBytesPerToken: (model) =>
    ipcRenderer.invoke(IpcChannels.getKvBytesPerToken, model),

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
  listCodeSessions: () => ipcRenderer.invoke(IpcChannels.listCodeSessions),
  createCodeSession: () => ipcRenderer.invoke(IpcChannels.createCodeSession),
  listCodeDir: (sessionId, relative) =>
    ipcRenderer.invoke(IpcChannels.listCodeDir, sessionId, relative),
  readCodeFile: (sessionId, relative) =>
    ipcRenderer.invoke(IpcChannels.readCodeFile, sessionId, relative),
  codeChangeState: (callId) =>
    ipcRenderer.invoke(IpcChannels.codeChangeState, callId),
  undoCodeChange: (callId, force) =>
    ipcRenderer.invoke(IpcChannels.undoCodeChange, callId, force),
  getMailApps: () => ipcRenderer.invoke(IpcChannels.getMailApps),
  setGoogleApp: (app) => ipcRenderer.invoke(IpcChannels.setGoogleApp, app),
  clearGoogleApp: () => ipcRenderer.invoke(IpcChannels.clearGoogleApp),
  listMailAccounts: () => ipcRenderer.invoke(IpcChannels.listMailAccounts),
  connectGoogle: () => ipcRenderer.invoke(IpcChannels.connectGoogle),
  cancelMailConnect: () => ipcRenderer.invoke(IpcChannels.cancelMailConnect),
  disconnectMailAccount: (id) =>
    ipcRenderer.invoke(IpcChannels.disconnectMailAccount, id),
  listMail: (query) => ipcRenderer.invoke(IpcChannels.listMail, query),
  getMail: (accountId, messageId) =>
    ipcRenderer.invoke(IpcChannels.getMail, accountId, messageId),
  listMailLabels: (accountId) =>
    ipcRenderer.invoke(IpcChannels.listMailLabels, accountId),
  summarizeMail: (accountId, messageId, model) =>
    ipcRenderer.invoke(IpcChannels.summarizeMail, accountId, messageId, model),
  cancelMailSummary: () => ipcRenderer.invoke(IpcChannels.cancelMailSummary),
  suggestMailSorting: (accountId, messageIds, model) =>
    ipcRenderer.invoke(
      IpcChannels.suggestMailSorting,
      accountId,
      messageIds,
      model,
    ),
  cancelMailSorting: () => ipcRenderer.invoke(IpcChannels.cancelMailSorting),
  applyMailChanges: (accountId, changes) =>
    ipcRenderer.invoke(IpcChannels.applyMailChanges, accountId, changes),
  getObsidian: () => ipcRenderer.invoke(IpcChannels.getObsidian),
  setObsidian: (vaultPath, folder) =>
    ipcRenderer.invoke(IpcChannels.setObsidian, vaultPath, folder),
  clearObsidian: () => ipcRenderer.invoke(IpcChannels.clearObsidian),
  listMemories: () => ipcRenderer.invoke(IpcChannels.listMemories),
  addMemory: (text, projectId) =>
    ipcRenderer.invoke(IpcChannels.addMemory, text, projectId),
  deleteMemory: (id) => ipcRenderer.invoke(IpcChannels.deleteMemory, id),
  openMemory: (id) => ipcRenderer.invoke(IpcChannels.openMemory, id),
  saveChatNote: (chatId, answerId) =>
    ipcRenderer.invoke(IpcChannels.saveChatNote, chatId, answerId),
  summarizeChat: (chatId, model) =>
    ipcRenderer.invoke(IpcChannels.summarizeChat, chatId, model),
  cancelSummary: (chatId) =>
    ipcRenderer.invoke(IpcChannels.cancelSummary, chatId),
  saveSummary: (chatId, model, draft) =>
    ipcRenderer.invoke(IpcChannels.saveSummary, chatId, model, draft),
  dismissSummary: (chatId) =>
    ipcRenderer.invoke(IpcChannels.dismissSummary, chatId),
  listSkills: () => ipcRenderer.invoke(IpcChannels.listSkills),
  saveSkill: (input) => ipcRenderer.invoke(IpcChannels.saveSkill, input),
  deleteSkill: (id) => ipcRenderer.invoke(IpcChannels.deleteSkill, id),
  openSkillFolder: (id) => ipcRenderer.invoke(IpcChannels.openSkillFolder, id),
  getTheme: () => ipcRenderer.invoke(IpcChannels.getTheme),
  setTheme: (theme) => ipcRenderer.invoke(IpcChannels.setTheme, theme),
  getUpdateState: () => ipcRenderer.invoke(IpcChannels.getUpdateState),
  checkForUpdates: () => ipcRenderer.invoke(IpcChannels.checkForUpdates),
  downloadUpdate: () => ipcRenderer.invoke(IpcChannels.downloadUpdate),
  cancelUpdate: () => ipcRenderer.invoke(IpcChannels.cancelUpdate),
  installUpdate: () => ipcRenderer.invoke(IpcChannels.installUpdate),
  onUpdateChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, state: UpdateState) =>
      listener(state);
    ipcRenderer.on(IpcChannels.updateChanged, handler);
    return () => ipcRenderer.removeListener(IpcChannels.updateChanged, handler);
  },
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
  setProjectInstructions: (folderId, instructions) =>
    ipcRenderer.invoke(
      IpcChannels.setProjectInstructions,
      folderId,
      instructions,
    ),
  setProjectSkills: (folderId, skillIds) =>
    ipcRenderer.invoke(IpcChannels.setProjectSkills, folderId, skillIds),
  ensureProjectCollection: (folderId) =>
    ipcRenderer.invoke(IpcChannels.ensureProjectCollection, folderId),

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
  chatToolDecision: (callId, decision, args) =>
    ipcRenderer.invoke(IpcChannels.chatToolDecision, callId, decision, args),
  onChatEvent: (listener) => {
    // Das Electron-Ereignisobjekt geben wir nicht weiter – nur die Daten.
    const handler = (_event: IpcRendererEvent, data: ChatStreamEvent) =>
      listener(data);
    ipcRenderer.on(IpcChannels.chatEvent, handler);
    return () => ipcRenderer.removeListener(IpcChannels.chatEvent, handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
