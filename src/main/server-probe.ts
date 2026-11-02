import type { ServerProfile } from '../shared/api';
import type { ServerProbe } from '../shared/failover';
import { isLocalServer } from '../shared/server';
import type { Provider } from './providers/provider';

/**
 * Fragt die eingetragenen Server ab, die gerade NICHT aktiv sind (parallel, mit den
 * Zeitlimits des Providers): erreichbar, Version, installierte Modelle. Es werden nur
 * Adressen aus den gespeicherten Profilen abgefragt – nie eine Adresse von außen.
 */
export async function probeServers(
  profiles: ServerProfile[],
  makeProvider: (baseUrl: string) => Provider,
): Promise<ServerProbe[]> {
  return Promise.all(
    profiles
      .filter((profile) => !profile.active)
      .map(async (profile): Promise<ServerProbe> => {
        const base = {
          profileId: profile.id,
          name: profile.name,
          baseUrl: profile.baseUrl,
          local: isLocalServer(profile.baseUrl),
        };
        try {
          const provider = makeProvider(profile.baseUrl);
          const status = await provider.checkStatus();
          if (!status.online) {
            return { ...base, online: false, error: status.error, models: [] };
          }
          const models = await provider.listModels();
          return {
            ...base,
            online: true,
            version: status.version,
            models: models.ok ? models.value.map((m) => m.name) : [],
          };
        } catch (error) {
          return {
            ...base,
            online: false,
            error: error instanceof Error ? error.message : String(error),
            models: [],
          };
        }
      }),
  );
}
