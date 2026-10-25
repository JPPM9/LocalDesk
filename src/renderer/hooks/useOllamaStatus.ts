import { useEffect, useState } from 'react';
import type { ProviderStatus } from '../../shared/api';

/** Wie oft der Status neu abgefragt wird. */
const POLL_INTERVAL_MS = 5000;

/**
 * Fragt regelmäßig beim Main-Prozess nach, ob Ollama erreichbar ist.
 * `null` heißt: Die erste Antwort steht noch aus.
 */
export function useOllamaStatus(): ProviderStatus | null {
  const [status, setStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    // Verhindert, dass eine späte Antwort noch gesetzt wird, nachdem die Komponente weg ist.
    let active = true;

    const check = async () => {
      const result = await window.api.getOllamaStatus();
      if (active) setStatus(result);
    };

    void check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return status;
}
