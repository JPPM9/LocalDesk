import { describe, expect, it } from 'vitest';
import {
  extractLinks,
  normalizeLink,
  WEB_PAGE_MAX_CHARS,
  WEB_PAGE_MIN_CHARS,
  webPageChars,
} from '../../src/shared/web';

describe('webPageChars', () => {
  it('ein Teil des Kontexts, zwischen 2 000 und 18 000 Zeichen', () => {
    // 35 % von 4096 Tokens × 4 Zeichen = 5 734
    expect(webPageChars(4096)).toBe(5734);
    expect(webPageChars(8192)).toBe(11468);
    expect(webPageChars(131_072)).toBe(WEB_PAGE_MAX_CHARS);
    expect(webPageChars(512)).toBe(WEB_PAGE_MIN_CHARS);
  });
});

describe('normalizeLink', () => {
  it('ohne Anker, mit „/“ nach der Domain; nur http und https', () => {
    expect(normalizeLink('https://example.com')).toBe('https://example.com/');
    expect(normalizeLink('  https://example.com/a?x=1#teil ')).toBe(
      'https://example.com/a?x=1',
    );
    expect(normalizeLink('HTTPS://Example.COM/Pfad')).toBe(
      'https://example.com/Pfad',
    );
    for (const bad of [
      'ftp://example.com',
      'file:///C:/x',
      'javascript:1',
      'x',
      '',
    ]) {
      expect(normalizeLink(bad), bad).toBeNull();
    }
  });
});

describe('extractLinks', () => {
  it('findet Adressen im Text, normalisiert und ohne Doppelte', () => {
    expect(
      extractLinks(
        'Fasse https://example.com/a und https://example.com/a#x zusammen, dazu http://example.org.',
      ),
    ).toEqual(['https://example.com/a', 'http://example.org/']);
  });

  it('Satzzeichen am Ende gehören nicht zur Adresse', () => {
    expect(extractLinks('Siehe https://example.com/seite.')).toEqual([
      'https://example.com/seite',
    ]);
    expect(
      extractLinks('(https://example.com/x), „https://example.com/y“!'),
    ).toEqual(['https://example.com/x', 'https://example.com/y']);
    expect(extractLinks('Wirklich? https://example.com/q?a=1;')).toEqual([
      'https://example.com/q?a=1',
    ]);
  });

  it('Klammern, die zur Adresse gehören, bleiben (Wikipedia)', () => {
    expect(
      extractLinks(
        'Lies https://de.wikipedia.org/wiki/Elektron_(Begriffsklärung) bitte',
      ),
    ).toEqual([
      'https://de.wikipedia.org/wiki/Elektron_(Begriffskl%C3%A4rung)',
    ]);
    expect(extractLinks('(siehe https://de.wikipedia.org/wiki/A_(B))')).toEqual(
      ['https://de.wikipedia.org/wiki/A_(B)'],
    );
  });

  it('nur http und https; ohne Adresse eine leere Liste', () => {
    expect(extractLinks('ftp://a.de und file:///C:/x und kein Link')).toEqual(
      [],
    );
    expect(extractLinks('')).toEqual([]);
  });

  it('der Vergleich ist wörtlich: eine andere Schreibweise ist eine andere Adresse', () => {
    const mine = new Set(extractLinks('Lies https://example.com/a?x=1'));
    expect(mine.has(normalizeLink('https://example.com/a?x=1#teil')!)).toBe(
      true,
    );
    expect(mine.has(normalizeLink('https://example.com/a?x=2')!)).toBe(false);
    expect(mine.has(normalizeLink('https://www.example.com/a?x=1')!)).toBe(
      false,
    );
    expect(mine.has(normalizeLink('http://example.com/a?x=1')!)).toBe(false);
  });
});
