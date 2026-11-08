import { strFromU8, unzipSync } from 'fflate';
import { TABLE_MAX_COLUMNS, TABLE_MAX_ROWS } from '../../shared/tables';

/**
 * Ein eigener Leser für Excel-Dateien (.xlsx): erstes Tabellenblatt, nur die gespeicherten Werte
 * (Formeln werden nicht ausgeführt, Makros nicht angesehen). Datumszellen erkennt er am Zellformat
 * und gibt sie als „JJJJ-MM-TT“ (mit Uhrzeit: „JJJJ-MM-TT HH:MM:SS“) zurück.
 */

export type XlsxCell = string | number | null;

export interface XlsxResult {
  rows: XlsxCell[][];
  sheetName: string;
  /** Es gab mehr Zeilen als erlaubt – der Rest wurde nicht gelesen. */
  truncated: boolean;
}

/** Ein Fehler mit einer Kennung, die der Aufrufer in einen Text für dich übersetzt. */
export class XlsxError extends Error {
  constructor(readonly code: 'broken' | 'tooLarge' | 'tooWide' | 'empty') {
    super(code);
  }
}

/** So viel darf eine einzelne Datei im Archiv entpackt höchstens haben (Schutz vor Zip-Bomben). */
const MAX_PART_BYTES = 250 * 1024 * 1024;
const MAX_META_BYTES = 100 * 1024 * 1024;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXml(text: string): string {
  if (!text.includes('&') && !text.includes('_x')) return text;
  return text
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, name: string) => {
      if (name[0] === '#') {
        const code =
          name[1] === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : '';
      }
      return ENTITIES[name] ?? whole;
    })
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_whole, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`).exec(tag);
  return match ? decodeXml(match[1]) : undefined;
}

/** Die Entwürfe der Zeichenketten: `<si>` mit `<t>` oder mit mehreren Textteilen (`<r>`). */
function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)) {
    const body = (match[1] ?? '').replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
    let text = '';
    for (const part of body.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) {
      text += part[1] ?? '';
    }
    strings.push(decodeXml(text));
  }
  return strings;
}

/** Eingebaute Zahlenformate, die Datum oder Uhrzeit sind (ECMA-376, Teil 1, 18.8.30). */
function isBuiltinDateFormat(id: number): boolean {
  return (
    (id >= 14 && id <= 22) ||
    (id >= 27 && id <= 36) ||
    (id >= 45 && id <= 47) ||
    (id >= 50 && id <= 58)
  );
}

function isDateFormatCode(code: string): boolean {
  const stripped = code
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\\./g, '')
    .replace(/_./g, '');
  return /[dmyhs]/i.test(stripped) && !/^general$/i.test(stripped.trim());
}

/** Je Zellformat-Nummer: Datum/Uhrzeit oder nicht. */
function parseDateStyles(xml: string): boolean[] {
  const codes = new Map<number, string>();
  for (const match of xml.matchAll(/<numFmt\b([^>]*?)\/?>/g)) {
    const id = Number(attribute(match[1], 'numFmtId'));
    const code = attribute(match[1], 'formatCode');
    if (Number.isInteger(id) && code !== undefined) codes.set(id, code);
  }
  const block = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? '';
  const styles: boolean[] = [];
  for (const match of block.matchAll(/<xf\b([^>]*?)(?:\/>|>)/g)) {
    const id = Number(attribute(match[1], 'numFmtId') ?? 0);
    const custom = codes.get(id);
    styles.push(
      custom !== undefined ? isDateFormatCode(custom) : isBuiltinDateFormat(id),
    );
  }
  return styles;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Excel-Datumszahl → Text. `timeOnly`: nur die Uhrzeit (Zahl unter 1). */
export function excelSerialToText(serial: number, date1904: boolean): string {
  if (!Number.isFinite(serial)) return String(serial);
  const whole = Math.floor(serial);
  let seconds = Math.round((serial - whole) * 86_400);
  let days = whole;
  if (seconds >= 86_400) {
    seconds -= 86_400;
    days += 1;
  }
  const time = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  if (whole === 0 && !date1904 && seconds > 0) return time;
  // Excel kennt den 29.02.1900 (gab es nie): Ab dem 01.03.1900 liegt der Zähler um einen Tag höher.
  const epoch = date1904
    ? Date.UTC(1904, 0, 1)
    : days < 61
      ? Date.UTC(1899, 11, 31)
      : Date.UTC(1899, 11, 30);
  const d = new Date(epoch + days * 86_400_000);
  if (Number.isNaN(d.getTime())) return String(serial);
  const day = `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return seconds === 0 ? day : `${day} ${time}`;
}

