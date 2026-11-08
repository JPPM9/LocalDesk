// Hintergrund-Prozess für Tabellen: liest CSV/TSV/Excel und beantwortet SQL-Abfragen. Läuft getrennt
// vom Hauptprozess, damit große Dateien und endlose Abfragen die App nicht anhalten – und damit
// LocalDesk den Prozess nach einer Zeitgrenze hart beenden kann (siehe spawn.ts). In Tests läuft
// dieselbe Datei als Node-Thread.
import { parentPort } from 'node:worker_threads';
import { readTableFile } from './read-table-file';
import { SqlError, SqlSession } from './sql-session';
import type { DataRequest, DataResponse } from './data-client';

/** Der Kanal zum Hauptprozess: in Electron `process.parentPort`, im Thread `parentPort`. */
interface Channel {
  listen(handler: (request: DataRequest) => void): void;
  reply(response: DataResponse): void;
}

function openChannel(): Channel | null {
  const utility = (
    process as unknown as {
      parentPort?: {
        on(
          event: 'message',
          listener: (event: { data: DataRequest }) => void,
        ): void;
        postMessage(message: unknown): void;
      };
    }
  ).parentPort;
  if (utility) {
    return {
      listen: (handler) =>
        utility.on('message', (event) => handler(event.data)),
      reply: (response) => utility.postMessage(response),
    };
  }
  if (parentPort) {
    return {
      listen: (handler) => parentPort!.on('message', handler),
      reply: (response) => parentPort!.postMessage(response),
    };
  }
  return null;
}

const session = new SqlSession();

function handle(request: DataRequest): DataResponse {
  try {
    if (request.type === 'read') {
      const result = readTableFile(request.name, request.bytes);
      return result.ok
        ? { id: request.id, ok: true, table: result.value }
        : { id: request.id, ok: false, error: result.error };
    }
    if (request.type === 'load') {
      session.load(request.tables);
      return { id: request.id, ok: true };
    }
    return {
      id: request.id,
      ok: true,
      result: session.query(request.sql, request.maxRows),
    };
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error:
        error instanceof SqlError || error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

const channel = openChannel();
channel?.listen((request) => channel.reply(handle(request)));
