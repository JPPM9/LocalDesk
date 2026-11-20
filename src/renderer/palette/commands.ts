// Befehlsliste der Palette (JOURNEY.md §IA, P-01 bis P-25) – ohne React, damit testbar.

export type PaletteGroup =
  | 'goTo'
  | 'commands'
  | 'projects'
  | 'chats'
  | 'inChat'
  | 'appearance'
  | 'window'
  | 'help';

/** Reihenfolge der Gruppen in der Liste. */
export const GROUP_ORDER: PaletteGroup[] = [
  'goTo',
  'commands',
  'projects',
  'chats',
  'inChat',
  'appearance',
  'window',
  'help',
];

export interface PaletteItem {
  /** Stabile Kennung (P-01 …, `project:<id>`, `chat:<id>`) – merkt sich „Zuletzt benutzt“. */
  id: string;
  group: PaletteGroup;
  label: string;
  /** Zweite Zeile (Projekt, Textausschnitt). */
  detail?: string;
  shortcut?: string;
  /** Weitere Suchwörter (z. B. „zoom“ für Vergrößern). */
  keywords?: string;
  run: () => void;
}

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Jedes Wort der Eingabe muss im Namen vorkommen (ohne Groß-/Kleinschreibung und Umlaut-Striche). */
export function matches(item: PaletteItem, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = norm(
    `${item.label} ${item.detail ?? ''} ${item.keywords ?? ''}`,
  );
  return words.every((word) => haystack.includes(word));
}

/** Gruppiert in der festen Reihenfolge; leere Gruppen fallen weg. */
export function groupItems(
  items: PaletteItem[],
): { group: PaletteGroup; items: PaletteItem[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
}

const RECENT_KEY = 'localdesk.paletteRecent';
const RECENT_MAX = 5;

export function loadRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(RECENT_KEY) ?? '[]',
    );
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Neueste zuerst, höchstens fünf; einzelne Chats und Projekte zählen nicht. */
export function pushRecent(id: string): void {
  if (id.startsWith('chat:') || id.startsWith('project:')) return;
  try {
    const next = [id, ...loadRecent().filter((x) => x !== id)].slice(
      0,
      RECENT_MAX,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Ohne Speicher gibt es eben kein „Zuletzt benutzt“.
  }
}