/** „AB12“ → Spalte 27 (ab 0). */
function columnIndex(letters: string): number {
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function unzipParts(
  bytes: Uint8Array,
  wanted: (name: string) => boolean,
  maxEach: number,
): Record<string, Uint8Array> {
  let tooLarge = false;
  const parts = unzipSync(bytes, {
    filter: (file) => {
      if (!wanted(file.name)) return false;
      if (file.originalSize > maxEach) {
        tooLarge = true;
        return false;
      }
      return true;
    },
  });
  if (tooLarge) throw new XlsxError('tooLarge');
  return parts;
}

/** Liest das erste Tabellenblatt einer .xlsx-Datei. Wirft `XlsxError`. */
export function readXlsx(bytes: Uint8Array): XlsxResult {
  try {
    return readSheet(bytes);
  } catch (error) {
    if (error instanceof XlsxError) throw error;
    throw new XlsxError('broken');
  }
}

function readSheet(bytes: Uint8Array): XlsxResult {
  const meta = unzipParts(
    bytes,
    (name) =>
      name === 'xl/workbook.xml' ||
      name === 'xl/_rels/workbook.xml.rels' ||
      name === 'xl/sharedStrings.xml' ||
      name === 'xl/styles.xml',
    MAX_META_BYTES,
  );
  const workbook = meta['xl/workbook.xml'];
  const relations = meta['xl/_rels/workbook.xml.rels'];
  if (!workbook || !relations) throw new XlsxError('broken');
  const workbookXml = strFromU8(workbook);
  const sheetTag = /<sheet\b([^>]*?)\/?>/.exec(workbookXml)?.[1];
  if (!sheetTag) throw new XlsxError('empty');
  const sheetName = attribute(sheetTag, 'name') ?? '';
  const relationId = attribute(sheetTag, 'r:id');
  const date1904 = /<workbookPr\b[^>]*date1904\s*=\s*"(?:1|true)"/.test(
    workbookXml,
  );
  let target: string | undefined;
  for (const match of strFromU8(relations).matchAll(
    /<Relationship\b([^>]*?)\/?>/g,
  )) {
    if (attribute(match[1], 'Id') === relationId) {
      target = attribute(match[1], 'Target');
      break;
    }
  }
  if (!target) throw new XlsxError('broken');
  const path = target.startsWith('/')
    ? target.slice(1)
    : `xl/${target.replace(/^\.\//, '')}`;

  const sheetPart = unzipParts(bytes, (name) => name === path, MAX_PART_BYTES)[
    path
  ];
  if (!sheetPart) throw new XlsxError('broken');
  const sheetXml = strFromU8(sheetPart);

  const shared = meta['xl/sharedStrings.xml']
    ? parseSharedStrings(strFromU8(meta['xl/sharedStrings.xml']))
    : [];
  const dateStyles = meta['xl/styles.xml']
    ? parseDateStyles(strFromU8(meta['xl/styles.xml']))
    : [];

  const rows: XlsxCell[][] = [];
  let truncated = false;
  let width = 0;
  let currentRow = -1;
  for (const rowMatch of sheetXml.matchAll(
    /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
  )) {
    const explicit = Number(attribute(rowMatch[1], 'r'));
    currentRow =
      Number.isInteger(explicit) && explicit > 0
        ? explicit - 1
        : currentRow + 1;
    if (currentRow > TABLE_MAX_ROWS) {
      truncated = true;
      break;
    }
    const body = rowMatch[2] ?? '';
    const cells: XlsxCell[] = [];
    let col = -1;
    for (const cell of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attribute(cell[1], 'r');
      const letters = ref ? /^([A-Z]+)/.exec(ref)?.[1] : undefined;
      col = letters ? columnIndex(letters) : col + 1;
      if (col >= TABLE_MAX_COLUMNS) throw new XlsxError('tooWide');
      const type = attribute(cell[1], 't');
      const style = Number(attribute(cell[1], 's') ?? 0);
      const inner = cell[2] ?? '';
      let value: XlsxCell = null;
      if (type === 'inlineStr') {
        let text = '';
        for (const part of inner.matchAll(
          /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g,
        )) {
          text += part[1] ?? '';
        }
        value = decodeXml(text);
      } else {
        const raw = /<v\b[^>]*?>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (raw !== undefined) {
          if (type === 's') value = shared[Number(raw)] ?? null;
          else if (type === 'str' || type === 'd') value = decodeXml(raw);
          else if (type === 'b') value = raw.trim() === '1' ? 'true' : 'false';
          else if (type === 'e') value = null;
          else {
            const number = Number(raw);
            if (Number.isNaN(number)) value = null;
            else
              value = dateStyles[style]
                ? excelSerialToText(number, date1904)
                : number;
          }
        }
      }
      if (value !== null) {
        cells[col] = value;
        width = Math.max(width, col + 1);
      }
    }
    while (rows.length < currentRow) rows.push([]);
    rows[currentRow] = Array.from(cells, (c) => c ?? null);
  }
  // Leerer Rest am Ende, der durch Lücken entstand.
  while (rows.length > 0 && rows[rows.length - 1].length === 0) rows.pop();
  if (rows.length === 0) throw new XlsxError('empty');
  return {
    rows: rows.map((r) => {
      const out: XlsxCell[] = Array.from(
        { length: width },
        (_, i) => r[i] ?? null,
      );
      return out;
    }),
    sheetName,
    truncated,
  };
}
