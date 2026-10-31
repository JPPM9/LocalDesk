import type { Language } from '../language';
import { de, type MessageKey } from './de';
import { en } from './en';

export type { MessageKey };

const dictionaries: Record<Language, Record<MessageKey, string>> = { de, en };

// Jeder Prozess (Main, Oberfläche) hat seinen eigenen Stand. Der Main-Prozess setzt
// ihn beim Start und beim Umschalten; ohne Aufruf gilt Deutsch (so laufen die Tests).
let current: Language = 'de';

export function setMessageLanguage(language: Language): void {
  current = language;
}

export function getMessageLanguage(): Language {
  return current;
}

/** Meldung in der aktuellen Sprache; `{name}` wird durch `params.name` ersetzt. */
export function tr(
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  return dictionaries[current][key].replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/** Für Tests: eine Meldung in einer bestimmten Sprache. */
export function trIn(
  language: Language,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const before = current;
  current = language;
  try {
    return tr(key, params);
  } finally {
    current = before;
  }
}
