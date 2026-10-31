import { afterEach, describe, expect, it } from 'vitest';
import {
  getMessageLanguage,
  setMessageLanguage,
  tr,
  trIn,
} from '../../src/shared/messages';
import { de } from '../../src/shared/messages/de';
import { en } from '../../src/shared/messages/en';
import { checkSkillInput } from '../../src/shared/skills';

afterEach(() => setMessageLanguage('de'));

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Meldungen (Hauptprozess und geteilter Code)', () => {
  it('Standard ist Deutsch, Umschalten wirkt sofort', () => {
    expect(getMessageLanguage()).toBe('de');
    expect(tr('error.invalidInput')).toBe('Ungültige Eingabe');
    setMessageLanguage('en');
    expect(tr('error.invalidInput')).toBe('Invalid input');
  });

  it('setzt Platzhalter ein und lässt unbekannte stehen', () => {
    expect(trIn('de', 'error.toolMissing', { tool: 'git_push' })).toBe(
      'Das Werkzeug „git_push“ gibt es nicht.',
    );
    expect(trIn('en', 'error.toolMissing', { tool: 'git_push' })).toBe(
      "The tool “git_push” doesn't exist.",
    );
    expect(trIn('en', 'error.toolMissing')).toContain('{tool}');
    expect(getMessageLanguage()).toBe('de');
  });

  it('Deutsch und Englisch haben dieselben Platzhalter und keine leeren Texte', () => {
    for (const key of Object.keys(de) as (keyof typeof de)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(de[key]));
      expect(en[key].trim(), key).not.toBe('');
    }
  });

  it('englische Texte enthalten keine deutschen Umlaute', () => {
    const untranslated = Object.entries(en)
      .filter(([, text]) => /[äöüß]/i.test(text))
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });

  it('echte Prüfung meldet in der gewählten Sprache', () => {
    expect(checkSkillInput(null)).toEqual({
      ok: false,
      error: 'Ungültige Eingabe',
    });
    setMessageLanguage('en');
    expect(checkSkillInput(null)).toEqual({
      ok: false,
      error: 'Invalid input',
    });
  });
});
