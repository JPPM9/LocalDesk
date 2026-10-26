import { describe, expect, it } from 'vitest';
import {
  matchShortcut,
  SHORTCUTS,
  type KeyPress,
} from '../../src/renderer/shortcuts/keymap';

const press = (key: string, mods: Partial<KeyPress> = {}): KeyPress => ({
  key,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  defaultPrevented: false,
  ...mods,
});

describe('matchShortcut', () => {
  it('erkennt die Strg-Kürzel, auch bei Großbuchstaben (Feststelltaste)', () => {
    expect(matchShortcut(press('n', { ctrlKey: true }))).toBe('newChat');
    expect(matchShortcut(press('K', { ctrlKey: true }))).toBe('search');
    expect(matchShortcut(press('l', { ctrlKey: true }))).toBe('focusInput');
    expect(matchShortcut(press('j', { ctrlKey: true }))).toBe('chatSettings');
    expect(matchShortcut(press('b', { ctrlKey: true }))).toBe('toggleSidebar');
    expect(matchShortcut(press(',', { ctrlKey: true }))).toBe('settings');
  });

  it('lässt normale Tasten und Strg+Umschalt-Kombinationen durch', () => {
    expect(matchShortcut(press('n'))).toBeNull();
    expect(matchShortcut(press('a', { ctrlKey: true }))).toBeNull(); // alles markieren
    expect(
      matchShortcut(press('N', { ctrlKey: true, shiftKey: true })),
    ).toBeNull();
  });

  it('fängt AltGr-Zeichen nicht ab (AltGr = Strg+Alt unter Windows)', () => {
    // AltGr+Q = @, AltGr+E = €, AltGr+7 = {
    for (const key of ['@', '€', '{', 'q', 'n', 'k']) {
      expect(
        matchShortcut(press(key, { ctrlKey: true, altKey: true })),
        key,
      ).toBeNull();
    }
  });

  it('öffnet die Übersicht mit Strg+/ (deutsch: Strg+Umschalt+7) und F1', () => {
    expect(matchShortcut(press('/', { ctrlKey: true, shiftKey: true }))).toBe(
      'help',
    );
    expect(matchShortcut(press('/', { ctrlKey: true }))).toBe('help');
    expect(matchShortcut(press('F1'))).toBe('help');
  });

  it('stoppt mit Esc – außer ein Eingabefeld hat Esc schon benutzt', () => {
    expect(matchShortcut(press('Escape'))).toBe('stop');
    expect(
      matchShortcut(press('Escape', { defaultPrevented: true })),
    ).toBeNull();
  });

  it('hat für jedes Kürzel eine Beschreibung und keine doppelten IDs', () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SHORTCUTS.every((s) => s.label && s.descriptionKey)).toBe(true);
  });
});
