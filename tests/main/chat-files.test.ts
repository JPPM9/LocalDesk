import { afterEach, describe, expect, it, vi } from 'vitest';
import { readChatFile } from '../../src/main/chat-files';
import {
  EXTRACT_TIMEOUT_MS,
  inlineExtractor,
  type Extractor,
} from '../../src/main/rag/extractor';
import {
  FILE_DOCUMENT_MAX_BYTES,
  FILE_TEXT_MAX_BYTES,
  FILE_TEXT_MAX_CHARS,
} from '../../src/shared/files';
import { setMessageLanguage, tr } from '../../src/shared/messages';
import { makeDocx, makePdf } from './fixtures/documents';

afterEach(() => setMessageLanguage('de'));

const text = (s: string) => new TextEncoder().encode(s);
const never = () => {
  throw new Error('Hier darf kein Leser gestartet werden.');
};
const read = (name: unknown, data: unknown) =>
  readChatFile(name, data, () => inlineExtractor);
const ok = async (name: string, data: Uint8Array) => {
  const result = await read(name, data);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

describe('readChatFile: Text, Markdown, CSV, Code', () => {
  it('liest Text und liefert Art, Zeichenzahl und bereinigten Namen', async () => {
    expect(
      await ok(
        'C:\\Doku\\notiz.txt',
        text('Erste Zeile\r\nZweite Zeile\r\n\r\n'),
      ),
    ).toEqual({
      name: 'notiz.txt',
      kind: 'text',
      text: 'Erste Zeile\nZweite Zeile',
      chars: 24,
    });
    expect((await ok('daten.csv', text('a;b\n1;2'))).kind).toBe('text');
    expect((await ok('README.md', text('# Titel'))).kind).toBe('markdown');
    expect((await ok('skript.py', text('print("hi")'))).kind).toBe('code');
  });

  it('versteht UTF-8 (auch mit BOM) und Windows-1252', async () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...text('Grüße')]);
    expect((await ok('a.txt', bom)).text).toBe('Grüße');
    // „Müller“ in Windows-1252: ü = 0xFC (kein gültiges UTF-8)
    const win = new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]);
    expect((await ok('b.txt', win)).text).toBe('Müller');
  });

  it('Binärdaten unter einer Text-Endung werden abgelehnt', async () => {
    expect(
      await read('bild.txt', new Uint8Array([0x89, 0x50, 0x00, 0x47, 0x00])),
    ).toEqual({
      ok: false,
      error: 'Die Datei „bild.txt“ ist keine Textdatei.',
    });
  });

  it('eine leere Datei hat nichts zu lesen', async () => {
    expect(await read('leer.txt', text('  \n \n'))).toEqual({
      ok: false,
      error: 'Die Datei „leer.txt“ ist leer.',
    });
  });

  it('startet für Text keinen Leser', async () => {
    expect((await readChatFile('a.txt', text('x'), never)).ok).toBe(true);
  });
});

describe('readChatFile: Grenzen und Fehler', () => {
  it('andere Dateiarten werden abgelehnt – ohne Leser', async () => {
    for (const name of [
      'foto.png',
      'alt.doc',
      'archiv.zip',
      'programm.exe',
      'ohne-endung',
    ]) {
      expect(await readChatFile(name, text('x'), never), name).toEqual({
        ok: false,
        error: expect.stringContaining('kann nicht gelesen werden'),
      });
    }
  });

  it('alte Excel-Dateien (.xls) bekommen einen eigenen Hinweis', async () => {
    expect(await readChatFile('Alt.XLS', text('x'), never)).toEqual({
      ok: false,
      error: expect.stringContaining('.xlsx oder CSV'),
    });
  });

  it('zu große Dateien: Text ab 2 MB, PDF und Word ab 20 MB', async () => {
    expect(
      await read('gross.txt', new Uint8Array(FILE_TEXT_MAX_BYTES + 1).fill(97)),
    ).toEqual({
      ok: false,
      error: 'Die Datei „gross.txt“ ist zu groß (höchstens 2 MB).',
    });
    expect(
      await readChatFile(
        'gross.pdf',
        new Uint8Array(FILE_DOCUMENT_MAX_BYTES + 1),
        never,
      ),
    ).toEqual({
      ok: false,
      error: 'Die Datei „gross.pdf“ ist zu groß (höchstens 20 MB).',
    });
  });

  it('mehr als 100 000 Zeichen sind zu lang für den Chat und verweisen auf Wissen', async () => {
    const result = await read(
      'lang.txt',
      text('x'.repeat(FILE_TEXT_MAX_CHARS + 1)),
    );
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('zu lang für den Chat'),
    });
    expect(!result.ok && result.error).toContain('„Wissen“');
    expect(
      (await read('grenze.txt', text('x'.repeat(FILE_TEXT_MAX_CHARS)))).ok,
    ).toBe(true);
  });

  it('prüft, was von der Oberfläche kommt', async () => {
    for (const [name, data] of [
      [42, text('x')],
      ['a.txt', 'text'],
      ['a.txt', null],
      ['x'.repeat(301), text('x')],
    ] as const) {
      expect(await read(name, data), String(name)).toEqual({
        ok: false,
        error: 'Die Dateien konnten nicht gelesen werden.',
      });
    }
    // ArrayBuffer geht wie Uint8Array
    expect((await read('a.txt', text('Hallo').buffer)).ok).toBe(true);
  });

  it('Fehlertexte folgen der Sprache', async () => {
    setMessageLanguage('en');
    expect(await read('foto.png', text('x'))).toEqual({
      ok: false,
      error: expect.stringContaining('cannot be read'),
    });
    expect(await read('leer.txt', text(' '))).toEqual({
      ok: false,
      error: 'The file “leer.txt” is empty.',
    });
  });
});

