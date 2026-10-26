import { useEffect, useState } from 'react';
import type { SearchResult } from '../../shared/api';

/** Kurze Pause nach dem Tippen, bevor gesucht wird – sonst sucht jede Taste einzeln. */
const DEBOUNCE_MS = 200;

/** Sucht in allen Chats, während man tippt. `null` = keine Suche aktiv. */
export function useChatSearch(query: string) {
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResult(null);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      const found = await window.api.searchChats(query);
      if (active) setResult(found);
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return result;
}
