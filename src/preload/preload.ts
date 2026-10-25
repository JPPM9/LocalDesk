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
  chatStart: (requestId, request) =>
    ipcRenderer.invoke(IpcChannels.chatStart, requestId, request),
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
