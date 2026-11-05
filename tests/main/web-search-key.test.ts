import { afterEach, describe, expect, it } from 'vitest';
import { setMessageLanguage } from '../../src/shared/messages';
import { checkSearchKey, SearchKeyStore } from '../../src/main/web/search-key';

afterEach(() => setMessageLanguage('de'));

const KEY = 'abc123def456.GEHEIM';

/** Eine Tabelle im Speicher und eine „Verschlüsselung“, an der man den Klartext erkennt. */
function store(available = true) {
  const table = new Map<string, string>();
  const cipher = {
    available: async () => available,
    encrypt: async (text: string) =>
      `ENC(${Buffer.from(text).toString('base64')})`,
    decrypt: async (encrypted: string) => {
      const match = /^ENC\((.*)\)$/.exec(encrypted);
      if (!match) throw new Error('kaputt');
      return Buffer.from(match[1], 'base64').toString();
    },
  };
  return {
    table,
    store: new SearchKeyStore(
      {
        get: (key) => table.get(key) ?? null,
        set: (key, value) => void table.set(key, value),
        delete: (key) => void table.delete(key),
      },
      cipher,
    ),
  };
}

describe('checkSearchKey', () => {
  it('nimmt ein Wort aus sichtbaren Zeichen und schneidet Ränder ab', () => {
    expect(checkSearchKey(`  ${KEY}\n`)).toEqual({ ok: true, value: KEY });
    expect(checkSearchKey('a'.repeat(10)).ok).toBe(true);
    expect(checkSearchKey('a'.repeat(300)).ok).toBe(true);
  });

  it('lehnt zu kurze, zu lange und seltsame Eingaben ab', () => {
    for (const bad of [
      '',
      '   ',
      'kurz',
      'a'.repeat(9),
      'a'.repeat(301),
      'zwei Wörter hier',
      'mit\nZeilenumbruch12345',
      'mit\r\nHeader: x12345',
      'Umlaut-Schlüssel-12345',
      'tab\tin der Mitte123',
      null,
      undefined,
      42,
      {},
    ]) {
      expect(checkSearchKey(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it('die Fehlermeldung folgt der Sprache', () => {
    setMessageLanguage('en');
    expect(checkSearchKey('x')).toEqual({
      ok: false,
      error: expect.stringContaining('does not look like an Ollama key'),
    });
  });
});

describe('SearchKeyStore', () => {
  it('speichert verschlüsselt, nie im Klartext, und gibt ihn für die Anfrage zurück', async () => {
    const { table, store: keys } = store();
    expect(keys.configured()).toBe(false);
    expect(await keys.load()).toBeNull();

    expect(await keys.save(KEY)).toEqual({ ok: true, value: null });
    expect(keys.configured()).toBe(true);
    expect(await keys.load()).toBe(KEY);
    // In der Tabelle steht kein Klartext.
    for (const value of table.values()) expect(value).not.toContain(KEY);
  });

  it('Entfernen löscht ihn', async () => {
    const { table, store: keys } = store();
    await keys.save(KEY);
    keys.clear();
    expect(keys.configured()).toBe(false);
    expect(await keys.load()).toBeNull();
    expect(table.size).toBe(0);
  });

  it('ein ungültiger Schlüssel ändert nichts, ein alter bleibt', async () => {
    const { store: keys } = store();
    await keys.save(KEY);
    const result = await keys.save('zu kurz');
    expect(result.ok).toBe(false);
    expect(await keys.load()).toBe(KEY);
  });

  it('kann Windows nicht verschlüsseln, wird nichts gespeichert', async () => {
    const { table, store: keys } = store(false);
    expect(await keys.save(KEY)).toEqual({
      ok: false,
      error: expect.stringContaining('nicht verschlüsseln'),
    });
    expect(table.size).toBe(0);
  });

  it('ein nicht lesbarer Eintrag (z. B. anderes Windows-Konto) gilt als „kein Schlüssel“', async () => {
    const { table, store: keys } = store();
    table.set('web.search.ollamaKey', 'kaputt');
    expect(keys.configured()).toBe(true);
    expect(await keys.load()).toBeNull();
  });
});
