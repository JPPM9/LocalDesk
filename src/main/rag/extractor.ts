import { Worker } from 'node:worker_threads';
import { extractDocx, extractPdf } from './extract';
import { tr } from '../../shared/messages';

export type DocumentKind = 'pdf' | 'docx';

/** Ausgelesener Inhalt: PDF Seite für Seite, Word als Markdown. */
export type Extracted = { pages: string[] } | { text: string };

export interface Extractor {
  extract(kind: DocumentKind, bytes: Uint8Array): Promise<Extracted>;
  close(): void;
}

export interface ExtractRequest {
  id: number;
  kind: DocumentKind;
  bytes: Uint8Array;
}

export type ExtractResponse =
  | ({ id: number; ok: true } & Extracted)
  | { id: number; ok: false; error: string };

/** Länger darf das Auslesen einer Datei nicht dauern. */
export const EXTRACT_TIMEOUT_MS = 60_000;

/**
 * Liest im Hintergrund-Thread aus. Hängt eine Datei länger als die Zeitgrenze,
 * wird der Thread beendet und für die nächste Datei neu gestartet.
 */
export class WorkerExtractor implements Extractor {
  private worker: Worker | null = null;
  private nextId = 1;

  constructor(
    private readonly workerPath: string,
    private readonly timeoutMs = EXTRACT_TIMEOUT_MS,
  ) {}

  extract(kind: DocumentKind, bytes: Uint8Array): Promise<Extracted> {
    const worker = (this.worker ??= new Worker(this.workerPath));
    const id = this.nextId++;
    return new Promise<Extracted>((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        worker.off('message', onMessage);
        worker.off('error', onError);
      };
      const onMessage = (response: ExtractResponse) => {
        if (response.id !== id) return;
        finish();
        if (response.ok) {
          const { id: _id, ok: _ok, ...content } = response;
          resolve(content);
        } else {
          reject(new Error(response.error));
        }
      };
      const onError = (error: Error) => {
        finish();
        this.reset();
        reject(error);
      };
      const timer = setTimeout(() => {
        finish();
        this.reset();
        reject(
          new Error(
            tr('knowledge.readTimeout', { seconds: this.timeoutMs / 1000 }),
          ),
        );
      }, this.timeoutMs);
      worker.on('message', onMessage);
      worker.on('error', onError);
      worker.postMessage({ id, kind, bytes } satisfies ExtractRequest);
    });
  }

  close() {
    this.reset();
  }

  private reset() {
    void this.worker?.terminate();
    this.worker = null;
  }
}

/** Liest direkt im selben Thread – für Tests, wo es keinen gebauten Worker gibt. */
export const inlineExtractor: Extractor = {
  async extract(kind, bytes) {
    return kind === 'pdf'
      ? { pages: await extractPdf(bytes) }
      : { text: await extractDocx(bytes) };
  },
  close() {},
};
