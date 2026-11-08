import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strToU8 } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { DataWorker, threadSpawn } from '../../src/main/data/data-client';
import {
  isTableFile,
  readTableFile,
} from '../../src/main/data/read-table-file';
import {
  singleStatement,
  SqlError,
  SqlSession,
  type LoadTable,
} from '../../src/main/data/sql-session';
import { setMessageLanguage } from '../../src/shared/messages';

afterEach(() => setMessageLanguage('de'));

const SALES: LoadTable = {
  sqlName: 'umsatz',
  columns: [
    { name: 'Region', type: 'text' },
    { name: 'Produkt', type: 'text' },
    { name: 'Menge', type: 'integer' },
    { name: 'Preis (€)', type: 'real' },
    { name: 'Datum', type: 'date' },
  ],
  rows: [
    ['Nord', 'Apfel', 10, 1.5, '2025-01-02'],
    ['Nord', 'Birne', 4, 2.25, '2025-01-03'],
    ['Süd', 'Apfel', 7, 1.5, '2025-02-01'],
    ['Süd', 'Kiwi', 3, 0.99, '2025-02-15'],
    ['West', 'Apfel', null, 1.5, null],
  ],
};

function session(...tables: LoadTable[]) {
  const s = new SqlSession();
  s.load(tables.length > 0 ? tables : [SALES]);
  return s;
}
const error = (s: SqlSession, sql: unknown) => {
  try {
    s.query(sql, 50);
    return 'kein Fehler';
  } catch (e) {
    return e instanceof SqlError ? e.message : `ANDERER FEHLER: ${String(e)}`;
  }
};

describe('SqlSession: Abfragen', () => {
  it('rechnet mit SQL: Summe, Gruppierung, Mittelwert, Sortierung', () => {
    const s = session();
    expect(
      s.query(
        'SELECT "Region", SUM("Menge") AS summe FROM umsatz GROUP BY "Region" ORDER BY summe DESC',
        50,
      ),
    ).toEqual({
      columns: ['Region', 'summe'],
      rows: [
        ['Nord', 14],
        ['Süd', 10],
        ['West', null],
      ],
      more: false,
    });
    expect(
      s.query(
        'SELECT ROUND(AVG("Preis (€)"), 3) AS m, COUNT(*) AS n FROM umsatz',
        5,
      ).rows,
    ).toEqual([[1.548, 5]]);
  });

  it('Datumsfunktionen gehen, weil Daten als JJJJ-MM-TT gespeichert sind', () => {
    const s = session();
    expect(
      s.query(
        'SELECT strftime(\'%Y-%m\', "Datum") AS monat, COUNT(*) FROM umsatz WHERE "Datum" IS NOT NULL GROUP BY monat',
        10,
      ).rows,
    ).toEqual([
      ['2025-01', 2],
      ['2025-02', 2],
    ]);
  });

  it('WITH, Unterabfragen, mehrere Tabellen und Verknüpfungen', () => {
    const regions: LoadTable = {
      sqlName: 'regionen',
      columns: [
        { name: 'Region', type: 'text' },
        { name: 'Leiter', type: 'text' },
      ],
      rows: [
        ['Nord', 'Anna'],
        ['Süd', 'Ben'],
      ],
    };
    const s = session(SALES, regions);
    expect(
      s.query(
        'WITH s AS (SELECT "Region", SUM("Menge") AS m FROM umsatz GROUP BY 1) SELECT r."Leiter", s.m FROM s JOIN regionen r ON r."Region" = s."Region" ORDER BY 2 DESC',
        10,
      ).rows,
    ).toEqual([
      ['Anna', 14],
      ['Ben', 10],
    ]);
  });

  it('liefert höchstens „maxRows“ Zeilen und sagt, dass es mehr gibt', () => {
    const s = session();
    const result = s.query('SELECT * FROM umsatz', 2);
    expect(result.rows).toHaveLength(2);
    expect(result.more).toBe(true);
    expect(s.query('SELECT * FROM umsatz', 5).more).toBe(false);
  });

  it('Spaltennamen auch ohne Treffer, doppelte Namen bleiben getrennte Spalten', () => {
    const s = session();
    expect(
      s.query('SELECT "Region", "Menge" FROM umsatz WHERE 1 = 0', 5),
    ).toEqual({ columns: ['Region', 'Menge'], rows: [], more: false });
    expect(
      s.query('SELECT "Menge", "Menge" FROM umsatz LIMIT 1', 5).rows,
    ).toEqual([[10, 10]]);
  });

  it('ein Strichpunkt am Ende und Kommentare sind erlaubt', () => {
    const s = session();
    expect(
      s.query('  -- Summe\nSELECT COUNT(*) FROM umsatz;  ', 5).rows,
    ).toEqual([[5]]);
    expect(s.query('/* x */ SELECT 1 + 1', 5).rows).toEqual([[2]]);
  });

  it('große Zahlen und Texte: sichere Ganzzahlen als Zahl, lange Texte gekürzt', () => {
    const s = session();
    expect(
      s.query('SELECT 9007199254740993 AS gross, 5 AS klein', 5).rows,
    ).toEqual([['9007199254740993', 5]]);
    const long = s.query("SELECT printf('%.*c', 2000, 'x') AS t", 5)
      .rows[0][0] as string;
    expect(long.length).toBe(501);
    expect(long.endsWith('…')).toBe(true);
  });

  it('Fehler in der Abfrage kommen als Text zurück, damit das Modell sie korrigieren kann', () => {
    const s = session();
    expect(error(s, 'SELECT gibtsnicht FROM umsatz')).toMatch(
      /^Fehler in der Abfrage: .*gibtsnicht/,
    );
    expect(error(s, 'SELECT * FROM unbekannt')).toMatch(/no such table/);
    expect(error(s, 'SELEC * FROM umsatz')).toBe(
      'Erlaubt sind nur lesende Abfragen (SELECT oder WITH).',
    );
    expect(error(s, '')).toBe('Die Abfrage ist leer.');
    expect(error(s, 42)).toBe('Die Abfrage ist leer.');
    expect(error(s, 'SELECT ' + 'x'.repeat(10_000))).toMatch(/zu lang/);
    setMessageLanguage('en');
    expect(error(s, '')).toBe('The query is empty.');
  });
});

