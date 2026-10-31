import { ipcMain } from 'electron';
import { IpcChannels, type ProviderStatus } from '../shared/api';
import { normalizeServerUrl } from '../shared/server';
import type { ServerRepository } from './db/server-repository';
import { OllamaProvider } from './providers/ollama';
import type { Provider } from './providers/provider';
import { tr } from '../shared/messages';

/**
 * Verwaltet die Server-Profile und hält den Provider für den aktiven Server.
 * Alle anderen Teile holen sich den Provider über `getProvider()` – so gilt ein
 * Umschalten sofort für Status, Modellliste und neue Chat-Antworten.
 * Bereits laufende Antworten beenden sich noch auf dem alten Server.
 */
export function registerServerHandlers(servers: ServerRepository) {
  let provider = new OllamaProvider({ baseUrl: servers.getActive().baseUrl });

  const reloadActive = () => {
    const { baseUrl } = servers.getActive();
    if (baseUrl !== provider.baseUrl)
      provider = new OllamaProvider({ baseUrl });
  };

  ipcMain.handle(IpcChannels.listServers, () => servers.listProfiles());

  ipcMain.handle(IpcChannels.saveServer, (_event, input: unknown) => {
    const result = servers.saveProfile(input);
    reloadActive(); // falls die Adresse des aktiven Servers geändert wurde
    return result;
  });

  ipcMain.handle(IpcChannels.deleteServer, (_event, profileId: unknown) => {
    if (typeof profileId !== 'string')
      return { ok: false, error: tr('error.invalidId') };
    const result = servers.deleteProfile(profileId);
    reloadActive();
    return result;
  });

  ipcMain.handle(IpcChannels.setActiveServer, (_event, profileId: unknown) => {
    if (typeof profileId !== 'string')
      return { ok: false, error: tr('error.invalidId') };
    const result = servers.setActive(profileId);
    reloadActive();
    return result;
  });

  // Prüft eine Adresse, ohne sie zu speichern („Verbindung testen“).
  ipcMain.handle(
    IpcChannels.testServer,
    async (_event, address: unknown): Promise<ProviderStatus> => {
      const url = normalizeServerUrl(
        typeof address === 'string' ? address : '',
      );
      if (!url.ok)
        return { online: false, baseUrl: String(address), error: url.error };
      return new OllamaProvider({ baseUrl: url.value }).checkStatus();
    },
  );

  return { getProvider: (): Provider => provider };
}
