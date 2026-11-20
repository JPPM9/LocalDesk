import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  nativeTheme: { shouldUseDarkColors: false },
  ipcMain: {},
  BrowserWindow: {},
}));

import { commandForInput } from '../../src/main/window-chrome';

const key = (k: string, mods: Partial<Record<string, boolean>> = {}) =>
  ({
    type: 'keyDown',
    key: k,
    control: false,
    shift: false,
    alt: false,
    meta: false,
    ...mods,
  }) as never;

describe('commandForInput', () => {
  it('erkennt die Kürzel der entfallenen Menüzeile', () => {
    expect(commandForInput(key('+', { control: true }))).toBe('zoomIn');
    expect(commandForInput(key('=', { control: true }))).toBe('zoomIn');
    expect(commandForInput(key('-', { control: true }))).toBe('zoomOut');
    expect(commandForInput(key('0', { control: true }))).toBe('zoomReset');
    expect(commandForInput(key('F11'))).toBe('fullscreen');
    expect(commandForInput(key('I', { control: true, shift: true }))).toBe(
      'devtools',
    );
    expect(commandForInput(key('r', { control: true }))).toBe('reload');
    expect(commandForInput(key('R', { control: true, shift: true }))).toBe(
      'reloadHard',
    );
  });

  it('lässt AltGr (Strg+Alt) und normale Tasten in Ruhe', () => {
    expect(commandForInput(key('0', { control: true, alt: true }))).toBeNull();
    expect(commandForInput(key('a'))).toBeNull();
    expect(commandForInput(key('c', { control: true }))).toBeNull();
    expect(commandForInput(key('-'))).toBeNull();
  });
});