describe('SqlSession: nur lesen', () => {
  const blocked = [
    "INSERT INTO umsatz VALUES ('x','y',1,1,'2025-01-01')",
    'UPDATE umsatz SET "Menge" = 0',
    'DELETE FROM umsatz',
    'DROP TABLE umsatz',
    'CREATE TABLE neu (a)',
    'ALTER TABLE umsatz ADD COLUMN x',
    "ATTACH DATABASE ':memory:' AS fremd",
    "ATTACH DATABASE 'C:/Temp/x.db' AS fremd",
    'PRAGMA table_info(umsatz)',
    'VACUUM',
    'BEGIN',
    'REPLACE INTO umsatz VALUES (1,2,3,4,5)',
  ];
  it('Schreiben, Anlegen, Anhängen und PRAGMA werden abgelehnt', () => {
    const s = session();
    for (const sql of blocked) {
      expect(error(s, sql), sql).not.toBe('kein Fehler');
    }
    // … und die Daten sind unverändert.
    expect(s.query('SELECT COUNT(*) FROM umsatz', 5).rows).toEqual([[5]]);
  });

  it('auch versteckt hinter WITH oder in Unterabfragen geht kein Schreiben', () => {
    const s = session();
    for (const sql of [
      'WITH x AS (SELECT 1) INSERT INTO umsatz SELECT * FROM umsatz',
      'WITH x AS (SELECT 1) DELETE FROM umsatz',
    ]) {
      expect(error(s, sql), sql).not.toBe('kein Fehler');
    }
    expect(s.query('SELECT COUNT(*) FROM umsatz', 5).rows).toEqual([[5]]);
  });

  it('Systemtabellen sind gesperrt, Funktionen zum Laden von Erweiterungen auch', () => {
    const s = session();
    expect(error(s, 'SELECT * FROM sqlite_master')).toBe(
      'Das ist nicht erlaubt: Die Tabellen dürfen nur gelesen werden (nichts ändern, keine Systemtabellen).',
    );
    expect(error(s, 'SELECT name FROM sqlite_schema')).toMatch(/nicht erlaubt/);
    expect(error(s, "SELECT load_extension('x')")).not.toBe('kein Fehler');
    expect(error(s, "SELECT * FROM pragma_table_info('umsatz')")).not.toBe(
      'kein Fehler',
    );
  });

  it('mehrere Anweisungen in einem Aufruf werden abgelehnt', () => {
    const s = session();
    expect(error(s, 'SELECT 1; DROP TABLE umsatz')).toBe(
      'In der Abfrage darf nur eine Anweisung stehen (ein „;“ nur am Ende).',
    );
    expect(error(s, 'SELECT 1; SELECT 2')).toMatch(/nur eine Anweisung/);
    expect(s.query('SELECT COUNT(*) FROM umsatz', 5).rows).toEqual([[5]]);
  });

  it('ein Strichpunkt in einem Text, Namen oder Kommentar zählt nicht als zweite Anweisung', () => {
    expect(singleStatement("SELECT 'a;b' AS x")).toBe("SELECT 'a;b' AS x");
    expect(singleStatement('SELECT "a;b" FROM t;')).toBe('SELECT "a;b" FROM t');
    expect(singleStatement('SELECT 1 -- ; nichts\n')).toBe(
      'SELECT 1 -- ; nichts',
    );
    expect(singleStatement('SELECT 1 /* ; */;  /* Ende */')).toBe(
      'SELECT 1 /* ; */',
    );
    expect(() => singleStatement("SELECT 'a'; SELECT 'b'")).toThrow(SqlError);
  });

  it('ohne geladene Tabellen: klare Meldung', () => {
    expect(error(new SqlSession(), 'SELECT 1')).toBe(
      'Es sind keine Tabellen geladen.',
    );
  });

  it('neues Laden ersetzt die alten Tabellen', () => {
    const s = session();
    s.load([
      {
        sqlName: 'neu',
        columns: [{ name: 'a', type: 'integer' }],
        rows: [[1]],
      },
    ]);
    expect(error(s, 'SELECT * FROM umsatz')).toMatch(/no such table/);
    expect(s.query('SELECT a FROM neu', 5).rows).toEqual([[1]]);
  });
});

