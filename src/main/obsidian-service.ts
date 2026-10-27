import { ipcMain } from 'electron';
import { IpcChannels, type ObsidianStatus } from '../shared/api';
import type { AppSettingsRepository } from './db/app-settings-repository';
import {
  checkFolderName,
  DEFAULT_FOLDER,
  inspectVault,
  VaultWriter,
} from './obsidian/vault';

const VAULT_KEY = 'obsidian.vault';
const FOLDER_KEY = 'obsidian.folder';

/**
 * Obsidian-Vault für die Oberfläche: einrichten, prüfen, vergessen. Den
 * Schreib-Baustein (`writer()`) bekommen später Erinnerungen, gespeicherte Chats
 * und Zusammenfassungen – geschrieben wird immer nur im eigenen Unterordner.
 */
export function registerObsidianHandlers(settings: AppSettingsRepository) {
  const configured = () => {
    const vaultPath = settings.get(VAULT_KEY);
    return vaultPath
      ? { vaultPath, folder: settings.get(FOLDER_KEY) ?? DEFAULT_FOLDER }
      : null;
  };

  ipcMain.handle(
    IpcChannels.getObsidian,
    async (): Promise<ObsidianStatus | null> => {
      const config = configured();
      return config ? inspectVault(config.vaultPath, config.folder) : null;
    },
  );

  ipcMain.handle(
    IpcChannels.setObsidian,
    async (
      _event,
      vaultPath: unknown,
      folder: unknown,
    ): Promise<ObsidianStatus> => {
      const path = typeof vaultPath === 'string' ? vaultPath.trim() : '';
      const name = checkFolderName(folder);
      if (!name.ok) {
        return {
          vaultPath: path,
          folder: String(folder ?? ''),
          ok: false,
          looksLikeVault: false,
          error: name.error,
        };
      }
      const status = await inspectVault(path, name.value);
      // Nur einen nutzbaren Ordner speichern.
      if (status.ok) {
        settings.set(VAULT_KEY, path);
        settings.set(FOLDER_KEY, name.value);
      }
      return status;
    },
  );

  ipcMain.handle(IpcChannels.clearObsidian, () => {
    settings.delete(VAULT_KEY);
    settings.delete(FOLDER_KEY);
  });

  return {
    /** Schreib-Baustein für den eingerichteten Vault; null = keiner eingerichtet. */
    writer: (): VaultWriter | null => {
      const config = configured();
      return config ? new VaultWriter(config.vaultPath, config.folder) : null;
    },
  };
}
