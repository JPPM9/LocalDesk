import { tr } from './messages';

/** Schlüssel in den App-Einstellungen: gilt die Arbeitsweise? (Standard: ja) */
export const WORKING_STYLE_KEY = 'chat.workingStyle';

/** Der Block „Arbeitsweise“ für das Modell, in der Sprache der App. */
export function workingStylePrompt(): string {
  return tr('prompt.workingStyle');
}

/**
 * Setzt die Arbeitsweise vor die übrigen Anweisungen (Projekt, Code-Agent). Leere Teile fallen weg;
 * `enabled = false` lässt die Arbeitsweise ganz weg.
 */
export function withWorkingStyle(
  enabled: boolean,
  instructions?: string,
): string | undefined {
  const parts = [
    enabled ? workingStylePrompt() : '',
    instructions?.trim() ?? '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('\n\n') : undefined;
}
