import { useCallback, useEffect, useState } from 'react';
import type { ServerProfile } from '../../shared/api';
import { onServerChanged } from '../serverEvents';

/** Der aktive KI-Server (Art, Adresse); aktualisiert sich beim Umschalten. */
export function useActiveServer(): ServerProfile | null {
  const [active, setActive] = useState<ServerProfile | null>(null);
  const load = useCallback(async () => {
    const profiles = await window.api.listServers();
    setActive(profiles.find((p) => p.active) ?? null);
  }, []);
  useEffect(() => {
    void load();
    return onServerChanged(() => void load());
  }, [load]);
  return active;
}
