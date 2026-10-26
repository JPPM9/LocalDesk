import { useEffect, useState } from 'react';
import type { ProviderStatus } from '../../shared/api';
import { onServerChanged } from '../serverEvents';

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
    // Nur die neueste Prüfung zählt: Nach einem Serverwechsel darf eine langsame
    // Antwort vom alten Server (bis zu 2 s) die neue nicht überschreiben.
    let latest = 0;

    const check = async () => {
      const request = ++latest;
      const result = await window.api.getOllamaStatus();
      if (active && request === latest) setStatus(result);
    };

    void check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    const unsubscribe = onServerChanged(() => {
      setStatus(null); // „prüfe Verbindung …“ anzeigen
      void check();
    });
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  return status;
}
