import { useEffect, useState } from 'react';
import type { Result, RunningModel } from '../../shared/api';
import { onServerChanged } from '../serverEvents';

/**
 * Fragt regelmäßig ab, welche Modelle gerade geladen sind.
 * `null` heißt: Die erste Antwort steht noch aus.
 */
export function useRunningModels(intervalMs: number) {
  const [result, setResult] = useState<Result<RunningModel[]> | null>(null);

  useEffect(() => {
    let active = true;
    // Nur die neueste Abfrage zählt (z. B. nach einem Serverwechsel).
    let latest = 0;
    const check = async () => {
      const request = ++latest;
      const next = await window.api.listRunningModels();
      if (active && request === latest) setResult(next);
    };

    void check();
    const timer = setInterval(check, intervalMs);
    const unsubscribe = onServerChanged(() => void check());
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
    };
  }, [intervalMs]);

  return result;
}
