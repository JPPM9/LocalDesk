import { strToU8, zipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv } from '../../src/main/data/csv';
import {
  buildTable,
  normalizeDate,
  type RawCell,
} from '../../src/main/data/table';
import {
  excelSerialToText,
  readXlsx,
  XlsxError,
} from '../../src/main/data/xlsx';
import { setMessageLanguage } from '../../src/shared/messages';
import { sqlTableName } from '../../src/shared/tables';

afterEach(() => setMessageLanguage('de'));

describe('detectDelimiter', () => {
  it('erkennt Komma, Semikolon, Tabulator und Strich', () => {
    expect(detectDelimiter('a,b,c\n1,2,3\n4,5,6')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3\n4;5;6')).toBe(';');
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    expect(detectDelimiter('a|b|c\n1|2|3')).toBe('|');
  });

  it('Kommas in Zahlen (deutsches Format) täuschen nicht, wenn das Semikolon gleichmäßig ist', () => {
    expect(
      detectDelimiter('Name;Preis\nApfel;1,50\nBirne;2,25\nKiwi;0,99'),
    ).toBe(';');
  });

  it('Trennzeichen in Anführungszeichen zählen nicht', () => {
    expect(detectDelimiter('a;b\n"x,y,z";1\n"p,q";2')).toBe(';');
  });

  it('eine Spalte ohne Trennzeichen: Komma', () => {
    expect(detectDelimiter('Name\nAnna\nBen')).toBe(',');
    expect(detectDelimiter('')).toBe(',');
  });
});

describe('parseCsv', () => {
  it('liest Zeilen, Anführungszeichen, doppelte Anführungszeichen und Zeilenumbrüche in Feldern', () => {
    const { rows } = parseCsv(
      'a,b\n"x, y","sie sagte ""hallo"""\n"zwei\nZeilen",3\n',
      ',',
    );
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'sie sagte "hallo"'],
      ['zwei\nZeilen', '3'],
    ]);
  });

  it('versteht \\r\\n und alleiniges \\r, überspringt leere Zeilen, behält leere Felder', () => {
    expect(parseCsv('a,b\r\n\r\n1,\r\n,2\r\n', ',').rows).toEqual([
      ['a', 'b'],
      ['1', ''],
      ['', '2'],
    ]);
    expect(parseCsv('a,b\r1,2', ',').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ein leeres Feld in Anführungszeichen ist keine leere Zeile', () => {
    expect(parseCsv('a\n""\nb', ',').rows).toEqual([['a'], [''], ['b']]);
  });

  it('ein nie geschlossenes Anführungszeichen läuft bis zum Ende, ohne zu hängen', () => {
    const { rows } = parseCsv('a,b\n"offen,1\n2,3', ',');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('offen,1\n2,3');
  });

  it('hört bei „maxRows“ auf und meldet es', () => {
    const text = Array.from({ length: 100 }, (_, i) => `${i},x`).join('\n');
    const result = parseCsv(text, ',', 10);
    expect(result.rows).toHaveLength(10);
    expect(result.truncated).toBe(true);
    expect(parseCsv(text, ',', 100).truncated).toBe(false);
  });

  it('liest eine große Datei schnell', () => {
    const line = '2025-01-02;Region Nord;1.234,56;ja;Bemerkung mit Text\n';
    const text = `Datum;Region;Umsatz;Aktiv;Notiz\n${line.repeat(200_000)}`;
    const started = Date.now();
    const { rows } = parseCsv(text, ';');
    expect(rows).toHaveLength(200_001);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe('normalizeDate', () => {
  it('ISO und deutsches Datum, mit und ohne Uhrzeit', () => {
    expect(normalizeDate('2025-03-07')).toBe('2025-03-07');
    expect(normalizeDate('07.03.2025')).toBe('2025-03-07');
    expect(normalizeDate('7.3.2025')).toBe('2025-03-07');
    expect(normalizeDate('2025-03-07T14:30:15Z')).toBe('2025-03-07 14:30:15');
    expect(normalizeDate('2025-03-07 14:30')).toBe('2025-03-07 14:30:00');
    expect(normalizeDate('07.03.2025 9:05')).toBe('2025-03-07 09:05:00');
  });

  it('lehnt erfundene Daten und andere Texte ab', () => {
    for (const bad of [
      '2025-02-30',
      '31.04.2025',
      '2025-13-01',
      '00.01.2025',
      '2025-03-07 25:00',
      '2025',
      '12/31/2025',
      'morgen',
      '',
    ]) {
      expect(normalizeDate(bad), bad).toBeNull();
    }
    expect(normalizeDate('2024-02-29')).toBe('2024-02-29'); // Schaltjahr
    expect(normalizeDate('2025-02-29')).toBeNull();
  });
});

describe('buildTable: Typen', () => {
  const build = (grid: RawCell[][]) => {
    const result = buildTable('t.csv', grid);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  };
  const types = (grid: RawCell[][]) => build(grid).columns.map((c) => c.type);

  it('erkennt Ganzzahl, Kommazahl, Datum und Text', () => {
    const table = build([
      ['Nr', 'Preis', 'Datum', 'Name'],
      ['1', '1.5', '2025-01-02', 'Apfel'],
      ['2', '2.25', '2025-01-03', 'Birne'],
    ]);
    expect(table.columns).toEqual([
      { name: 'Nr', type: 'integer' },
      { name: 'Preis', type: 'real' },
      { name: 'Datum', type: 'date' },
      { name: 'Name', type: 'text' },
    ]);
    expect(table.rows).toEqual([
      [1, 1.5, '2025-01-02', 'Apfel'],
      [2, 2.25, '2025-01-03', 'Birne'],
    ]);
  });

  it('deutsche Zahlen: „1.234,56“, „12,5“, „1.234.567“', () => {
    const table = build([['v'], ['1.234,56'], ['12,5'], ['-0,5'], ['1000']]);
    expect(table.columns[0].type).toBe('real');
    expect(table.rows.map((r) => r[0])).toEqual([1234.56, 12.5, -0.5, 1000]);
    const whole = build([['v'], ['1.234.567'], ['5']]);
    expect(whole.columns[0].type).toBe('integer');
    expect(whole.rows.map((r) => r[0])).toEqual([1234567, 5]);
  });

  it('englische Tausender „1,234.5“; gemischte Schreibweisen bleiben Text', () => {
    expect(build([['v'], ['1,234.5'], ['2']]).rows.map((r) => r[0])).toEqual([
      1234.5, 2,
    ]);
    expect(types([['v'], ['1.234,56'], ['12.5']])).toEqual(['text']);
  });

  it('deutsche Daten werden zu ISO-Daten, mit Uhrzeit bleibt die Uhrzeit', () => {
    const table = build([['d'], ['31.12.2025'], ['01.01.2026 08:30']]);
    expect(table.columns[0].type).toBe('date');
    expect(table.rows.map((r) => r[0])).toEqual([
      '2025-12-31',
      '2026-01-01 08:30:00',
    ]);
  });

  it('Postleitzahlen und Nummern mit führender Null bleiben Text', () => {
    expect(types([['plz'], ['01067'], ['80331']])).toEqual(['text']);
    expect(build([['plz'], ['01067']]).rows[0][0]).toBe('01067');
  });

  it('eine einzige Ausnahme macht die Spalte zu Text – nichts geht verloren', () => {
    const table = build([['v'], ['1'], ['2'], ['n/a']]);
    expect(table.columns[0].type).toBe('text');
    expect(table.rows.map((r) => r[0])).toEqual(['1', '2', 'n/a']);
  });

  it('leere Zellen werden null und stören die Typ-Erkennung nicht', () => {
    const table = build([
      ['v', 'w'],
      ['1', ''],
      ['', 'y'],
      ['3', 'x'],
    ]);
    expect(table.columns.map((c) => c.type)).toEqual(['integer', 'text']);
    expect(table.rows).toEqual([
      [1, null],
      [null, 'y'],
      [3, 'x'],
    ]);
  });

  it('Excel-Zahlen (echte Zahlen) und Wahrheitswerte', () => {
    expect(
      types([
        ['a', 'b'],
        [1, 1.5],
        [2, 2],
      ]),
    ).toEqual(['integer', 'real']);
    expect(types([['a'], [1], ['x']])).toEqual(['text']);
  });

  it('riesige Zahlen werden nicht verfälscht, sondern bleiben Text', () => {
    expect(types([['id'], ['12345678901234567890'], ['1']])).toEqual(['text']);
  });
});

describe('buildTable: Kopfzeile, Namen, Grenzen', () => {
  it('eindeutige Namen: Doppelte bekommen „_2“, leere „spalte_N“, lange werden gekürzt', () => {
    const result = buildTable('t', [
      ['Name', 'name', '', 'x'.repeat(100), '  Mit   Leerraum '],
      ['a', 'b', 'c', 'd', 'e'],
    ]);
    expect(result.ok && result.value.columns.map((c) => c.name)).toEqual([
      'Name',
      'name_2',
      'spalte_3',
      'x'.repeat(60),
      'Mit Leerraum',
    ]);
  });

  it('ist die erste Zeile nur Zahlen, gibt es keine Kopfzeile', () => {
    const result = buildTable('t', [
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(result.ok && result.value.noHeader).toBe(true);
    expect(result.ok && result.value.columns.map((c) => c.name)).toEqual([
      'spalte_1',
      'spalte_2',
    ]);
    expect(result.ok && result.value.rows).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('unterschiedlich lange Zeilen werden aufgefüllt', () => {
    const result = buildTable('t', [
      ['a', 'b', 'c'],
      ['1', '2'],
      ['3', '4', '5', '6'],
    ]);
    expect(result.ok && result.value.columns).toHaveLength(4);
    expect(result.ok && result.value.rows[0]).toEqual([1, 2, null, null]);
  });

  it('leere Tabelle, nur Kopfzeile, zu viele Spalten und zu viele Zeilen sind Fehler mit Text', () => {
    expect(buildTable('leer.csv', [])).toEqual({
      ok: false,
      error: 'Die Tabelle „leer.csv“ ist leer.',
    });
    expect(buildTable('k.csv', [['a', 'b']]).ok).toBe(false);
    expect(
      buildTable('b.csv', [Array.from({ length: 201 }, (_, i) => `c${i}`), []])
        .ok,
    ).toBe(false);
    const wide = buildTable('b.csv', [
      Array.from({ length: 201 }, (_, i) => `c${i}`),
      Array(201).fill('1'),
    ]);
    expect(wide).toEqual({
      ok: false,
      error: expect.stringContaining('mehr als 200 Spalten'),
    });
    const long = Array.from({ length: 200_002 }, (_, i) =>
      i === 0 ? ['a'] : [String(i)],
    );
    expect(buildTable('lang.csv', long)).toEqual({
      ok: false,
      error: expect.stringContaining('mehr als 200.000 Zeilen'),
    });
    setMessageLanguage('en');
    expect(buildTable('leer.csv', [])).toEqual({
      ok: false,
      error: 'The table “leer.csv” is empty.',
    });
  });

  it('völlig leere Zeilen zählen nicht', () => {
    const result = buildTable('t', [['a'], [''], ['1'], [null], ['2']]);
    expect(result.ok && result.value.rows).toEqual([[1], [2]]);
  });

  it('lange Texte in Zellen werden gekürzt', () => {
    const result = buildTable('t', [['a'], ['x'.repeat(5000)]]);
    expect(result.ok && (result.value.rows[0][0] as string).length).toBe(2000);
  });
});

describe('sqlTableName', () => {
  it('kleingeschrieben, ohne Sonderzeichen, eindeutig', () => {
    expect(sqlTableName('Umsatz 2025.csv', [])).toBe('umsatz_2025');
    expect(sqlTableName('Übersicht-Größe.xlsx', [])).toBe('uebersicht_groesse');
    expect(sqlTableName('umsatz.csv', ['umsatz'])).toBe('umsatz_2');
    expect(sqlTableName('Umsatz.tsv', ['umsatz', 'Umsatz_2'])).toBe('umsatz_3');
  });

  it('beginnt mit einem Buchstaben und ist nie leer', () => {
    expect(sqlTableName('2025.csv', [])).toBe('t_2025');
    expect(sqlTableName('…', [])).toBe('tabelle');
    expect(sqlTableName('t.csv', [])).toBe('tabelle');
    expect(sqlTableName('x'.repeat(100) + '.csv', [])).toHaveLength(40);
  });
});

// ------------------------------------------------------------------ Excel

const SHEET1 = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>
<row r="2"><c r="A2" s="1"><v>45658</v></c><c r="B2" t="s"><v>5</v></c><c r="C2"><v>1234.5</v></c><c r="D2" t="b"><v>1</v></c><c r="E2" s="3"><v>45658.5</v></c></row>
<row r="4"><c r="A4" s="2"><v>45659</v></c><c r="B4" t="inlineStr"><is><t>Süd &amp; West</t></is></c><c r="C4"><f>C2*2</f><v>2469</v></c><c r="D4" t="b"><v>0</v></c><c r="E4" t="e"><v>#DIV/0!</v></c></row>
<row r="5"><c r="B5" t="str"><v>Formeltext</v></c><c r="G5"><v>7</v></c></row>
</sheetData></worksheet>`;

function xlsx(
  overrides: Record<string, string> = {},
  extra: Record<string, Uint8Array> = {},
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<Types/>'),
    'xl/workbook.xml': strToU8(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><sheets><sheet name="Umsatz" sheetId="1" r:id="rId7"/><sheet name="Zwei" sheetId="2" r:id="rId8"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<Relationships><Relationship Id="rId8" Type="x" Target="worksheets/sheet2.xml"/><Relationship Id="rId7" Type="x" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    'xl/sharedStrings.xml': strToU8(
      '<sst><si><t>Datum</t></si><si><t>Region</t></si><si><t>Umsatz</t></si><si><t>Aktiv</t></si><si><t>Zeit</t></si><si><r><t>Nord</t></r><r><t xml:space="preserve"> Ost</t></r><rPh><t>ignoriert</t></rPh></si></sst>',
    ),
    'xl/styles.xml': strToU8(
      '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\.mm\\.yyyy"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="164"/><xf numFmtId="22"/></cellXfs></styleSheet>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(SHEET1),
    'xl/worksheets/sheet2.xml': strToU8(
      '<worksheet><sheetData><row r="1"><c r="A1"><v>999</v></c></row></sheetData></worksheet>',
    ),
    ...Object.fromEntries(
      Object.entries(overrides).map(([k, v]) => [k, strToU8(v)]),
    ),
    ...extra,
  };
  return zipSync(files);
}

describe('readXlsx', () => {
  it('liest das ERSTE Blatt (nach der Reihenfolge im Arbeitsbuch, nicht nach Dateinamen)', () => {
    const result = readXlsx(xlsx());
    expect(result.sheetName).toBe('Umsatz');
    expect(result.rows[0].slice(0, 5)).toEqual([
      'Datum',
      'Region',
      'Umsatz',
      'Aktiv',
      'Zeit',
    ]);
  });

  it('Werte: Daten am Zellformat erkannt, Zahlen, Wahrheitswerte, Textteile, Formelwerte, Fehler', () => {
    const { rows } = readXlsx(xlsx());
    expect(rows[1][0]).toBe('2025-01-01'); // 45658, Format 14
    expect(rows[1][1]).toBe('Nord Ost'); // zwei Textteile, ohne Lautschrift
    expect(rows[1][2]).toBe(1234.5);
    expect(rows[1][3]).toBe('true');
    expect(rows[1][4]).toBe('2025-01-01 12:00:00'); // Format 22 mit Uhrzeit
    expect(rows[2]).toEqual([null, null, null, null, null, null, null]); // Lücke (Zeile 3)
    expect(rows[3][0]).toBe('2025-01-02'); // eigenes Format dd.mm.yyyy
    expect(rows[3][1]).toBe('Süd & West'); // inlineStr mit &amp;
    expect(rows[3][2]).toBe(2469); // Formel: der gespeicherte Wert zählt
    expect(rows[3][3]).toBe('false');
    expect(rows[3][4]).toBeNull(); // Fehlerwert
    expect(rows[4][1]).toBe('Formeltext');
    expect(rows[4][6]).toBe(7); // Spalte G
  });

  it('daraus wird mit buildTable eine saubere Tabelle (leere Zeile fällt weg)', () => {
    const built = buildTable('umsatz.xlsx', readXlsx(xlsx()).rows);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.columns.slice(0, 3)).toEqual([
      { name: 'Datum', type: 'date' },
      { name: 'Region', type: 'text' },
      { name: 'Umsatz', type: 'real' },
    ]);
    expect(built.value.rows).toHaveLength(3);
  });

  it('Datumszahlen: 1900er und 1904er Zählung, Zeit allein', () => {
    expect(excelSerialToText(45658, false)).toBe('2025-01-01');
    expect(excelSerialToText(1, false)).toBe('1900-01-01');
    expect(excelSerialToText(61, false)).toBe('1900-03-01');
    expect(excelSerialToText(44197, false)).toBe('2021-01-01');
    expect(excelSerialToText(42735, true)).toBe('2021-01-01'); // 1904-System
    expect(excelSerialToText(0.75, false)).toBe('18:00:00');
    expect(excelSerialToText(45658.999999, false)).toBe('2025-01-02');
  });

  it('kaputte, leere und fremde Dateien sind „broken“/„empty“, nie ein Absturz', () => {
    const code = (bytes: Uint8Array) => {
      try {
        readXlsx(bytes);
        return 'kein Fehler';
      } catch (error) {
        return error instanceof XlsxError ? error.code : String(error);
      }
    };
    expect(code(new Uint8Array([1, 2, 3, 4]))).toBe('broken');
    expect(code(strToU8('keine zip-datei'))).toBe('broken');
    expect(code(zipSync({ 'a.txt': strToU8('x') }))).toBe('broken');
    expect(
      code(
        xlsx({
          'xl/worksheets/sheet1.xml':
            '<worksheet><sheetData></sheetData></worksheet>',
        }),
      ),
    ).toBe('empty');
    expect(
      code(xlsx({ 'xl/_rels/workbook.xml.rels': '<Relationships/>' })),
    ).toBe('broken');
  });

  it('zu viele Spalten: „tooWide“', () => {
    const cells = Array.from({ length: 250 }, (_, i) => {
      let n = i + 1;
      let letters = '';
      while (n > 0) {
        letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
        n = Math.floor((n - 1) / 26);
      }
      return `<c r="${letters}1"><v>1</v></c>`;
    }).join('');
    expect(() =>
      readXlsx(
        xlsx({
          'xl/worksheets/sheet1.xml': `<worksheet><sheetData><row r="1">${cells}</row></sheetData></worksheet>`,
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: 'tooWide' }));
  });

  it('Zip-Bombe: ein Blatt, das entpackt viel zu groß wäre, wird gar nicht erst entpackt', () => {
    const bomb = zipSync(
      {
        'xl/workbook.xml': strToU8(
          '<workbook xmlns:r="x"><sheets><sheet name="A" r:id="rId1"/></sheets></workbook>',
        ),
        'xl/_rels/workbook.xml.rels': strToU8(
          '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        ),
        'xl/worksheets/sheet1.xml': new Uint8Array(300 * 1024 * 1024),
      },
      { level: 1 },
    );
    expect(bomb.byteLength).toBeLessThan(1_000_000);
    expect(() => readXlsx(bomb)).toThrowError(
      expect.objectContaining({ code: 'tooLarge' }),
    );
    // Das Packen der 300 MB dauert unter Last einige Sekunden.
  }, 60_000);

  it('viele Zeilen: abgeschnitten ab der Grenze, schnell', () => {
    const rows = Array.from(
      { length: 210_000 },
      (_, i) => `<row r="${i + 1}"><c r="A${i + 1}"><v>${i}</v></c></row>`,
    ).join('');
    const started = Date.now();
    const result = readXlsx(
      xlsx({
        'xl/worksheets/sheet1.xml': `<worksheet><sheetData>${rows}</sheetData></worksheet>`,
      }),
    );
    expect(result.truncated).toBe(true);
    expect(result.rows.length).toBeLessThanOrEqual(200_001);
    expect(Date.now() - started).toBeLessThan(20_000);
  });
});
