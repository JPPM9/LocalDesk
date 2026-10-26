// Das Preload-Skript ist die einzige Brücke zwischen Oberfläche und Main-Prozess.
// Es legt `window.api` an – nur die hier aufgeführten Funktionen sind von React aus erreichbar.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IpcChannels,
  type ChatStreamEvent,
  type LocalDeskApi,
} from '../shared/api';

const api: LocalDeskApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.getAppInfo),
  getOllamaStatus: () => ipcRenderer.invoke(IpcChannels.getOllamaStatus),
  listModels: () => ipcRenderer.invoke(IpcChannels.listModels),

  listChats: () => ipcRenderer.invoke(IpcChannels.listChats),
  getChat: (chatId) => ipcRenderer.invoke(IpcChannels.getChat, chatId),
  renameChat: (chatId, title) =>
    ipcRenderer.invoke(IpcChannels.renameChat, chatId, title),
  deleteChat: (chatId) => ipcRenderer.invoke(IpcChannels.deleteChat, chatId),
  updateChatSettings: (chatId, settings) =>
    ipcRenderer.invoke(IpcChannels.updateChatSettings, chatId, settings),

  listTemplates: () => ipcRenderer.invoke(IpcChannels.listTemplates),
  saveTemplate: (template) =>
    ipcRenderer.invoke(IpcChannels.saveTemplate, template),
  deleteTemplate: (templateId) =>
    ipcRenderer.invoke(IpcChannels.deleteTemplate, templateId),

  chatSend: (request) => ipcRenderer.invoke(IpcChannels.chatSend, request),
  chatCancel: (requestId) =>
    ipcRenderer.invoke(IpcChannels.chatCancel, requestId),
  onChatEvent: (listener) => {
    // Das Electron-Ereignisobjekt geben wir nicht weiter – nur die Daten.
    const handler = (_event: IpcRendererEvent, data: ChatStreamEvent) =>
      listener(data);
    ipcRenderer.on(IpcChannels.chatEvent, handler);
    return () => ipcRenderer.removeListener(IpcChannels.chatEvent, handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
