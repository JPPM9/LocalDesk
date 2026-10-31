import { messageLocale, tr } from './messages';

/** Code-Sitzungen bekommen mehr Kontext – Dateien und Werkzeug-Ergebnisse sind lang. */
export const CODE_CONTEXT_DEFAULT = 32_768;
/** Ein Agent braucht mehr Werkzeug-Runden als ein normaler Chat. */
export const CODE_MAX_ROUNDS = 25;

/**
 * Arbeitsweise des Code-Agenten:
 * - manual: jede Änderung, jeder Befehl, jeder Commit wird einzeln bestätigt.
 * - plan: nur lesen und einen Plan schreiben; geändert wird erst nach deiner Freigabe.
 */
export type CodeMode = 'manual' | 'plan';
export const CODE_MODES: readonly CodeMode[] = ['manual', 'plan'];

export function isCodeMode(value: unknown): value is CodeMode {
  return (CODE_MODES as readonly unknown[]).includes(value);
}

/** Anweisung für den Code-Agenten (steht vor einem eigenen Systemprompt). */
export function codeAgentPrompt(
  projectName: string,
  today: Date,
  mode: CodeMode = 'manual',
): string {
  return [
    tr('prompt.codeIntro', { project: projectName }),
    tr('prompt.codeToday', {
      date: today.toLocaleDateString(messageLocale(), { dateStyle: 'full' }),
    }),
    '',
    tr('prompt.codeRules'),
    ...(mode === 'plan' ? ['', tr('prompt.codePlan')] : []),
  ].join('\n');
}
