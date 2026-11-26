import { describe, expect, it } from 'vitest';
import { withPathHint } from '../../src/main/mcp/path-hint';

const schema = (...names: string[]) => ({
  type: 'object',
  properties: Object.fromEntries(names.map((n) => [n, { type: 'string' }])),
});

describe('withPathHint', () => {
  it('hängt den Hinweis an Werkzeuge mit Pfad-Eingaben', () => {
    expect(withPathHint('Öffnet ein PDF.', schema('path', 'password'))).toMatch(
      /^Öffnet ein PDF\. .*(Schrägstrich|forward slash)/,
    );
    expect(withPathHint('Liest.', schema('filePath'))).toContain('/');
    expect(withPathHint('Meta.', schema('name', 'arguments'))).not.toBe(
      'Meta.',
    );
  });
  it('lässt andere Werkzeuge unverändert', () => {
    expect(withPathHint('Rechnet.', schema('a', 'b'))).toBe('Rechnet.');
    expect(withPathHint('Leer.', {})).toBe('Leer.');
  });
});
