import { BrowserWindow, ipcMain } from 'electron';
import { IpcChannels, type DownloadState, type Result } from '../shared/api';
import {
  applyPullChunk,
  isValidModelName,
  newDownload,
} from '../shared/download';
import type { Provider } from './providers/provider';
import { tr } from '../shared/messages';

/** Die Oberfläche bekommt höchstens alle 250 ms einen neuen Stand – sonst flackert es. */
const BROADCAST_INTERVAL_MS = 250;

/**
 * Verwaltet Modell-Downloads. Sie laufen im Main-Prozess, damit sie weiterlaufen,
 * wenn man in der App die Seite wechselt. Jede Änderung geht als Liste an alle Fenster.
 */
export function registerDownloadHandlers(getProvider: () => Provider) {
  const downloads = new Map<string, DownloadState>();
  const controllers = new Map<string, AbortController>();
  let lastBroadcast = 0;
  let pendingBroadcast: ReturnType<typeof setTimeout> | null = null;

  const broadcast = (force = false) => {
    const send = () => {
      lastBroadcast = Date.now();
      pendingBroadcast = null;
      const list = [...downloads.values()];
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IpcChannels.downloadsChanged, list);
      }
    };
    if (force || Date.now() - lastBroadcast >= BROADCAST_INTERVAL_MS) {
      if (pendingBroadcast) clearTimeout(pendingBroadcast);
      send();
    } else if (!pendingBroadcast) {
      pendingBroadcast = setTimeout(send, BROADCAST_INTERVAL_MS);
    }
  };

  const update = (model: string, next: DownloadState, force = false) => {
    downloads.set(model, next);
    broadcast(force);
  };

  async function run(model: string, controller: AbortController) {
    let state = newDownload(model, Date.now());
    update(model, state, true);
    try {
      for await (const chunk of getProvider().pull(model, controller.signal)) {
        const next = applyPullChunk(state, chunk);
        const phaseChanged = next.phase !== state.phase;
        state = next;
        update(model, state, phaseChanged);
      }
      if (state.phase !== 'done') {
        // Stream endete ohne „success“ – z. B. Verbindung weg
        state = { ...state, phase: 'error', error: 'Download unvollständig' };
      }
    } catch (error) {
      state = controller.signal.aborted
        ? { ...state, phase: 'aborted' }
        : {
            ...state,
            phase: 'error',
            error: error instanceof Error ? error.message : String(error),
          };
    }
    controllers.delete(model);
    update(model, state, true);
  }

  ipcMain.handle(IpcChannels.listDownloads, () => [...downloads.values()]);

  ipcMain.handle(
    IpcChannels.startDownload,
    (_event, model: unknown): Result<void> => {
      const name = typeof model === 'string' ? model.trim() : '';
      if (!isValidModelName(name)) {
        return { ok: false, error: tr('error.invalidModelName') };
      }
      if (controllers.has(name)) {
        return {
          ok: false,
          error: 'Dieses Modell wird schon heruntergeladen.',
        };
      }
      const controller = new AbortController();
      controllers.set(name, controller);
      void run(name, controller);
      return { ok: true, value: undefined };
    },
  );

  ipcMain.handle(IpcChannels.cancelDownload, (_event, model: unknown) => {
    if (typeof model === 'string') controllers.get(model)?.abort();
  });

  // Fertige, abgebrochene oder fehlgeschlagene Einträge aus der Liste nehmen.
  ipcMain.handle(IpcChannels.dismissDownload, (_event, model: unknown) => {
    if (typeof model === 'string' && !controllers.has(model)) {
      downloads.delete(model);
      broadcast(true);
    }
  });
}
