/** Sprache der Oberfläche: wie Windows, Deutsch oder Englisch. */
export type LanguageChoice = 'system' | 'de' | 'en';
/** Die Sprache, die wirklich angezeigt wird. */
export type Language = 'de' | 'en';

export const LANGUAGE_CHOICES: readonly LanguageChoice[] = [
  'system',
  'de',
  'en',
];

export function isLanguageChoice(value: unknown): value is LanguageChoice {
  return (LANGUAGE_CHOICES as readonly unknown[]).includes(value);
}

/**
 * „Wie Windows“ heißt: Deutsch bei deutscher Windows-Sprache (de, de-DE, de-AT …),
 * sonst Englisch. `systemLocales` kommt aus Electron, die erste Sprache zählt.
 */
export function resolveLanguage(
  choice: LanguageChoice,
  systemLocales: readonly string[],
): Language {
  if (choice !== 'system') return choice;
  return /^de(-|_|$)/i.test(systemLocales[0] ?? '') ? 'de' : 'en';
}

/** Was die Oberfläche beim Start braucht. */
export interface LanguageState {
  choice: LanguageChoice;
  language: Language;
}
