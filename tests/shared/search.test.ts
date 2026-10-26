import { describe, expect, it } from 'vitest';
import {
  buildFtsQuery,
  HIGHLIGHT_END,
  HIGHLIGHT_START,
  splitHighlights,
} from '../../src/shared/search';

describe('buildFtsQuery', () => {
  it('setzt jedes Wort in Anführungszeichen und sucht Wortanfänge', () => {
    expect(buildFtsQuery('  Python   prim ')).toBe('"Python"* "prim"*');
  });

  it('verdoppelt Anführungszeichen im Suchwort', () => {
    expect(buildFtsQuery('sag "hallo"')).toBe('"sag"* """hallo"""*');
  });

  it('gibt null für leere Eingaben zurück', () => {
    expect(buildFtsQuery('   ')).toBeNull();
  });
});

describe('splitHighlights', () => {
  it('trennt markierte und normale Stellen', () => {
    const snippet = `…teile bis zur ${HIGHLIGHT_START}Wurzel${HIGHLIGHT_END}.`;
    expect(splitHighlights(snippet)).toEqual([
      { text: '…teile bis zur ', highlight: false },
      { text: 'Wurzel', highlight: true },
      { text: '.', highlight: false },
    ]);
  });

  it('blendet Markdown für fett und Code aus, lässt einzelne Unterstriche', () => {
    const snippet = `liegt **${HIGHLIGHT_START}Rom${HIGHLIGHT_END}** – siehe \`is_prime\``;
    expect(splitHighlights(snippet)).toEqual([
      { text: 'liegt ', highlight: false },
      { text: 'Rom', highlight: true },
      { text: ' – siehe is_prime', highlight: false },
    ]);
  });

  it('kommt mit fehlendem Endzeichen und Text ohne Treffer klar', () => {
    expect(splitHighlights('ohne Treffer')).toEqual([
      { text: 'ohne Treffer', highlight: false },
    ]);
    expect(splitHighlights(`a ${HIGHLIGHT_START}b`)).toEqual([
      { text: 'a ', highlight: false },
      { text: 'b', highlight: true },
    ]);
  });
});
