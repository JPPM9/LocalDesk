import type { Result } from '../shared/api';
import { cleanFileName } from '../shared/files';
import { tr } from '../shared/messages';
import { TABLE_MAX_BYTES, type ReadChatTable } from '../shared/tables';
import type { DataWorker } from './data/data-client';
import { isTableFile } from './data/read-table-file';
import type { PendingTables } from './data/pending-tables';

const NAME_MAX = 300;

/**
 * Liest eine Tabellendatei (CSV, TSV, Excel) für eine Nachricht. Gelesen wird in einem
 * Hintergrund-Thread; das Ergebnis bleibt im Hauptprozess (`pending`), die Oberfläche bekommt nur
 * Name, Zeilen- und Spaltenzahl und eine Nummer.
 */
export async function readChatTable(
  name: unknown,
  data: unknown,
  makeWorker: () => DataWorker,
  pending: PendingTables,
): Promise<Result<ReadChatTable>> {
  const bytes =
    data instanceof Uint8Array
      ? data
      : data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : null;
  if (typeof name !== 'string' || name.length > NAME_MAX || !bytes) {
    return { ok: false, error: tr('tables.badInput') };
  }
  const clean = cleanFileName(name);
  if (!isTableFile(clean)) {
    return { ok: false, error: tr('tables.unsupported', { name: clean }) };
  }
  if (bytes.byteLength > TABLE_MAX_BYTES) {
    return {
      ok: false,
      error: tr('tables.tooBig', {
        name: clean,
        max: TABLE_MAX_BYTES / 1024 / 1024,
      }),
    };
  }
  const worker = makeWorker();
  try {
    const result = await worker.read(clean, bytes);
    if (!result.ok) return result;
    const { columns, rows } = result.value;
    const id = pending.add({ name: clean, columns, rows });
    return {
      ok: true,
      value: { id, name: clean, rows: rows.length, columns: columns.length },
    };
  } finally {
    worker.close();
  }
}
