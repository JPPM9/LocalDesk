import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { WorkerExtractor } from '../../src/main/rag/extractor';

// Kleine Ersatz-Worker als echte Dateien: einer hängt bei „haengt“, sonst antwortet er.
const dir = mkdtempSync(path.join(tmpdir(), 'localdesk-worker-'));
const workerFile = path.join(dir, 'worker.cjs');
writeFileSync(
  workerFile,
  `const { parentPort } = require('node:worker_threads');
   parentPort.on('message', (req) => {
     const text = new TextDecoder().decode(req.bytes);
     if (text === 'haengt') return; // simuliert eine Datei, an der der Parser hängen bleibt
     if (text === 'kaputt') return parentPort.postMessage({ id: req.id, ok: false, error: 'Invalid PDF structure.' });
     parentPort.postMessage({ id: req.id, ok: true, pages: [text] });
   });`,
);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const bytes = (text: string) => new TextEncoder().encode(text);

describe('WorkerExtractor', () => {
  it('liefert das Ergebnis aus dem Hintergrund-Thread', async () => {
    const extractor = new WorkerExtractor(workerFile);
    expect(await extractor.extract('pdf', bytes('Seite'))).toEqual({
      pages: ['Seite'],
    });
    extractor.close();
  });

  it('meldet Fehler des Parsers', async () => {
    const extractor = new WorkerExtractor(workerFile);
    await expect(extractor.extract('pdf', bytes('kaputt'))).rejects.toThrow(
      'Invalid PDF structure.',
    );
    extractor.close();
  });

  it('bricht hängende Dateien nach der Zeitgrenze ab und arbeitet danach weiter', async () => {
    const extractor = new WorkerExtractor(workerFile, 300);
    await expect(extractor.extract('pdf', bytes('haengt'))).rejects.toThrow(
      'Zeitüberschreitung',
    );
    // Neuer Thread für die nächste Datei
    expect(await extractor.extract('pdf', bytes('weiter'))).toEqual({
      pages: ['weiter'],
    });
    extractor.close();
  });
});
