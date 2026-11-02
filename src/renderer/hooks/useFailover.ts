import { useCallback, useEffect, useState } from 'react';
import type { ProviderStatus, Result, ServerProfile } from '../../shared/api';
import {
  failoverOptions,
  returnOption,
  shouldOfferFailover,
  type FailoverOption,
  type ServerProbe,
} from '../../shared/failover';
import {
  clearFailoverFrom,
  readFailoverFrom,
  writeFailoverFrom,
} from '../failover';
import { notifyServerChanged, onServerChanged } from '../serverEvents';

/** Wie oft die anderen Server abgefragt werden, solange der Hinweis gebraucht wird. */
const PROBE_INTERVAL_MS = 10_000;

export interface FailoverState {
  /** offline: aktiver Server nicht erreichbar · return: der frühere Server ist wieder da · null: nichts anzuzeigen. */
  mode: 'offline' | 'return' | null;
  active: ServerProfile | undefined;
  /** Erreichbare andere Server (nur im Modus „offline“). */
  options: FailoverOption[];
  /** Die erste Abfrage der anderen Server ist noch nicht fertig. */
  probing: boolean;
  /** Der frühere Server (nur im Modus „return“). */
  back: ServerProbe | null;
  switchTo: (profileId: string) => Promise<Result<ServerProfile>>;
  stay: () => void;
}

/**
 * Failover-Hinweis: Ist der aktive Server nicht erreichbar (zwei Prüfungen hintereinander)
 * und gibt es andere eingetragene, werden sie abgefragt. Gewechselt wird nur nach deinem
 * Klick. Ist der frühere Server später wieder da, wird „Zurückwechseln“ angeboten.
 */
export function useFailover(
  status: ProviderStatus | null,
  chatModel: string,
): FailoverState {
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  const [fromId, setFromId] = useState<string | null>(readFailoverFrom);
  const [offlinePolls, setOfflinePolls] = useState(0);
  const [probes, setProbes] = useState<ServerProbe[]>([]);
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    const load = () =>
      void window.api.listServers().then((list) => {
        setProfiles(list);
        setFromId(readFailoverFrom());
      });
    load();
    return onServerChanged(load);
  }, []);

  // Zählt die aufeinanderfolgenden Prüfungen ohne Antwort; null (Serverwechsel) setzt zurück.
  useEffect(() => {
    setOfflinePolls((count) =>
      status === null || status.online ? 0 : count + 1,
    );
  }, [status]);

  const active = profiles.find((p) => p.active);
  const offerOffline =
    status !== null &&
    !status.online &&
    shouldOfferFailover(offlinePolls, profiles.length - 1);
  const watchReturn =
    status?.online === true &&
    fromId !== null &&
    active !== undefined &&
    active.id !== fromId &&
    profiles.some((p) => p.id === fromId);
  const needProbes = offerOffline || watchReturn;

  useEffect(() => {
    if (!needProbes) {
      setProbes([]);
      setProbed(false);
      return;
    }
    let alive = true;
    const run = async () => {
      const result = await window.api.probeServers();
      if (alive) {
        setProbes(result);
        setProbed(true);
      }
    };
    void run();
    const timer = setInterval(() => void run(), PROBE_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [needProbes]);

  const back = watchReturn ? returnOption(probes, fromId) : null;
  const mode = offerOffline ? 'offline' : back ? 'return' : null;

  const switchTo = useCallback(
    async (profileId: string) => {
      const result = await window.api.setActiveServer(profileId);
      if (result.ok) {
        if (mode === 'offline' && active && !readFailoverFrom()) {
          // Der erste Server bleibt „zu Hause“, auch wenn es von dort aus weiterspringt.
          writeFailoverFrom(active.id);
        } else if (mode === 'return') {
          clearFailoverFrom();
        }
        notifyServerChanged();
      }
      return result;
    },
    [mode, active],
  );

  const stay = useCallback(() => {
    clearFailoverFrom();
    setFromId(null);
  }, []);

  return {
    mode,
    active,
    options: mode === 'offline' ? failoverOptions(probes, chatModel) : [],
    probing: offerOffline && !probed,
    back,
    switchTo,
    stay,
  };
}
