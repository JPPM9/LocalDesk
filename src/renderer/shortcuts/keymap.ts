// Alle Tastenkürzel an einer Stelle. Die Erkennung ist eine reine Funktion
// (ohne React), damit sie sich mit Tests prüfen lässt.

export type ShortcutId =
  | 'newChat'
  | 'search'
  | 'focusInput'
  | 'chatSettings'
  | 'toggleSidebar'
  | 'settings'
  | 'stop'
  | 'help';

export interface ShortcutDefinition {
  id: ShortcutId;
  /** So wird das Kürzel angezeigt, z. B. in der Übersicht und in Tooltips. */
  label: string;
  /** Übersetzungsschlüssel für die Beschreibung. */
  descriptionKey: string;
}

/** Reihenfolge = Reihenfolge in der Übersicht. */
export const SHORTCUTS: ShortcutDefinition[] = [
  { id: 'newChat', label: 'Strg+N', descriptionKey: 'shortcuts.newChat' },
  { id: 'search', label: 'Strg+K', descriptionKey: 'shortcuts.search' },
  { id: 'focusInput', label: 'Strg+L', descriptionKey: 'shortcuts.focusInput' },
  {
    id: 'chatSettings',
    label: 'Strg+J',
    descriptionKey: 'shortcuts.chatSettings',
  },
  {
    id: 'toggleSidebar',
    label: 'Strg+B',
    descriptionKey: 'shortcuts.toggleSidebar',
  },
  { id: 'settings', label: 'Strg+,', descriptionKey: 'shortcuts.settings' },
  { id: 'stop', label: 'Esc', descriptionKey: 'shortcuts.stop' },
  { id: 'help', label: 'Strg+/  ·  F1', descriptionKey: 'shortcuts.help' },
];

export function shortcutLabel(id: ShortcutId): string {
  return SHORTCUTS.find((s) => s.id === id)?.label ?? '';
}

/** Die Teile eines Tastendrucks, die für Kürzel zählen (entspricht KeyboardEvent). */
export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  /** Hat schon ein Eingabefeld die Taste für sich verwendet (z. B. Esc im Suchfeld)? */
  defaultPrevented: boolean;
}

/** Strg + Taste (ohne Umschalt) → Kürzel */
const CTRL_KEYS: Record<string, ShortcutId> = {
  n: 'newChat',
  k: 'search',
  l: 'focusInput',
  j: 'chatSettings',
  b: 'toggleSidebar',
  ',': 'settings',
};

/**
 * Welches Kürzel ist gemeint? `null` = keins – die Taste geht normal weiter.
 *
 * Wichtig: Auf deutschen Tastaturen meldet AltGr sich als Strg+Alt (AltGr+Q = @).
 * Deshalb zählen Strg-Kürzel nur ohne Alt – sonst könnte man kein @, € oder { tippen.
 */
export function matchShortcut(press: KeyPress): ShortcutId | null {
  if (press.altKey || press.metaKey) return null;
  const key = press.key.toLowerCase();

  if (key === 'f1' && !press.ctrlKey) return 'help';

  if (key === 'escape' && !press.ctrlKey && !press.shiftKey) {
    // Hat ein Eingabefeld Esc schon benutzt (Suche leeren, Umbenennen abbrechen),
    // soll Esc nicht zusätzlich eine laufende Antwort stoppen.
    return press.defaultPrevented ? null : 'stop';
  }

  if (!press.ctrlKey) return null;
  // „/“ liegt auf deutschen Tastaturen auf Umschalt+7 – Umschalt ist hier also erlaubt.
  if (key === '/') return 'help';
  if (press.shiftKey) return null;
  return CTRL_KEYS[key] ?? null;
}
