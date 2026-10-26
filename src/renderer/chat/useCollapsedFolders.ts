import { useCallback, useState } from 'react';

// Welche Ordner zugeklappt sind, ist nur eine Ansichts-Vorliebe auf diesem Rechner –
// dafür reicht der Browser-Speicher der App (keine Datenbank nötig).
const STORAGE_KEY = 'localdesk.collapsedFolders';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function useCollapsedFolders() {
  const [collapsed, setCollapsed] = useState(load);

  const toggle = useCallback((key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Speichern nicht möglich – dann gilt es eben nur bis zum Neustart.
      }
      return next;
    });
  }, []);

  return { isCollapsed: (key: string) => collapsed.has(key), toggle };
}
