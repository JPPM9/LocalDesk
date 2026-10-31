import { describe, expect, it } from 'vitest';
import de from '../../src/renderer/i18n/de.json';
import en from '../../src/renderer/i18n/en.json';

type Tree = { [key: string]: string | Tree };

/** „a.b.c“ → Text, für alle Blätter. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result.set(name, value);
    else for (const [k, v] of flatten(value, name)) result.set(k, v);
  }
  return result;
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const german = flatten(de as Tree);
const english = flatten(en as Tree);

describe('Sprachdateien', () => {
  it('Deutsch und Englisch haben genau dieselben Schlüssel', () => {
    const missing = [...german.keys()].filter((k) => !english.has(k));
    const extra = [...english.keys()].filter((k) => !german.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('Platzhalter wie {{name}} stimmen in beiden Sprachen überein', () => {
    const wrong = [...german]
      .filter(([key, text]) => {
        const other = english.get(key);
        return (
          other !== undefined &&
          placeholders(text).join() !== placeholders(other).join()
        );
      })
      .map(([key]) => key);
    expect(wrong).toEqual([]);
  });

  it('kein englischer Text ist leer oder nur eine Kopie des deutschen Textes mit Umlauten', () => {
    const empty = [...english].filter(([, t]) => !t.trim()).map(([k]) => k);
    expect(empty).toEqual([]);
    // Ein deutsches Wort mit Umlaut oder ß in der englischen Datei wurde vergessen zu übersetzen.
    const untranslated = [...english]
      .filter(([, t]) => /[äöüß]/i.test(t.replace(/„|“/g, '')))
      .map(([k]) => k);
    expect(untranslated).toEqual([]);
  });
});
