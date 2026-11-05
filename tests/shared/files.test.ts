import { afterEach, describe, expect, it } from 'vitest';
import { kindOfExtension, kindOfName } from '../../src/shared/file-kinds';
import {
  checkFileInputs,
  cleanFileName,
  FILE_TEXT_MAX_CHARS,
  fileBlock,
  fileMarker,
  fileOutOfContext,
  FILES_MAX_PER_MESSAGE,
  FILES_SENT_MAX,
  FILES_TEXT_MAX_TOTAL,
  filesToSend,
  fileTokens,
  textWithAttachmentMarkers,
} from '../../src/shared/files';
import { setMessageLanguage } from '../../src/shared/messages';

afterEach(() => setMessageLanguage('de'));

const input = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: 'bericht.pdf',
  kind: 'pdf',
  text: '[Seite 1]\nHallo',
  pages: 1,
  ...over,
});

describe('Dateiarten', () => {
  it('erkennt PDF, Word, Markdown, Text und Code nach der Endung', () => {
    expect(kindOfName('Bericht.PDF')).toBe('pdf');
    expect(kindOfName('C:\\a\\b\\vertrag.docx')).toBe('docx');
    expect(kindOfName('notiz.md')).toBe('markdown');
    expect(kindOfName('daten.csv')).toBe('text');
    expect(kindOfName('app.tsx')).toBe('code');
    expect(kindOfName('/home/x/config.yaml')).toBe('code');
  });

  it('alles andere ist nicht lesbar', () => {
    for (const name of [
      'foto.png',
      'alt.doc',
      'archiv.zip',
      'programm.exe',
      'ohne-endung',
      '.gitignore',
      'ordner.pdf/',
    ]) {
      expect(kindOfName(name), name).toBeNull();
    }
    expect(kindOfExtension('.pdf')).toBe('pdf');
    expect(kindOfExtension('pdf')).toBeNull();
  });
});

describe('cleanFileName', () => {
  it('nimmt nur den Dateinamen, ohne Pfad und Steuerzeichen', () => {
    expect(cleanFileName('C:\\Users\\ich\\Doku\\bericht.pdf')).toBe(
      'bericht.pdf',
    );
    expect(cleanFileName('../../etc/passwd')).toBe('passwd');
    expect(cleanFileName('a\u0000b\u0007.txt')).toBe('ab.txt');
    expect(cleanFileName('x'.repeat(300))).toHaveLength(100);
    expect(cleanFileName('')).toBe('file');
  });
});

describe('checkFileInputs', () => {
  it('ohne Angabe oder leer gibt es keine Dateien', () => {
    expect(checkFileInputs(undefined)).toEqual({ ok: true, value: [] });
    expect(checkFileInputs([])).toEqual({ ok: true, value: [] });
  });

  it('nimmt gültige Dateien mit bereinigtem Namen', () => {
    const result = checkFileInputs([
      input('datei-0001', { name: 'C:\\x\\a.pdf' }),
      input('datei-0002', { name: 'b.md', kind: 'markdown', pages: undefined }),
    ]);
    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: 'datei-0001',
          name: 'a.pdf',
          kind: 'pdf',
          text: '[Seite 1]\nHallo',
          pages: 1,
        },
        {
          id: 'datei-0002',
          name: 'b.md',
          kind: 'markdown',
          text: '[Seite 1]\nHallo',
        },
      ],
    });
  });

  it('höchstens 3 Dateien', () => {
    const many = Array.from({ length: FILES_MAX_PER_MESSAGE + 1 }, (_, i) =>
      input(`datei-000${i}`),
    );
    expect(checkFileInputs(many)).toEqual({
      ok: false,
      error: 'Höchstens 3 Dateien pro Nachricht.',
    });
    expect(checkFileInputs(many.slice(0, FILES_MAX_PER_MESSAGE)).ok).toBe(true);
  });

  it('lehnt zu langen Text ab – einzeln und zusammen', () => {
    expect(
      checkFileInputs([
        input('datei-0001', { text: 'x'.repeat(FILE_TEXT_MAX_CHARS + 1) }),
      ]),
    ).toEqual({
      ok: false,
      error: expect.stringContaining('zu lang für den Chat'),
    });
    expect(
      checkFileInputs([
        input('datei-0001', { text: 'x'.repeat(FILE_TEXT_MAX_CHARS) }),
      ]).ok,
    ).toBe(true);
    const big = (id: string) =>
      input(id, { text: 'x'.repeat(FILE_TEXT_MAX_CHARS) });
    // 2 × 100 000 = 200 000 passt, 3 × 100 000 nicht.
    expect(FILES_TEXT_MAX_TOTAL).toBe(200_000);
    expect(checkFileInputs([big('datei-0001'), big('datei-0002')]).ok).toBe(
      true,
    );
    expect(
      checkFileInputs([
        big('datei-0001'),
        big('datei-0002'),
        big('datei-0003'),
      ]),
    ).toEqual({
      ok: false,
      error: expect.stringContaining('zusammen zu lang'),
    });
  });

  it('lehnt kaputte Angaben ab: Form, Art, leerer Text, NUL, Seiten, Kennung, Doppelte', () => {
    for (const bad of [
      'datei',
      42,
      [null],
      ['text'],
      [input('datei-0001', { kind: 'exe' })],
      [input('datei-0001', { kind: undefined })],
      [input('datei-0001', { text: '   ' })],
      [input('datei-0001', { text: 5 })],
      [input('datei-0001', { text: 'a\u0000b' })],
      [input('datei-0001', { name: 5 })],
      [input('datei-0001', { pages: 0 })],
      [input('datei-0001', { pages: 1.5 })],
      [input('kurz')],
      [input('../../etc/passwd/xxxx')],
      [input('datei-0001'), input('datei-0001')],
    ]) {
      expect(checkFileInputs(bad), JSON.stringify(bad)).toEqual({
        ok: false,
        error: expect.any(String),
      });
    }
  });

  it('Fehlertexte folgen der Sprache', () => {
    setMessageLanguage('en');
    expect(
      checkFileInputs([
        input('datei-0001', { text: 'x'.repeat(FILE_TEXT_MAX_CHARS + 1) }),
      ]),
    ).toEqual({
      ok: false,
      error: expect.stringContaining('too long for the chat'),
    });
  });
});