describe('SqlSession: Spaltennamen mit Sonderzeichen', () => {
  it('Anführungszeichen, Leerzeichen und Umlaute im Namen gehen', () => {
    const s = session({
      sqlName: 't',
      columns: [
        { name: 'Wert "A"', type: 'integer' },
        { name: 'Größe (m²)', type: 'real' },
      ],
      rows: [[1, 2.5]],
    });
    expect(s.query('SELECT "Wert ""A""", "Größe (m²)" FROM t', 5).rows).toEqual(
      [[1, 2.5]],
    );
  });
});

describe('SqlSession: große Tabellen', () => {
  it('200.000 Zeilen laden und abfragen geht schnell', () => {
    const rows = Array.from({ length: 200_000 }, (_, i) => [
      `R${i % 7}`,
      i,
      (i % 100) / 10,
    ]);
    const started = Date.now();
    const s = session({
      sqlName: 'gross',
      columns: [
        { name: 'g', type: 'text' },
        { name: 'n', type: 'integer' },
        { name: 'x', type: 'real' },
      ],
      rows: rows as (string | number)[][],
    });
    const result = s.query(
      'SELECT g, COUNT(*), SUM(n) FROM gross GROUP BY g ORDER BY g',
      50,
    );
    expect(result.rows).toHaveLength(7);
    expect(result.rows.reduce((sum, r) => sum + (r[1] as number), 0)).toBe(
      200_000,
    );
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});

describe('readTableFile', () => {
  it('CSV mit Semikolon und deutschen Zahlen/Daten, Windows-Zeichensatz, mit Typen', () => {
    // Alles als Windows-1252 (ein Byte je Zeichen): ö = 0xF6, ß = 0xDF
    const bytes = Uint8Array.from(
      Buffer.from(
        'Stadt;Größe;Datum\nBerlin;1.234,5;31.12.2025\nKöln;99,5;01.01.2026\n',
        'latin1',
      ),
    );
    const result = readTableFile('Städte.csv', bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns.map((c) => `${c.name}:${c.type}`)).toEqual([
      'Stadt:text',
      'Größe:real',
      'Datum:date',
    ]);
    expect(result.value.rows[1]).toEqual(['Köln', 99.5, '2026-01-01']);
  });

  it('TSV ist immer tabulatorgetrennt; Endungen und Fehler', () => {
    const tsv = readTableFile('a.tsv', strToU8('x;y\tz\n1;2\t3\n'));
    expect(tsv.ok && tsv.value.columns.map((c) => c.name)).toEqual([
      'x;y',
      'z',
    ]);
    expect(readTableFile('a.pdf', strToU8('x'))).toEqual({
      ok: false,
      error: expect.stringContaining('nur .csv, .tsv und .xlsx'),
    });
    expect(readTableFile('a.csv', Uint8Array.from([0, 1, 2, 0]))).toEqual({
      ok: false,
      error: expect.stringContaining('keine Textdatei'),
    });
    expect(readTableFile('a.xlsx', strToU8('kein zip'))).toEqual({
      ok: false,
      error: expect.stringContaining('keine gültige Excel-Datei'),
    });
    expect(readTableFile('a.csv', strToU8('  \n '))).toEqual({
      ok: false,
      error: expect.stringContaining('ist leer'),
    });
    expect(
      isTableFile('X.CSV') &&
        isTableFile('b.xlsx') &&
        !isTableFile('c.xls') &&
        !isTableFile('d.txt'),
    ).toBe(true);
  });

  it('zu große Dateien werden abgelehnt', () => {
    const big = new Uint8Array(20 * 1024 * 1024 + 1).fill(97);
    expect(readTableFile('gross.csv', big)).toEqual({
      ok: false,
      error: expect.stringContaining('größer als 20 MB'),
    });
  });

  it('der Dateiname wird bereinigt (Pfad weg) – auch in der Fehlermeldung', () => {
    const result = readTableFile('C:\\geheim\\ordner\\leer.csv', strToU8(''));
    expect(result).toEqual({
      ok: false,
      error: 'Die Tabelle „leer.csv“ ist leer.',
    });
  });
});

// Ein JS-Thread, der das Protokoll spricht, aber „query“ nie beantwortet, wenn die Abfrage „HANG“ enthält.
describe('DataWorker (Zeitgrenzen und Neustart)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'localdesk-worker-'));
  const workerPath = path.join(dir, 'fake-worker.cjs');
  writeFileSync(
    workerPath,
    `const { parentPort } = require('node:worker_threads');
let loaded = 0;
parentPort.on('message', (m) => {
  if (m.type === 'load') { loaded = m.tables.length; parentPort.postMessage({ id: m.id, ok: true }); }
  else if (m.type === 'read') parentPort.postMessage({ id: m.id, ok: true, table: { columns: [{ name: 'a', type: 'integer' }], rows: [[1]], noHeader: false } });
  else if (m.sql.includes('HANG')) { /* antwortet nie */ }
  else if (m.sql.includes('CRASH')) { throw new Error('kaputt'); }
  else parentPort.postMessage({ id: m.id, ok: true, result: { columns: ['n'], rows: [[loaded]], more: false } });
});`,
  );
  afterEach(() => undefined);

  it('liest, lädt und fragt ab', async () => {
    const worker = new DataWorker(threadSpawn(workerPath));
    try {
      expect((await worker.read('a.csv', new Uint8Array(1))).ok).toBe(true);
      expect(worker.loaded).toBe(false);
      expect(await worker.load([SALES])).toEqual({ ok: true, value: null });
      expect(worker.loaded).toBe(true);
      expect(await worker.query('SELECT 1', 5)).toEqual({
        ok: true,
        value: { columns: ['n'], rows: [[1]], more: false },
      });
    } finally {
      worker.close();
    }
  });

  it('eine hängende Abfrage wird nach der Zeitgrenze beendet; danach muss neu geladen werden', async () => {
    const worker = new DataWorker(threadSpawn(workerPath), {
      queryTimeoutMs: 300,
    });
    try {
      await worker.load([SALES]);
      const started = Date.now();
      const hung = await worker.query('SELECT HANG', 5);
      expect(Date.now() - started).toBeLessThan(3000);
      expect(hung).toEqual({
        ok: false,
        error: expect.stringContaining('länger als 0.3 Sekunden'),
      });
      expect(worker.loaded).toBe(false);
      // Der Thread startet neu; ohne erneutes Laden kennt er keine Tabellen.
      expect(await worker.query('SELECT 1', 5)).toEqual({
        ok: true,
        value: { columns: ['n'], rows: [[0]], more: false },
      });
      await worker.load([SALES, SALES]);
      expect(await worker.query('SELECT 1', 5)).toEqual({
        ok: true,
        value: { columns: ['n'], rows: [[2]], more: false },
      });
    } finally {
      worker.close();
    }
  });

  it('stürzt der Thread ab, kommt ein Fehlertext und der nächste Auftrag läuft wieder', async () => {
    const worker = new DataWorker(threadSpawn(workerPath), {
      queryTimeoutMs: 2000,
    });
    try {
      const crashed = await worker.query('SELECT CRASH', 5);
      expect(crashed.ok).toBe(false);
      expect(worker.loaded).toBe(false);
      expect((await worker.query('SELECT 1', 5)).ok).toBe(true);
    } finally {
      worker.close();
    }
  });

  it('Aufräumen', () => {
    rmSync(dir, { recursive: true, force: true });
  });
});
