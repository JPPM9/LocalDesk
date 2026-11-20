/** Fenster-Funktionen, die früher die Menüzeile hatte (Palette P-21 bis P-25). */
export type WindowCommand =
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'fullscreen'
  | 'devtools'
  | 'reload'
  | 'reloadHard';

/** Farbschema: wie Windows, immer hell oder immer dunkel. */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_CHOICES: readonly ThemeChoice[] = [
  'system',
  'light',
  'dark',
];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (THEME_CHOICES as readonly unknown[]).includes(value);
}
