// Hintergrund-Thread: liest PDF und Word aus. Läuft getrennt vom Main-Prozess,
// damit große oder präparierte Dateien die App nicht blockieren – und damit
// LocalDesk einen hängenden Thread nach einer Zeitgrenze einfach beenden kann.
import { parentPort } from 'node:worker_threads';
import { extractDocx, extractPdf } from './extract';
import type { ExtractRequest, ExtractResponse } from './extractor';

parentPort?.on('message', async (request: ExtractRequest) => {
  let response: ExtractResponse;
  try {
    response =
      request.kind === 'pdf'
        ? { id: request.id, ok: true, pages: await extractPdf(request.bytes) }
        : { id: request.id, ok: true, text: await extractDocx(request.bytes) };
  } catch (error) {
    response = {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  parentPort?.postMessage(response);
});
