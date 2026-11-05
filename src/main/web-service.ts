import { ipcMain } from 'electron';
import { IpcChannels, type Result } from '../shared/api';
import { tr } from '../shared/messages';
import type { WebSearchState } from '../shared/web';
import type { AppSettingsRepository } from './db/app-settings-repository';
import { safeStorageCipher } from './secret-cipher';
import { searchWeb } from './web/search';
import { SearchKeyStore } from './web/search-key';

/**
 * Websuche: Der Ollama-Schlüssel (eigener Abschnitt in den Einstellungen). Er bleibt im
 * Hauptprozess – die Oberfläche kann ihn setzen, löschen und eine Probe-Suche auslösen,
 * ihn aber nie lesen. Gibt den Speicher zurück, damit der Chat ihn für die Suche nutzen kann.
 */
export function registerWebHandlers(
  settings: AppSettingsRepository,
): SearchKeyStore {
  const keys = new SearchKeyStore(settings, safeStorageCipher);
  const state = (): WebSearchState => ({ configured: keys.configured() });

  ipcMain.handle(IpcChannels.getWebSearch, state);

  ipcMain.handle(
    IpcChannels.setWebSearchKey,
    async (_event, key: unknown): Promise<Result<WebSearchState>> => {
      const saved = await keys.save(key);
      return saved.ok ? { ok: true, value: state() } : saved;
    },
  );

  ipcMain.handle(IpcChannels.clearWebSearchKey, (): WebSearchState => {
    keys.clear();
    return state();
  });

  ipcMain.handle(IpcChannels.testWebSearch, async (): Promise<Result<null>> => {
    const key = await keys.load();
    if (!key) return { ok: false, error: tr('web.searchNoKey') };
    // Eine Anfrage mit einem Treffer – nur auf deinen Klick.
    const result = await searchWeb(
      'Ollama',
      key,
      new AbortController().signal,
      1,
    );
    return result.ok ? { ok: true, value: null } : result;
  });

  return keys;
}
