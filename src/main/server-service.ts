import { ipcMain } from 'electron';
import {
  IpcChannels,
  type ProviderStatus,
  type ServerKind,
  type ServerProfile,
} from '../shared/api';
import { normalizeServerUrl } from '../shared/server';
import type { ServerRepository } from './db/server-repository';
import type { TokenCipher } from './mail/mail-sessions';
import { OllamaProvider } from './providers/ollama';
import { OpenAiCompatProvider } from './providers/openai-compat';
import type { Provider } from './providers/provider';
import { safeStorageCipher } from './secret-cipher';
import { probeServers } from './server-probe';
import { tr } from '../shared/messages';

const KEY_MAX = 400;

/**
 * Verwaltet die Server-Profile und hält den Provider für den aktiven Server.
 * Alle anderen Teile holen sich den Provider über `getProvider()` – so gilt ein
 * Umschalten sofort für Status, Modellliste und neue Chat-Antworten.
 * Bereits laufende Antworten beenden sich noch auf dem alten Server.
 */
export function registerServerHandlers(
  servers: ServerRepository,
  cipher: TokenCipher = safeStorageCipher,
) {
  /** Baut den passenden Provider; der API-Schlüssel wird erst bei der Anfrage entschlüsselt. */
  const makeProvider = (
    profile: Pick<ServerProfile, 'id' | 'baseUrl' | 'kind'>,
  ): Provider => {
    if (profile.kind === 'openai') {
      return new OpenAiCompatProvider({
        baseUrl: profile.baseUrl,
        apiKey: async () => {
          const encrypted = servers.getApiKey(profile.id);
          if (!encrypted) return null;
          try {
            return await cipher.decrypt(encrypted);
          } catch {
            return null;
          }
        },
      });
    }
    return new OllamaProvider({ baseUrl: profile.baseUrl });
  };

  let provider = makeProvider(servers.getActive());
  const reloadActive = () => {
    provider = makeProvider(servers.getActive());
  };

  ipcMain.handle(IpcChannels.listServers, () => servers.listProfiles());

  ipcMain.handle(IpcChannels.saveServer, async (_event, input: unknown) => {
    const result = servers.saveProfile(input);
    if (!result.ok) return result;
    const apiKey = (input as { apiKey?: unknown }).apiKey;
    if (typeof apiKey === 'string') {
      const key = apiKey.trim();
      if (key === '') {
        servers.setApiKey(result.value.id, null);
      } else if (
        key.length > KEY_MAX ||
        !/^[\x21-\x7e]+$/.test(key) ||
        !(await cipher.available())
      ) {
        return { ok: false, error: tr('server.keyUnavailable') };
      } else {
        servers.setApiKey(result.value.id, await cipher.encrypt(key));
      }
    }
    reloadActive();
    return {
      ok: true,
      value: servers.listProfiles().find((p) => p.id === result.value.id)!,
    };
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
    async (
      _event,
      address: unknown,
      kindInput?: unknown,
      apiKey?: unknown,
    ): Promise<ProviderStatus> => {
      const kind: ServerKind = kindInput === 'openai' ? 'openai' : 'ollama';
      const url = normalizeServerUrl(
        typeof address === 'string' ? address : '',
        kind,
      );
      if (!url.ok)
        return { online: false, baseUrl: String(address), error: url.error };
      if (kind === 'openai') {
        const key = typeof apiKey === 'string' ? apiKey.trim() : '';
        return new OpenAiCompatProvider({
          baseUrl: url.value,
          apiKey: async () => key || null,
        }).checkStatus();
      }
      return new OllamaProvider({ baseUrl: url.value }).checkStatus();
    },
  );

  // Failover-Hinweis im Chat: nur die gespeicherten, nicht aktiven Server abfragen.
  ipcMain.handle(IpcChannels.probeServers, () =>
    probeServers(servers.listProfiles(), (_baseUrl, profile) =>
      makeProvider(profile),
    ),
  );

  return { getProvider: (): Provider => provider };
}
