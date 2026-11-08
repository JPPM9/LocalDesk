import type { Result } from '../../shared/api';
import { tr } from '../../shared/messages';
import {
  TABLE_CELL_MAX,
  TABLE_MAX_COLUMNS,
  TABLE_MAX_ROWS,
  TABLE_NAME_MAX,
  type ColumnType,
  type ParsedTable,
  type TableCell,
} from '../../shared/tables';

/**
 * Aus den rohen Zellen (CSV: Texte, Excel: Texte und Zahlen) wird eine Tabelle mit Typen:
 * Zahlen (auch „1.234,56“), Daten (ISO und „31.12.2025“, gespeichert als „JJJJ-MM-TT“) und Text.
 * Eine Spalte bekommt einen Typ nur, wenn ALLE ihre Werte dazu passen – sonst bleibt sie Text
 * (so geht nichts verloren, z. B. Postleitzahlen mit führender Null).
 */

export type RawCell = string | number | null;

const PLAIN = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const INTEGER = /^[+-]?(?:0|[1-9]\d{0,14})$/;
const DE_DECIMAL = /^[+-]?(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+),\d+$/;
const DE_INTEGER = /^[+-]?[1-9]\d{0,2}(?:\.\d{3}){2,}$/;
const EN_THOUSANDS = /^[+-]?[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?$/;
const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DE_DATE =
  /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

type NumberStyle = 'plain' | 'de' | 'en';

function isNumberText(value: string, style: NumberStyle): boolean {
  if (style === 'plain') return PLAIN.test(value);
  if (style === 'de') {
    return (
      DE_DECIMAL.test(value) || DE_INTEGER.test(value) || INTEGER.test(value)
    );
  }
  return EN_THOUSANDS.test(value) || PLAIN.test(value);
}

function parseNumberText(value: string, style: NumberStyle): number {
  if (style === 'de') return Number(value.replace(/\./g, '').replace(',', '.'));
  if (style === 'en') return Number(value.replace(/,/g, ''));
  return Number(value);
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Echtes Kalenderdatum? (Schaltjahre, 30./31. …) */
function validDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= days;
}

/** „2025-03-07“, „07.03.2025 14:30“ … → „JJJJ-MM-TT“ oder „JJJJ-MM-TT HH:MM:SS“; null, wenn kein Datum. */
export function normalizeDate(value: string): string | null {
  let y: number, m: number, d: number;
  let time: [number, number, number] | null = null;
  const iso = ISO_DATE.exec(value);
  const de = iso ? null : DE_DATE.exec(value);
  const match = iso ?? de;
  if (!match) return null;
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    [d, m, y] = [Number(de![1]), Number(de![2]), Number(de![3])];
  }
  if (match[4] !== undefined) {
    time = [Number(match[4]), Number(match[5]), Number(match[6] ?? 0)];
    if (time[0] > 23 || time[1] > 59 || time[2] > 59) return null;
  }
  if (!validDate(y, m, d)) return null;
  const day = `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
  return time ? `${day} ${pad(time[0])}:${pad(time[1])}:${pad(time[2])}` : day;
}

function isNumericCell(cell: RawCell): boolean {
  if (typeof cell === 'number') return Number.isFinite(cell);
  if (cell === null) return false;
  const text = cell.trim();
  return (
    text !== '' &&
    (PLAIN.test(text) || DE_DECIMAL.test(text) || EN_THOUSANDS.test(text))
  );
}

/** Spaltenname: eine Zeile, höchstens 60 Zeichen. */
function cleanName(value: RawCell, index: number): string {
  const text = value === null ? '' : String(value).replace(/\s+/g, ' ').trim();
  const name =
    text.length > TABLE_NAME_MAX
      ? text.slice(0, TABLE_NAME_MAX).trimEnd()
      : text;
  return name || `spalte_${index + 1}`;
}

function inferColumn(cells: RawCell[]): {
  type: ColumnType;
  convert: (cell: RawCell) => TableCell;
} {
  const present = cells.filter(
    (c): c is string | number =>
      c !== null && !(typeof c === 'string' && c.trim() === ''),
  );
  const text = (cell: RawCell): TableCell => {
    if (cell === null) return null;
    const s = typeof cell === 'number' ? String(cell) : cell;
    if (s.trim() === '') return null;
    return s.length > TABLE_CELL_MAX ? s.slice(0, TABLE_CELL_MAX) : s;
  };
  const asText = { type: 'text' as const, convert: text };
  if (present.length === 0) return asText;

  // Excel liefert Zahlen schon als Zahlen.
  if (present.every((c) => typeof c === 'number' && Number.isFinite(c))) {
    const numbers = present as number[];
    const whole = numbers.every((n) => Number.isSafeInteger(n));
    return {
      type: whole ? 'integer' : 'real',
      convert: (c) => (typeof c === 'number' ? c : text(c)),
    };
  }

  const strings = present.map((c) => String(c).trim());
  if (strings.every((s) => INTEGER.test(s))) {
    return {
      type: 'integer',
      convert: (c) =>
        c === null || String(c).trim() === '' ? null : Number(String(c).trim()),
    };
  }
  // Mehr als 15 Ziffern verträgt eine Kommazahl nicht ohne Rundung (Kontonummern, lange IDs): Text.
  if (strings.some((s) => s.replace(/\D/g, '').length > 15)) return asText;
  for (const style of ['plain', 'de', 'en'] as const) {
    if (strings.every((s) => isNumberText(s, style))) {
      const values = strings.map((s) => parseNumberText(s, style));
      if (!values.every((n) => Number.isFinite(n))) break;
      const decimalMark = style === 'de' ? ',' : '.';
      const whole =
        values.every((n) => Number.isSafeInteger(n)) &&
        !strings.some((s) => s.includes(decimalMark));
      return {
        type: whole ? 'integer' : 'real',
        convert: (c) =>
          c === null || String(c).trim() === ''
            ? null
            : parseNumberText(String(c).trim(), style),
      };
    }
  }
  const dates = strings.map(normalizeDate);
  if (dates.every((d) => d !== null)) {
    return {
      type: 'date',
      convert: (c) =>
        c === null || String(c).trim() === ''
          ? null
          : normalizeDate(String(c).trim()),
    };
  }
  return asText;
}

export interface BuiltTable extends ParsedTable {
  /** Die erste Zeile war keine Kopfzeile (alle Zellen Zahlen): Die Spalten heißen spalte_1 … */
  noHeader: boolean;
}

/**
 * Baut die Tabelle: Kopfzeile, Spaltennamen (eindeutig), Typen. Zu viele Zeilen oder Spalten und
 * leere Tabellen sind Fehler mit fertigem Text. Völlig leere Zeilen fallen weg.
 */
export function buildTable(
  name: string,
  grid: RawCell[][],
): Result<BuiltTable> {
  const lines = grid.filter((row) =>
    row.some((c) => c !== null && String(c).trim() !== ''),
  );
  if (lines.length === 0) {
    return { ok: false, error: tr('tables.empty', { name }) };
  }
  const width = lines.reduce((max, row) => Math.max(max, row.length), 0);
  if (width > TABLE_MAX_COLUMNS) {
    return {
      ok: false,
      error: tr('tables.tooManyColumns', { name, max: TABLE_MAX_COLUMNS }),
    };
  }
  const first = lines[0];
  const firstValues = first.filter(
    (c) => c !== null && String(c).trim() !== '',
  );
  const noHeader =
    lines.length > 1 &&
    firstValues.length > 0 &&
    firstValues.every(isNumericCell);
  const dataRows = noHeader ? lines : lines.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, error: tr('tables.empty', { name }) };
  }
  if (dataRows.length > TABLE_MAX_ROWS) {
    return {
      ok: false,
      error: tr('tables.tooManyRows', {
        name,
        max: TABLE_MAX_ROWS.toLocaleString('de-DE'),
      }),
    };
  }

  const names: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < width; i++) {
    const base = noHeader ? `spalte_${i + 1}` : cleanName(first[i] ?? null, i);
    let candidate = base;
    for (let n = 2; seen.has(candidate.toLowerCase()); n++)
      candidate = `${base}_${n}`;
    seen.add(candidate.toLowerCase());
    names.push(candidate);
  }

  const columns = names.map((columnName, i) => {
    const inferred = inferColumn(dataRows.map((row) => row[i] ?? null));
    return { name: columnName, type: inferred.type, convert: inferred.convert };
  });
  const rows: TableCell[][] = dataRows.map((row) =>
    columns.map((column, i) => column.convert(row[i] ?? null)),
  );
  return {
    ok: true,
    value: {
      columns: columns.map(({ name: n, type }) => ({ name: n, type })),
      rows,
      noHeader,
    },
  };
}
