import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollectionConfig, Result } from '../../src/shared/api';
import { openDatabase } from '../../src/main/db/database';
import { KnowledgeRepository } from '../../src/main/db/knowledge-repository';
import {
  buildKeywordQuery,
  fuseRanks,
  KnowledgeSearch,
} from '../../src/main/rag/search';
import { normalize } from '../../src/main/rag/vectors';

// Nachgebaute Fingerabdrücke: jede Stelle steht für ein Thema.
const TOPICS = ['miet', 'statist', 'koch', 'auto'];
const topicVector = (text: string) =>
  TOPICS.map((t) => (text.toLowerCase().includes(t) ? 1 : 0.05));

let repo: KnowledgeRepository;
let search: KnowledgeSearch;
let embed: ReturnType<
  typeof vi.fn<(model: string, input: string) => Promise<Result<number[]>>>
>;
let collection: CollectionConfig;

const addDoc = (
  collectionId: string,
  file: string,
  texts: string[],
  page?: number,
) =>
  repo.saveDocument(
    collectionId,
    { path: `C:\\docs\\${file}`, size: 1, mtime: 1, hash: file, status: 'ok' },
    texts.map((text, i) => ({
      chunk: {
        text,
        start: i,
        end: i + 1,
        heading: file,
        ...(page && { page }),
      },
      vector: normalize(topicVector(text)),
    })),
  );

beforeEach(() => {
  repo = new KnowledgeRepository(openDatabase(':memory:'));
  repo.saveCollection(
    {
      id: 'k',
      name: 'Verträge',
      sources: [{ kind: 'folder', path: 'C:\\docs' }],
    },
    'qwen3-embedding:0.6b',
  );
  collection = repo.getCollection('k')!;
  addDoc('k', 'mietvertrag.md', [
    'Mietvertrag: Die Kündigungsfrist beträgt drei Monate.',
    'Mietvertrag: Stellplatz Nr. 7 gehört zur Wohnung.',
  ]);
  addDoc('k', 'skript.pdf', ['Statistik: Der Median ist robust.'], 12);
  addDoc('k', 'rezept.txt', ['Kochen: Kartoffeln 20 Minuten kochen.']);
  embed = vi.fn(
    async (_model: string, input: string): Promise<Result<number[]>> => ({
      ok: true,
      value: topicVector(input),
    }),
  );
  search = new KnowledgeSearch({ repo, embed });
});

describe('KnowledgeSearch', () => {
  it('findet passende Stellen und nummeriert sie für das Modell', async () => {
    const result = await search.search(
      [collection],
      'Wann kann ich den Mietvertrag kündigen?',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((s) => [s.n, s.text.slice(0, 12)])).toEqual([
      [1, 'Mietvertrag:'],
      [2, 'Mietvertrag:'],
    ]);
    expect(result.value[0]).toMatchObject({
      collectionName: 'Verträge',
      path: 'C:\\docs\\mietvertrag.md',
      heading: 'mietvertrag.md',
    });
  });

  it('stellt die Anweisung für Qwen3-Embedding vor die Frage', async () => {
    await search.search([collection], 'Median?');
    expect(embed.mock.calls[0][1]).toMatch(/^Instruct: .*\nQuery: Median\?$/);
  });

  it('liefert die Seitenzahl bei PDFs', async () => {
    const result = await search.search(
      [collection],
      'Was sagt die Statistik zum Median?',
    );
    expect(result.ok && result.value[0]).toMatchObject({
      page: 12,
      path: 'C:\\docs\\skript.pdf',
    });
  });

  it('lässt unpassende Stellen weg statt sie aufzufüllen', async () => {
    const result = await search.search(
      [collection],
      'Wie wechsle ich Reifen am Auto?',
    );
    expect(result).toEqual({ ok: true, value: [] });
  });

  it('bringt exakte Stichworte nach vorne, wenn die Bedeutung nicht unterscheidet', async () => {
    // „Stellplatz“ gehört zu keinem nachgebauten Thema → alle Abschnitte gleich ähnlich.
    const result = await search.search(
      [collection],
      'Wo ist der Stellplatz Nr. 7?',
    );
    expect(result.ok && result.value[0].text).toContain('Stellplatz Nr. 7');
  });

  it('meldet Fehler beim Einbetten (z. B. Modell fehlt)', async () => {
    embed.mockResolvedValueOnce({ ok: false, error: "model 'x' not found" });
    expect(await search.search([collection], 'Miete?')).toEqual({
      ok: false,
      error: "model 'x' not found",
    });
  });

  it('lädt neu, wenn sich die Sammlung geändert hat', async () => {
    await search.search([collection], 'Kochen?');
    addDoc('k', 'auto.md', ['Auto: Reifen wechseln im Oktober.']);
    const result = await search.search(
      [collection],
      'Wie wechsle ich Reifen am Auto?',
    );
    expect(result.ok && result.value.map((s) => s.path)).toEqual([
      'C:\\docs\\auto.md',
    ]);
  });

  it('durchsucht nur die gewählten Sammlungen', async () => {
    repo.saveCollection(
      { id: 'k2', name: 'Autos', sources: [] },
      'qwen3-embedding:0.6b',
    );
    addDoc('k2', 'auto.md', ['Auto: Reifen wechseln im Oktober.']);
    const result = await search.search([collection], 'Auto Reifen');
    expect(result).toEqual({ ok: true, value: [] });
  });

  it('sucht nichts ohne Sammlungen oder Frage', async () => {
    expect(await search.search([], 'Miete')).toEqual({ ok: true, value: [] });
    expect(await search.search([collection], '  ')).toEqual({
      ok: true,
      value: [],
    });
    expect(embed).not.toHaveBeenCalled();
  });
});

describe('fuseRanks', () => {
  it('bevorzugt, was in beiden Listen weit oben steht', () => {
    expect(
      fuseRanks([
        [1, 2, 3],
        [3, 1, 4],
      ]),
    ).toEqual([1, 3, 2, 4]);
  });
});

describe('buildKeywordQuery', () => {
  it('nimmt sinnvolle Wörter einzeln und lässt Füllwörter weg', () => {
    expect(
      buildKeywordQuery('Wie lange vorher muss ich die Wohnung kündigen?'),
    ).toBe('"lange"* OR "vorher"* OR "wohnung"* OR "kündigen"*');
  });

  it('behält Zahlen und macht Sonderzeichen unschädlich', () => {
    expect(buildKeywordQuery('Stellplatz Nr. 7 OR "x"* -y')).toBe(
      '"stellplatz"* OR "7"*',
    );
    expect(buildKeywordQuery('Wie ist das?')).toBeNull();
  });
});
