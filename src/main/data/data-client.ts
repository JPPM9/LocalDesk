import { Worker } from 'node:worker_threads';
import type { Result } from '../../shared/api';
import { tr } from '../../shared/messages';
import type { BuiltTable } from './table';
import type { LoadTable, QueryResult } from './sql-session';

export type DataRequest =
  | { id: number; type: 'read'; name: string; bytes: Uint8Array }
  | { id: number; type: 'load'; tables: LoadTable[] }
  | { id: number; type: 'query'; sql: string; maxRows: number };

/** Ein Auftrag ohne Nummer (die vergibt `send`). */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

export type DataResponse =
  | { id: number; ok: true; table?: BuiltTable; result?: QueryResult }
  | { id: number; ok: false; error: string };

/** So lange darf das Lesen einer Datei und das Laden der Tabellen dauern. */
export const DATA_LOAD_TIMEOUT_MS = 60_000;
/** So lange darf eine Abfrage dauern – danach wird der Prozess beendet. */
export const DATA_QUERY_TIMEOUT_MS = 10_000;

/**
 * Was `DataWorker` vom Hintergrund-Prozess braucht (ein Node-`Worker` und ein Electron-`UtilityProcess`
 * können es beide). `terminate` muss wirklich beenden: Eine Abfrage steckt mitten in SQLite und ist
 * für einen Thread nicht unterbrechbar – darum läuft das in der App in einem eigenen Prozess.
 */
export interface WorkerHandle {
  postMessage(message: unknown): void;
  on(event: 'message', listener: (message: DataResponse) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  on(event: 'exit', listener: () => void): unknown;
  off(event: 'message', listener: (message: DataResponse) => void): unknown;
  off(event: 'error', listener: (error: Error) => void): unknown;
  off(event: 'exit', listener: () => void): unknown;
  terminate(): unknown;
}

/** Startet einen neuen Hintergrund-Prozess (oder Thread, in Tests). */
export type SpawnWorker = () => WorkerHandle;

/** Für Tests und Werkzeuge ohne Electron: ein Node-Thread. In der App: `processSpawn` (spawn.ts). */
export const threadSpawn =
  (workerPath: string): SpawnWorker =>
  () =>
    new Worker(workerPath) as unknown as WorkerHandle;

export interface DataWorkerOptions {
  loadTimeoutMs?: number;
  queryTimeoutMs?: number;
}

/**
 * Der Hintergrund-Prozess für Tabellen (data-worker.ts). Hängt ein Auftrag länger als die Zeitgrenze
 * oder stürzt der Prozess ab, wird er beendet und beim nächsten Auftrag neu gestartet – dann sind die
 * geladenen Tabellen weg (`loaded` ist wieder false) und müssen neu geladen werden.
 */
export class DataWorker {
  private worker: WorkerHandle | null = null;
  private nextId = 1;
  /** Sind die Tabellen im Prozess geladen (und der Prozess seitdem nicht neu gestartet)? */
  loaded = false;
  private readonly loadTimeoutMs: number;
  private readonly queryTimeoutMs: number;

  constructor(
    private readonly spawn: SpawnWorker,
    options: DataWorkerOptions = {},
  ) {
    this.loadTimeoutMs = options.loadTimeoutMs ?? DATA_LOAD_TIMEOUT_MS;
    this.queryTimeoutMs = options.queryTimeoutMs ?? DATA_QUERY_TIMEOUT_MS;
  }

  private send(
    request: WithoutId<DataRequest>,
    timeoutMs: number,
    timeoutText: string,
  ): Promise<DataResponse> {
    const worker = (this.worker ??= this.spawn());
    const id = this.nextId++;
    return new Promise<DataResponse>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        worker.off('message', onMessage);
        worker.off('error', onError);
        worker.off('exit', onExit);
      };
      const fail = (error: string) => {
        finish();
        this.reset();
        resolve({ id, ok: false, error });
      };
      const onMessage = (response: DataResponse) => {
        if (response.id !== id) return;
        finish();
        resolve(response);
      };
      const onError = (error: Error) => fail(error.message);
      const onExit = () => fail(tr('sql.workerStopped'));
      const timer = setTimeout(() => fail(timeoutText), timeoutMs);
      worker.on('message', onMessage);
      worker.on('error', onError);
      worker.on('exit', onExit);
      worker.postMessage({ ...request, id } as DataRequest);
    });
  }

  /** Liest eine Tabellendatei (CSV, TSV, Excel). */
  async read(name: string, bytes: Uint8Array): Promise<Result<BuiltTable>> {
    const response = await this.send(
      { type: 'read', name, bytes },
      this.loadTimeoutMs,
      tr('tables.timeout', { name }),
    );
    if (!response.ok) return { ok: false, error: response.error };
    return response.table
      ? { ok: true, value: response.table }
      : { ok: false, error: tr('tables.badInput') };
  }

  /** Lädt die Tabellen in die Abfrage-Datenbank (ersetzt, was vorher geladen war). */
  async load(tables: LoadTable[]): Promise<Result<null>> {
    this.loaded = false;
    const response = await this.send(
      { type: 'load', tables },
      this.loadTimeoutMs,
      tr('sql.loadTimeout'),
    );
    if (!response.ok) return { ok: false, error: response.error };
    this.loaded = true;
    return { ok: true, value: null };
  }

  /** Führt eine lesende Abfrage aus. Bei Zeitüberschreitung wird der Prozess beendet (`loaded` = false). */
  async query(sql: string, maxRows: number): Promise<Result<QueryResult>> {
    const response = await this.send(
      { type: 'query', sql, maxRows },
      this.queryTimeoutMs,
      tr('sql.timeout', { seconds: this.queryTimeoutMs / 1000 }),
    );
    if (!response.ok) return { ok: false, error: response.error };
    return response.result
      ? { ok: true, value: response.result }
      : { ok: false, error: tr('tables.badInput') };
  }

  private reset(): void {
    this.loaded = false;
    const worker = this.worker;
    this.worker = null;
    void worker?.terminate();
  }

  close(): void {
    this.reset();
  }
}