describe('readChatFile: PDF und Word', () => {
  it('PDF: Seite für Seite mit „[Seite N]“ und Seitenzahl; leere Seiten fallen weg', async () => {
    const pdf = makePdf([
      ['Seite eins: Pfirsichkuchen'],
      [],
      ['Drittes Blatt, schön'],
    ]);
    const file = await ok('Bericht.PDF', pdf);
    expect(file).toMatchObject({ name: 'Bericht.PDF', kind: 'pdf', pages: 3 });
    expect(file.text).toBe(
      '[Seite 1]\nSeite eins: Pfirsichkuchen\n\n[Seite 3]\nDrittes Blatt, schön',
    );
    expect(file.chars).toBe(file.text.length);
  });

  it('PDF-Marken folgen der Sprache', async () => {
    setMessageLanguage('en');
    expect((await ok('a.pdf', makePdf([['Eins']]))).text).toBe(
      '[Page 1]\nEins',
    );
  });

  it('PDF ohne Text (wie ein Scan) wird verständlich abgelehnt', async () => {
    expect(await read('scan.pdf', makePdf([[]]))).toEqual({
      ok: false,
      error: expect.stringContaining('kein Text gefunden'),
    });
  });

  it('Word: als Markdown mit Überschriften, ohne Seitenzahl', async () => {
    const docx = await makeDocx([
      { text: 'Vertrag', style: 'Heading1' },
      { text: 'Die Kündigungsfrist beträgt drei Monate.' },
    ]);
    const file = await ok('vertrag.docx', docx);
    expect(file.kind).toBe('docx');
    expect(file).not.toHaveProperty('pages');
    expect(file.text).toBe(
      '# Vertrag\n\nDie Kündigungsfrist beträgt drei Monate.',
    );
  });

  it('eine beschädigte PDF oder Word-Datei wird gemeldet, nicht als Absturz', async () => {
    expect(await read('kaputt.pdf', text('das ist keine pdf'))).toEqual({
      ok: false,
      error:
        'Die Datei „kaputt.pdf“ ist beschädigt oder kann nicht gelesen werden.',
    });
    expect(await read('kaputt.docx', text('das ist kein zip'))).toEqual({
      ok: false,
      error: expect.stringContaining('beschädigt'),
    });
  });

  it('der Leser wird nach jeder Datei beendet – auch bei Fehlern', async () => {
    const close = vi.fn();
    const failing: Extractor = {
      extract: () => Promise.reject(new Error('kaputt')),
      close,
    };
    expect((await readChatFile('a.pdf', text('x'), () => failing)).ok).toBe(
      false,
    );
    expect(close).toHaveBeenCalledTimes(1);
    const fine: Extractor = {
      extract: async () => ({ pages: ['Text'] }),
      close,
    };
    expect((await readChatFile('a.pdf', text('x'), () => fine)).ok).toBe(true);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('eine Zeitüberschreitung beim Lesen wird als solche gemeldet', async () => {
    const timeout = tr('knowledge.readTimeout', {
      seconds: EXTRACT_TIMEOUT_MS / 1000,
    });
    const slow: Extractor = {
      extract: () => Promise.reject(new Error(timeout)),
      close() {},
    };
    expect(await readChatFile('a.pdf', text('x'), () => slow)).toEqual({
      ok: false,
      error: timeout,
    });
  });
});
