import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, CancellationToken } from 'electron-updater';
import { IpcChannels } from '../shared/api';
import {
  describeUpdateError,
  releaseNotesText,
  type UpdateState,
} from '../shared/update';

/** Wo die Releases liegen (wie in electron-builder.yml). */
const GITHUB = {
  provider: 'github',
  owner: 'JPPM9',
  repo: 'LocalDesk',
} as const;

/**
 * Update nur auf Knopfdruck (vereinbart): suchen → du bestätigst → laden (Prüfsumme
 * SHA-512 aus latest.yml) → du startest neu → der Installer läuft still im
 * bisherigen Ordner und startet LocalDesk wieder. Nichts passiert von selbst.
 */
export function registerUpdateHandlers() {
  let state: UpdateState = app.isPackaged ? { kind: 'idle' } : { kind: 'dev' };
  let cancel: CancellationToken | null = null;

  const set = (next: UpdateState) => {
    state = next;
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IpcChannels.updateChanged, state);
    }
  };

  if (app.isPackaged) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    // Kein Protokoll in Dateien – Fehler zeigen wir in der Oberfläche.
    autoUpdater.logger = null;
    // Nur zum Testen ohne Veröffentlichung: eigener Update-Server (z. B. localhost).
    const testUrl = process.env.LOCALDESK_UPDATE_URL;
    autoUpdater.setFeedURL(
      testUrl ? { provider: 'generic', url: testUrl } : GITHUB,
    );
    autoUpdater.on('download-progress', (progress) => {
      if (state.kind !== 'downloading') return;
      set({
        ...state,
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      });
    });
  }

  ipcMain.handle(IpcChannels.getUpdateState, () => state);

  ipcMain.handle(IpcChannels.checkForUpdates, async () => {
    if (!app.isPackaged || busy(state)) return state;
    set({ kind: 'checking' });
    try {
      const result = await autoUpdater.checkForUpdates();
      const info = result?.updateInfo;
      if (!result?.isUpdateAvailable || !info) {
        set({ kind: 'latest', version: app.getVersion() });
      } else {
        set({
          kind: 'available',
          version: info.version,
          notes: releaseNotesText(info.releaseNotes),
          ...(info.releaseDate && { date: info.releaseDate }),
        });
      }
    } catch (error) {
      set({ kind: 'error', error: describeUpdateError(messageOf(error)) });
    }
    return state;
  });

  ipcMain.handle(IpcChannels.downloadUpdate, async () => {
    if (state.kind !== 'available') return state;
    const version = state.version;
    cancel = new CancellationToken();
    set({ kind: 'downloading', version, percent: 0, transferred: 0, total: 0 });
    try {
      await autoUpdater.downloadUpdate(cancel);
      set({ kind: 'ready', version });
    } catch (error) {
      set(
        cancel.cancelled
          ? { kind: 'idle' }
          : { kind: 'error', error: describeUpdateError(messageOf(error)) },
      );
    } finally {
      cancel = null;
    }
    return state;
  });

  ipcMain.handle(IpcChannels.cancelUpdate, () => {
    cancel?.cancel();
  });

  // Still installieren (gleicher Ordner wie bisher) und danach neu starten.
  ipcMain.handle(IpcChannels.installUpdate, () => {
    if (state.kind === 'ready') autoUpdater.quitAndInstall(true, true);
  });
}

function busy(state: UpdateState): boolean {
  return state.kind === 'checking' || state.kind === 'downloading';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
