import { constants, DatabaseSync } from 'node:sqlite';
import { tr } from '../../shared/messages';
import type { ColumnType, TableCell, TableColumn } from '../../shared/tables';

/**
 * Die Abfrage-Datenbank für Tabellen im Chat: eine kleine Datenbank im Speicher, in die die
 * angehängten Tabellen geladen werden. Das Modell darf nur LESEN – das erzwingt der Wächter
 * von SQLite (`setAuthorizer`): erlaubt sind nur SELECT, das Lesen von Spalten und Funktionen.
 * Alles andere (INSERT, DROP, ATTACH, PRAGMA, sqlite_master …) wird von SQLite selbst abgelehnt.
 * Läuft in einem Hintergrund-Thread (siehe data-worker.ts), damit eine endlose Abfrage die App
 * nicht anhält.
 */

export interface LoadTable {
  /** Name der Tabelle in SQL. */
  sqlName: string;
  columns: TableColumn[];
  rows: TableCell[][];
}

export interface QueryResult {
  columns: string[];
  rows: TableCell[][];
  /** Es gab mehr Zeilen als `maxRows` – der Rest wurde nicht gelesen. */
  more: boolean;
}

/** Ein Fehler mit fertigem Text für das Modell. */
export class SqlError extends Error {}

const SQL_TYPES: Record<ColumnType, string> = {
  integer: 'INTEGER',
  real: 'REAL',
  date: 'TEXT',
  text: 'TEXT',
};

/** So lang darf eine Abfrage sein. */
export const SQL_MAX_CHARS = 10_000;
/** Längste Zelle im Ergebnis (Zeichen) – danach gekürzt. */
export const RESULT_CELL_MAX = 500;
/** Funktionen, die nie laufen dürfen. */
const DENIED_FUNCTIONS = new Set(['load_extension', 'readfile', 'writefile']);

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

/**
 * Prüft, dass genau EINE Anweisung dasteht (ein „;“ am Ende ist erlaubt), und gibt sie ohne
 * Strichpunkt zurück. Strichpunkte in Texten, Namen und Kommentaren zählen nicht.
 */
export function singleStatement(sql: string): string {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inBracket = false;
  let inLine = false;
  let inBlock = false;
  let end = -1;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next = sql[i + 1];
    if (inLine) {
      if (c === '\n') inLine = false;
    } else if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false;
        i++;
      }
    } else if (inSingle) {
      if (c === "'") inSingle = false;
    } else if (inDouble) {
      if (c === '"') inDouble = false;
    } else if (inBacktick) {
      if (c === '`') inBacktick = false;
    } else if (inBracket) {
      if (c === ']') inBracket = false;
    } else if (c === '-' && next === '-') {
      inLine = true;
    } else if (c === '/' && next === '*') {
      inBlock = true;
    } else if (c === "'") inSingle = true;
    else if (c === '"') inDouble = true;
    else if (c === '`') inBacktick = true;
    else if (c === '[') inBracket = true;
    else if (c === ';') {
      if (
        sql
          .slice(i + 1)
          .replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '')
          .trim() !== ''
      ) {
        throw new SqlError(tr('sql.oneStatement'));
      }
      end = i;
      break;
    }
  }
  return (end >= 0 ? sql.slice(0, end) : sql).trim();
}

function toCell(value: unknown): TableCell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') {
    return value >= BigInt(Number.MIN_SAFE_INTEGER) &&
      value <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (typeof value === 'string') {
    return value.length > RESULT_CELL_MAX
      ? `${value.slice(0, RESULT_CELL_MAX)}…`
      : value;
  }
  return tr('sql.binary');
}

export class SqlSession {
  private db: DatabaseSync | null = null;

  /** Erzeugt die Datenbank neu und lädt die Tabellen. Ersetzt, was vorher geladen war. */
  load(tables: LoadTable[]): void {
    this.close();
    const db = new DatabaseSync(':memory:', {
      limits: {
        length: 1_000_000,
        sqlLength: SQL_MAX_CHARS,
        exprDepth: 50,
        compoundSelect: 20,
      },
    });
    for (const table of tables) {
      const columns = table.columns
        .map((c) => `${quote(c.name)} ${SQL_TYPES[c.type]}`)
        .join(', ');
      db.exec(`CREATE TABLE ${quote(table.sqlName)} (${columns})`);
      const insert = db.prepare(
        `INSERT INTO ${quote(table.sqlName)} VALUES (${table.columns.map(() => '?').join(', ')})`,
      );
      db.exec('BEGIN');
      try {
        for (const row of table.rows) insert.run(...row);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    // Ab jetzt nur noch lesen.
    db.setAuthorizer((action, arg1) => {
      if (
        action === constants.SQLITE_SELECT ||
        action === constants.SQLITE_RECURSIVE
      ) {
        return constants.SQLITE_OK;
      }
      if (action === constants.SQLITE_READ) {
        // Die Systemtabellen (sqlite_master …) gehören nicht zu deinen Daten.
        return typeof arg1 === 'string' &&
          arg1.toLowerCase().startsWith('sqlite_')
          ? constants.SQLITE_DENY
          : constants.SQLITE_OK;
      }
      if (action === constants.SQLITE_FUNCTION) {
        return typeof arg1 === 'string' &&
          DENIED_FUNCTIONS.has(arg1.toLowerCase())
          ? constants.SQLITE_DENY
          : constants.SQLITE_OK;
      }
      return constants.SQLITE_DENY;
    });
    this.db = db;
  }

  /**
   * Führt EINE lesende Abfrage aus. Liest höchstens `maxRows` Zeilen (danach `more`). Wirft
   * `SqlError` mit fertigem Text (Fehler in der Abfrage, nicht erlaubte Anweisung).
   */
  query(sql: unknown, maxRows: number): QueryResult {
    if (!this.db) throw new SqlError(tr('sql.noTables'));
    if (typeof sql !== 'string' || sql.trim() === '') {
      throw new SqlError(tr('sql.empty'));
    }
    if (sql.length > SQL_MAX_CHARS) {
      throw new SqlError(tr('sql.tooLong', { max: SQL_MAX_CHARS }));
    }
    const statement = singleStatement(sql);
    if (
      !/^(select|with|values)\b/i.test(
        statement.replace(/^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/, ''),
      )
    ) {
      throw new SqlError(tr('sql.onlySelect'));
    }
    try {
      const prepared = this.db.prepare(statement);
      prepared.setReadBigInts(true);
      prepared.setReturnArrays(true);
      const columns = prepared.columns().map((c) => c.name);
      const rows: TableCell[][] = [];
      let more = false;
      for (const row of prepared.iterate()) {
        if (rows.length >= maxRows) {
          more = true;
          break;
        }
        rows.push((row as unknown as unknown[]).map(toCell));
      }
      return { columns, rows, more };
    } catch (error) {
      throw new SqlError(describeSqlError(error));
    }
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

/** Die Meldung von SQLite für das Modell: nicht erlaubtes Schreiben bekommt einen eigenen Text. */
function describeSqlError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/not authorized|authoriz|prohibited/i.test(message))
    return tr('sql.notAllowed');
  return tr('sql.error', { message: message.slice(0, 300) });
}
