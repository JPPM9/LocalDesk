import { useCallback, useEffect, useState } from 'react';
import type { ThemeChoice } from '../../shared/appearance';

/** Interne Nachricht, damit alle Schalter (Leiste, Einstellungen) gleich stehen. */
const THEME_EVENT = 'localdesk:theme';

/** Farbschema lesen und setzen; Änderungen erscheinen in allen Komponenten. */
export function useTheme(): [ThemeChoice | null, (next: ThemeChoice) => void] {
  const [theme, setThemeState] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    void window.api.getTheme().then(setThemeState);
    const onChange = (event: Event) =>
      setThemeState((event as CustomEvent<ThemeChoice>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    void window.api.setTheme(next);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
  }, []);

  return [theme, setTheme];
}
