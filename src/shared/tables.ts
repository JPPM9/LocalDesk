/**
 * Tabellen im Chat (Datenanalyse): CSV, TSV und Excel (.xlsx) werden gelesen, ihre Spalten
 * bekommen Typen, und das Modell fragt sie mit SQL ab. Hier stehen die Typen und Grenzen,
 * die Hauptprozess und Oberfläche teilen.
 */

/** Endungen, die als Tabelle gelesen werden. */
export const TABLE_EXTENSIONS = ['.csv', '.tsv', '.xlsx'] as const;

/** Wird diese Datei als Tabelle gelesen (nach der Endung)? */
export function isTableName(name: string): boolean {
  const lower = name.toLowerCase();
  return TABLE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Geschätzte Tokens, die die Beschreibung einer Tabelle im Kontext braucht (Schema und ein paar Zeilen). */
export const tableTokens = (columns: number): number => 150 + columns * 30;

/** Größte Datei (CSV, TSV oder Excel). */
export const TABLE_MAX_BYTES = 20 * 1024 * 1024;
export const TABLE_MAX_ROWS = 200_000;
export const TABLE_MAX_COLUMNS = 200;
/** Länge eines Spaltennamens und einer Zelle (Text), längere werden gekürzt. */
export const TABLE_NAME_MAX = 60;
export const TABLE_CELL_MAX = 2_000;
/** Von den Tabellen des Chats sind die letzten so viele abfragbar. */
export const TABLES_QUERYABLE_MAX = 3;
/** So viele Beispielzeilen sieht das Modell zu jeder Tabelle. */
export const TABLE_SAMPLE_ROWS = 5;

/** Kennung des Werkzeug-Servers der Tabellen (in den Tool-Aufrufen des Chats). */
export const TABLES_SERVER = 'tabellen';

export type ColumnType = 'integer' | 'real' | 'date' | 'text';

export interface TableColumn {
  name: string;
  type: ColumnType;
}

/** Zellwert nach dem Lesen: Zahl, Text (auch Datum als „JJJJ-MM-TT“) oder leer. */
export type TableCell = string | number | null;

/** Eine gelesene Tabelle: Spalten mit Typen und die Zeilen (gleich breit). */
export interface ParsedTable {
  columns: TableColumn[];
  rows: TableCell[][];
}

/** Was die Oberfläche über eine Tabelle weiß (ohne die Daten). */
export interface MessageTable {
  id: string;
  /** Dateiname, wie angehängt. */
  name: string;
  /** Name der Tabelle in SQL (t1, umsatz, …). */
  sqlName: string;
  rows: number;
  columns: number;
}

import type { MessageRecord } from './api';
import { FILE_TEXT_MAX_CHARS } from './files';
import { tr } from './messages';

const SQL_NAME_MAX = 40;

/**
 * Der Name einer Tabelle in SQL aus dem Dateinamen: Kleinbuchstaben, Ziffern und „_“,
 * beginnt mit einem Buchstaben, kommt in `taken` nicht vor (sonst „_2“, „_3“ …).
 */
export function sqlTableName(
  fileName: string,
  taken: Iterable<string>,
): string {
  const used = new Set([...taken].map((n) => n.toLowerCase()));
  const stem = fileName.replace(/\.[^.]*$/, '');
  let base = stem
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, SQL_NAME_MAX);
  if (!/^[a-z]/.test(base)) base = `t_${base}`.replace(/_$/, '');
  if (base === 't' || base === '') base = 'tabelle';
  let name = base;
  for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
  return name;
}

/** Was das Lesen einer Tabellendatei ergibt (ohne die Daten – die bleiben im Hauptprozess). */
export interface ReadChatTable {
  /** Nummer, mit der die Nachricht die Tabelle später beim Senden anfordert. */
  id: string;
  name: string;
  rows: number;
  columns: number;
}

/** Eine Tabelle, wie die Oberfläche sie mit der Nachricht schickt: nur die Nummer. */
export interface ChatTableInput {
  id: string;
}

