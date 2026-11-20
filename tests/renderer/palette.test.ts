import { describe, expect, it } from 'vitest';
import {
  groupItems,
  matches,
  type PaletteItem,
} from '../../src/renderer/palette/commands';

const item = (
  id: string,
  group: PaletteItem['group'],
  label: string,
  detail?: string,
): PaletteItem => ({ id, group, label, detail, run: () => {} });

describe('Befehlspalette', () => {
  it('findet über Teilwörter, ohne Groß-/Kleinschreibung und Umlaut-Striche', () => {
    const i = item('P-07', 'goTo', 'E-Mail verwalten');
    expect(matches(i, 'mail')).toBe(true);
    expect(matches(i, 'VERW mail')).toBe(true);
    expect(matches(i, 'wissen')).toBe(false);
    expect(matches(item('x', 'chats', 'Übersicht'), 'ubersicht')).toBe(true);
  });

  it('leere Eingabe trifft alles', () => {
    expect(matches(item('a', 'goTo', 'Chat'), '  ')).toBe(true);
  });

  it('ordnet Gruppen fest und lässt leere weg', () => {
    const groups = groupItems([
      item('1', 'window', 'Zoom'),
      item('2', 'goTo', 'Chat'),
      item('3', 'goTo', 'Modelle'),
    ]);
    expect(groups.map((g) => g.group)).toEqual(['goTo', 'window']);
    expect(groups[0].items).toHaveLength(2);
  });
});