describe('Texte für das Modell', () => {
  it('Block, Hinweis und „nicht mehr im Kontext“', () => {
    expect(fileBlock('a.txt', 'Inhalt')).toBe(
      '[Datei: a.txt]\nInhalt\n[Ende der Datei: a.txt]',
    );
    expect(fileMarker('a.txt')).toBe('[Datei: a.txt]');
    expect(fileOutOfContext('a.txt')).toBe(
      '[Datei: a.txt – nicht mehr im Kontext]',
    );
    setMessageLanguage('en');
    expect(fileBlock('a.txt', 'Content')).toBe(
      '[File: a.txt]\nContent\n[End of file: a.txt]',
    );
    expect(fileOutOfContext('a.txt')).toBe(
      '[File: a.txt – no longer in the context]',
    );
  });

  it('der Text einer Datei wird nicht noch einmal ersetzt (z. B. „{name}“ im Code)', () => {
    const block = fileBlock('vorlage.js', 'const s = `{name}` + "{text}";');
    expect(block).toContain('const s = `{name}` + "{text}";');
  });

  it('textWithAttachmentMarkers: Dateien, Bilder, dann der Text – ohne Dateiinhalt', () => {
    expect(
      textWithAttachmentMarkers({
        content: '  Fasse zusammen.  ',
        files: [
          { id: 'f', name: 'bericht.pdf', kind: 'pdf', chars: 900, pages: 3 },
        ],
        images: [{ id: 'i', name: 'foto.jpg', size: 1 }],
      }),
    ).toBe('[Datei: bericht.pdf]\n[Bild: foto.jpg]\nFasse zusammen.');
    expect(textWithAttachmentMarkers({ content: 'Nur Text' })).toBe('Nur Text');
  });
});

describe('filesToSend', () => {
  const msgs = (counts: number[]) =>
    counts.map((n, m) => ({
      files: Array.from({ length: n }, (_, i) => ({
        id: `m${m}-${i}`,
        name: 'x',
        kind: 'text' as const,
        chars: 1,
      })),
    }));

  it('schickt die letzten 3 Dateien des Verlaufs mit', () => {
    expect(FILES_SENT_MAX).toBe(3);
    expect([...filesToSend(msgs([2, 0, 1, 2]))]).toEqual([
      'm2-0',
      'm3-0',
      'm3-1',
    ]);
    expect(filesToSend(msgs([1, 1])).size).toBe(2);
  });

  it('Nachrichten ohne Dateien stören nicht', () => {
    expect(filesToSend([{}, { files: undefined }]).size).toBe(0);
  });
});

describe('fileTokens', () => {
  it('schätzt 4 Zeichen je Token, aufgerundet', () => {
    expect(fileTokens(0)).toBe(0);
    expect(fileTokens(400)).toBe(100);
    expect(fileTokens(401)).toBe(101);
  });
});
