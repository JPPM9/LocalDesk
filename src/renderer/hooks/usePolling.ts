import { useEffect, useRef, useState } from 'react';
import { onServerChanged } from '../serverEvents';

/**
 * Ruft `fetcher` sofort und dann alle `intervalMs` Millisekunden auf – und
 * zusätzlich direkt nach einem Serverwechsel. `null` = erste Antwort steht noch aus.
 * Nur die neueste Antwort zählt: Eine langsame alte Antwort überschreibt keine neue.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
): T | null {
  const [value, setValue] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    let latest = 0;
    const check = async () => {
      const request = ++latest;
      const next = await fetcherRef.current();
      if (active && request === latest) setValue(next);
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

  return value;
}
