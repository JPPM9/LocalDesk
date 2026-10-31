import { describe, expect, it } from 'vitest';
import { isLanguageChoice, resolveLanguage } from '../../src/shared/language';

describe('resolveLanguage', () => {
  it('feste Wahl gilt immer, egal wie Windows eingestellt ist', () => {
    expect(resolveLanguage('de', ['en-US'])).toBe('de');
    expect(resolveLanguage('en', ['de-DE'])).toBe('en');
  });

  it('„wie Windows“: Deutsch bei deutscher Windows-Sprache, sonst Englisch', () => {
    for (const locale of ['de', 'de-DE', 'de-AT', 'de-CH', 'DE-de', 'de_DE']) {
      expect(resolveLanguage('system', [locale]), locale).toBe('de');
    }
    for (const locale of ['en-US', 'fr-FR', 'dev', 'deu', '']) {
      expect(resolveLanguage('system', [locale]), locale).toBe('en');
    }
    expect(resolveLanguage('system', [])).toBe('en');
  });

  it('nur die erste Windows-Sprache zählt', () => {
    expect(resolveLanguage('system', ['en-US', 'de-DE'])).toBe('en');
    expect(resolveLanguage('system', ['de-DE', 'en-US'])).toBe('de');
  });
});

describe('isLanguageChoice', () => {
  it('kennt nur system, de und en', () => {
    expect(['system', 'de', 'en'].every(isLanguageChoice)).toBe(true);
    for (const bad of ['fr', '', null, undefined, 1, 'DE'])
      expect(isLanguageChoice(bad), String(bad)).toBe(false);
  });
});
