import type { Result } from '../../shared/api';
import { tr } from '../../shared/messages';
import { cleanFileName } from '../../shared/files';
import {
  isTableName,
  TABLE_MAX_BYTES,
  TABLE_MAX_ROWS,
} from '../../shared/tables';
import { decodeText } from '../rag/files';
import { detectDelimiter, parseCsv, type Delimiter } from './csv';
import { buildTable, type BuiltTable, type RawCell } from './table';
import { readXlsx, XlsxError } from './xlsx';

export const isTableFile = isTableName;

/**
 * Liest eine Tabelle aus den Bytes einer Datei: CSV/TSV (Trennzeichen und Zeichensatz werden
 * erkannt) oder Excel (.xlsx, erstes Blatt). Größe, Zeilen und Spalten werden geprüft.
 * Gibt die Tabelle mit Typen zurück oder einen fertigen Fehlertext. Läuft im Hintergrund-Thread.
 */
export function readTableFile(
  fileName: string,
  bytes: Uint8Array,
): Result<BuiltTable> {
  const name = cleanFileName(fileName);
  if (!isTableFile(name)) {
    return { ok: false, error: tr('tables.unsupported', { name }) };
  }
  if (bytes.byteLength > TABLE_MAX_BYTES) {
    return {
      ok: false,
      error: tr('tables.tooBig', { name, max: TABLE_MAX_BYTES / 1024 / 1024 }),
    };
  }
  let grid: RawCell[][];
  if (name.toLowerCase().endsWith('.xlsx')) {
    try {
      grid = readXlsx(bytes).rows;
    } catch (error) {
      const code = error instanceof XlsxError ? error.code : 'broken';
      return {
        ok: false,
        error:
          code === 'empty'
            ? tr('tables.empty', { name })
            : code === 'tooLarge'
              ? tr('tables.unpackedTooLarge', { name })
              : code === 'tooWide'
                ? tr('tables.tooManyColumns', { name, max: 200 })
                : tr('tables.broken', { name }),
      };
    }
  } else {
    const decoded = decodeText(bytes);
    if (!decoded.ok) return { ok: false, error: tr('tables.binary', { name }) };
    const delimiter: Delimiter = name.toLowerCase().endsWith('.tsv')
      ? '\t'
      : detectDelimiter(decoded.text);
    grid = parseCsv(decoded.text, delimiter, TABLE_MAX_ROWS + 2).rows;
  }
  return buildTable(name, grid);
}
