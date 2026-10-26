import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndexProgress, Result } from '../../src/shared/api';
import { openDatabase } from '../../src/main/db/database';
import { KnowledgeRepository } from '../../src/main/db/knowledge-repository';
import { indexCollection } from '../../src/main/rag/indexer';

let root: string;
let repo: KnowledgeRepository;
let embedded: string[];

const write = (relative: string, content: string | Uint8Array) => {
  const full = path.join(root, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
  return full;
};

/** Ein Fake-Embedding: merkt sich die Texte und liefert einfache Vektoren. */
const fakeEmbed = vi.fn(
  async (inputs: string[]): Promise<Result<number[][]>> => {
    embedded.push(...inputs);
    return { ok: true, value: inputs.map((t) => [t.length, 1, 0]) };
  },
);

async function run(
  embed = fakeEmbed,
  signal = new AbortController().signal,
): Promise<{ final: IndexProgress; events: IndexProgress[] }> {
  const events: IndexProgress[] = [];
  const collection = repo.getCollection('k')!;
  const final = await indexCollection(collection, {
    repo,
    embed,
    onProgress: (p) => events.push(p),
    signal,
  });
  return { final, events };
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'localdesk-index-'));
  repo = new KnowledgeRepository(openDatabase(':memory:'));
  repo.saveCollection(
    { id: 'k', name: 'Test', sources: [{ kind: 'folder', path: root }] },
    'qwen3-embedding:0.6b',
  );
  embedded = [];
  fakeEmbed.mockClear();
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('indexCollection', () => {
  it('liest neue Dateien ein, mit Dateiname und Überschrift als Zusammenhang', async () => {
    write('notiz.md', '# Einkauf\n\nMilch und Brot.');
    write('code/app.ts', 'export const x = 1;');

    const { final, events } = await run();

    expect(final).toMatchObject({
      phase: 'done',
      added: 2,
      updated: 0,
      unchanged: 0,
      removed: 0,
    });
    expect(events.map((e) => e.phase)).toContain('scanning');
    expect(events.at(-2)).toMatchObject({
      phase: 'indexing',
      done: 2,
      total: 2,
    });
    expect(embedded).toContain(
      'notiz.md › Einkauf\n\n# Einkauf\n\nMilch und Brot.',
    );
    expect(embedded).toContain('app.ts\n\nexport const x = 1;');
    expect(repo.stats('k')).toMatchObject({ documents: 2, chunks: 2 });
    expect(repo.stats('k').indexedAt).toBeGreaterThan(0);
  });

  it('rechnet beim zweiten Mal nur Geändertes neu und entfernt Gelöschtes', async () => {
    const a = write('a.md', 'Alt');
    write('b.md', 'Bleibt');
    const c = write('c.md', 'Wird gelöscht');
    await run();
    embedded = [];

    writeFileSync(a, 'Neu und länger');
    rmSync(c);
    write('d.md', 'Ganz neu');
    const { final } = await run();

    expect(final).toMatchObject({
      added: 1,
      updated: 1,
      unchanged: 1,
      removed: 1,
    });
    expect(embedded.map((t) => t.split('\n\n')[1])).toEqual(
      expect.arrayContaining(['Neu und länger', 'Ganz neu']),
    );
    expect(embedded).toHaveLength(2);
    expect(repo.listDocuments('k').map((d) => path.basename(d.path))).toEqual([
      'a.md',
      'b.md',
      'd.md',
    ]);
  });

  it('erkennt an der Prüfsumme, wenn sich nur die Änderungszeit geändert hat', async () => {
    const a = write('a.md', 'Gleich');
    await run();
    embedded = [];
    utimesSync(a, new Date(), new Date(Date.now() + 60_000));

    const { final } = await run();

    expect(final).toMatchObject({ unchanged: 1, updated: 0 });
    expect(embedded).toEqual([]);
  });

  it('markiert leere, binäre und zu große Dateien statt abzubrechen', async () => {
    write('leer.md', '   \n ');
    write('binaer.txt', new Uint8Array([1, 0, 2, 0]));
    write('gut.md', 'Inhalt');

    const { final } = await run();

    expect(final.phase).toBe('done');
    expect(
      repo
        .listDocuments('k')
        .map((d) => [path.basename(d.path), d.status, d.error]),
    ).toEqual([
      ['binaer.txt', 'skipped', 'Keine Textdatei (Binärdaten)'],
      ['gut.md', 'ok', undefined],
      ['leer.md', 'empty', undefined],
    ]);
    expect(repo.stats('k').problems).toBe(1);
  });

  it('stoppt mit klarer Meldung, wenn das Einbetten nicht geht (z. B. Ollama aus)', async () => {
    write('a.md', 'A');
    write('b.md', 'B');
    const failing = vi.fn(async (): Promise<Result<number[][]>> => ({
      ok: false,
      error: 'Nicht erreichbar – läuft Ollama?',
    }));

    const { final } = await run(failing);

    expect(final).toMatchObject({
      phase: 'error',
      error: 'Nicht erreichbar – läuft Ollama?',
    });
    expect(failing).toHaveBeenCalledOnce(); // nicht 500-mal scheitern
    expect(repo.stats('k').documents).toBe(0);
    expect(repo.stats('k').indexedAt).toBeUndefined();
  });

  it('lässt sich abbrechen; Fertiges bleibt, der Rest kommt beim nächsten Mal', async () => {
    write('a.md', 'A');
    write('b.md', 'B');
    write('c.md', 'C');
    const controller = new AbortController();
    const embed = vi.fn(
      async (inputs: string[]): Promise<Result<number[][]>> => {
        controller.abort(); // nach der ersten Datei abbrechen
        return { ok: true, value: inputs.map(() => [1, 0]) };
      },
    );

    const { final } = await run(embed, controller.signal);

    expect(final.phase).toBe('aborted');
    expect(repo.stats('k').documents).toBe(0); // Abbruch mitten in Datei 1 → nichts halb gespeichert
    const again = await run();
    expect(again.final).toMatchObject({ phase: 'done', added: 3 });
  });

  it('behält Dokumente einer Quelle, die gerade nicht erreichbar ist', async () => {
    const usb = mkdtempSync(path.join(tmpdir(), 'localdesk-usb-'));
    writeFileSync(path.join(usb, 'stick.md'), 'Vom Stick');
    repo.saveCollection(
      {
        id: 'k',
        name: 'Test',
        sources: [
          { kind: 'folder', path: root },
          { kind: 'folder', path: usb },
        ],
      },
      'm',
    );
    write('a.md', 'A');
    await run();
    rmSync(usb, { recursive: true, force: true }); // „Stick abgezogen“

    const { final } = await run();

    expect(final).toMatchObject({ phase: 'done', removed: 0 });
    expect(final.error).toContain('Nicht gefunden');
    expect(repo.stats('k').documents).toBe(2);
  });

  it('versucht fehlerhafte Dateien beim nächsten Mal erneut', async () => {
    write('a.md', 'A');
    let fail = true;
    const flaky = vi.fn(
      async (inputs: string[]): Promise<Result<number[][]>> =>
        fail
          ? { ok: false, error: 'kurz weg' }
          : { ok: true, value: inputs.map(() => [1]) },
    );
    await run(flaky);
    fail = false;
    const { final } = await run(flaky);
    expect(final).toMatchObject({ phase: 'done', added: 1 });
  });
});