const TABLE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Prüft die Tabellen-Nummern einer Nachricht (nur die Form; ob es sie gibt, prüft der Hauptprozess). */
export function checkTableInputs(
  input: unknown,
  max: number,
): { ok: true; value: ChatTableInput[] } | { ok: false } {
  if (input === undefined) return { ok: true, value: [] };
  if (!Array.isArray(input) || input.length > max) return { ok: false };
  const seen = new Set<string>();
  const tables: ChatTableInput[] = [];
  for (const item of input) {
    const id = (item as { id?: unknown } | null)?.id;
    if (typeof id !== 'string' || !TABLE_ID.test(id) || seen.has(id)) {
      return { ok: false };
    }
    seen.add(id);
    tables.push({ id });
  }
  return { ok: true, value: tables };
}

/** Von den Tabellen des Verlaufs sind die letzten `TABLES_QUERYABLE_MAX` abfragbar. */
export function tablesToSend(
  messages: Pick<MessageRecord, 'tables'>[],
): Set<string> {
  const ids = messages.flatMap((m) => (m.tables ?? []).map((t) => t.id));
  return new Set(ids.slice(-TABLES_QUERYABLE_MAX));
}

/** Hinweis „[Tabelle: …]“ statt des Inhalts (z. B. beim Verdichten und Zählen). */
export function tableMarker(name: string): string {
  return tr('prompt.tableMarker', { name });
}

/** Statt der Beschreibung einer älteren Tabelle: Sie ist nicht mehr abfragbar. */
export function tableOutOfContext(name: string): string {
  return tr('prompt.tableOld', { name, max: TABLES_QUERYABLE_MAX });
}

const SAMPLE_CELL_MAX = 80;

/** Eine Zelle als kurzer Text auf einer Zeile (leer = leer). */
function cellText(cell: TableCell, max: number): string {
  if (cell === null) return '';
  const text = String(cell).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Was das Modell zu einer abfragbaren Tabelle sieht: SQL-Name, Spalten mit Typen und die ersten
 * Zeilen – nie die ganze Tabelle (die fragt es mit `table_query` ab).
 */
export function tableSchemaBlock(table: {
  name: string;
  sqlName: string;
  rowCount: number;
  columns: TableColumn[];
  /** Die ersten Zeilen (mehr als `TABLE_SAMPLE_ROWS` werden nicht gezeigt). */
  sample: TableCell[][];
}): string {
  const sample = table.sample.slice(0, TABLE_SAMPLE_ROWS);
  return tr('prompt.tableBlock', {
    name: table.name,
    sql: table.sqlName,
    rows: table.rowCount,
    columns: table.columns.map((c) => `"${c.name}" (${c.type})`).join(', '),
    sampleCount: sample.length,
    sample: [
      table.columns.map((c) => c.name).join(' | '),
      ...sample.map((row) =>
        row.map((cell) => cellText(cell, SAMPLE_CELL_MAX)).join(' | '),
      ),
    ].join('\n'),
  });
}

/**
 * Die ganze Tabelle als Text für Modelle ohne Werkzeuge (Spalten durch „ | “ getrennt);
 * null, wenn sie länger als eine Datei sein darf.
 */
export function tableAsText(table: {
  name: string;
  columns: TableColumn[];
  rows: TableCell[][];
}): string | null {
  const lines = [table.columns.map((c) => c.name).join(' | ')];
  let chars = lines[0].length;
  for (const row of table.rows) {
    const line = row.map((cell) => cellText(cell, TABLE_CELL_MAX)).join(' | ');
    chars += line.length + 1;
    if (chars > FILE_TEXT_MAX_CHARS) return null;
    lines.push(line);
  }
  return tr('prompt.tableText', { name: table.name, text: lines.join('\n') });
}

/** Für Modelle ohne Werkzeuge, wenn die Tabelle zu groß zum Lesen ist. */
export function tableTooBigForModel(name: string, rows: number): string {
  return tr('prompt.tableTooBig', { name, rows });
}
