import type { CollectionConfig, Result, SourceRef } from '../../shared/api';
import { contentWords } from '../../shared/knowledge';
import type {
  KnowledgeRepository,
  StoredChunk,
} from '../db/knowledge-repository';
import { fromBlob, normalize, queryText, similarity } from './vectors';

/** So viele Textstellen bekommt das Modell höchstens (6 × ~400 Tokens ≈ 2500 Tokens). */
export const KNOWLEDGE_TOP_K = 6;
/** Aus jeder Suche kommen so viele Kandidaten in die Zusammenführung. */
const CANDIDATES = 30;
/** Übliche Konstante bei Reciprocal Rank Fusion: dämpft den Vorsprung von Platz 1. */
const RRF_K = 60;

/**
 * Untergrenzen für die Ähnlichkeit, gemessen mit qwen3-embedding:0.6b an 16 Fragen
 * (Deutsch/Englisch, PDF/Word/Markdown): richtige Stellen ab 0,43, Fragen ohne
 * Antwort höchstens 0,22. Außerdem muss ein Treffer nah am besten liegen – sonst
 * bekäme das Modell zu passenden Stellen noch unpassende dazu. Stichwort-Treffer
 * (exakter Begriff gefunden) dürfen etwas weiter vom besten entfernt sein.
 */
export const MIN_SIMILARITY = 0.35;
export const RELATIVE_TO_BEST = 0.7;
export const KEYWORD_RELATIVE_TO_BEST = 0.5;

type ChunkInfo = Omit<StoredChunk, 'vector'>;

interface Entry {
  chunk: ChunkInfo;
  vector: Float32Array;
}

export interface SearchDeps {
  repo: KnowledgeRepository;
  /** Fingerabdruck einer Suchanfrage mit dem Modell der Sammlung. */
  embed: (model: string, input: string) => Promise<Result<number[]>>;
}

/**
 * Hält die Fingerabdrücke der Sammlungen im Speicher (20 000 Abschnitte ≈ 80 MB),
 * damit nicht jede Frage alles aus der Datenbank lesen muss. Ändert sich etwas
 * (`repo.version`), wird neu geladen.
 */
export class KnowledgeSearch {
  private cache = new Map<string, Entry[]>();
  private cacheVersion = -1;

  constructor(private readonly deps: SearchDeps) {}

  /**
   * Sucht passende Textstellen: Fingerabdruck-Suche (Bedeutung) und Stichwortsuche
   * (Namen, Nummern, Fachbegriffe), zusammengeführt per Reciprocal Rank Fusion.
   */
  async search(
    collections: CollectionConfig[],
    question: string,
    k = KNOWLEDGE_TOP_K,
  ): Promise<Result<SourceRef[]>> {
    const { repo, embed } = this.deps;
    if (collections.length === 0 || !question.trim()) {
      return { ok: true, value: [] };
    }

    // Sammlungen können unterschiedliche Embedding-Modelle haben – pro Modell einbetten.
    const scored = new Map<
      number,
      { entry: Entry; collection: CollectionConfig; similarity: number }
    >();
    for (const [model, group] of groupByModel(collections)) {
      const query = await embed(model, queryText(model, question));
      if (!query.ok) return query;
      const q = normalize(query.value);
      for (const collection of group) {
        for (const entry of this.entries(collection.id)) {
          scored.set(entry.chunk.id, {
            entry,
            collection,
            similarity: similarity(q, entry.vector),
          });
        }
      }
    }
    if (scored.size === 0) return { ok: true, value: [] };

    const byMeaning = [...scored.values()]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, CANDIDATES)
      .map((s) => s.entry.chunk.id);
    const keywordQuery = buildKeywordQuery(question);
    const byKeyword = keywordQuery
      ? repo.keywordSearch(
          collections.map((c) => c.id),
          keywordQuery,
          CANDIDATES,
        )
      : [];

    const best = scored.get(byMeaning[0])!.similarity;
    const minimum = Math.max(MIN_SIMILARITY, best * RELATIVE_TO_BEST);
    const keywordMinimum = Math.max(
      MIN_SIMILARITY,
      best * KEYWORD_RELATIVE_TO_BEST,
    );
    const keywordHits = new Set(byKeyword);
    const fused = fuseRanks([byMeaning, byKeyword])
      .map((id) => scored.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
      .filter(
        (s) =>
          s.similarity >=
          (keywordHits.has(s.entry.chunk.id) ? keywordMinimum : minimum),
      )
      .slice(0, k);

    return {
      ok: true,
      value: fused.map(({ entry, collection, similarity: score }, i) => ({
        n: i + 1,
        collectionId: collection.id,
        collectionName: collection.name,
        documentId: entry.chunk.documentId,
        path: entry.chunk.path,
        ...(entry.chunk.page !== null && { page: entry.chunk.page }),
        ...(entry.chunk.heading !== null && { heading: entry.chunk.heading }),
        text: entry.chunk.text,
        score,
      })),
    };
  }

  private entries(collectionId: string): Entry[] {
    if (this.cacheVersion !== this.deps.repo.version) {
      this.cache.clear();
      this.cacheVersion = this.deps.repo.version;
    }
    let entries = this.cache.get(collectionId);
    if (!entries) {
      entries = this.deps.repo
        .chunks(collectionId)
        .map(({ vector, ...chunk }) => ({
          chunk,
          vector: fromBlob(vector),
        }));
      this.cache.set(collectionId, entries);
    }
    return entries;
  }
}

function groupByModel(collections: CollectionConfig[]) {
  const groups = new Map<string, CollectionConfig[]>();
  for (const c of collections) {
    groups.set(c.embeddingModel, [...(groups.get(c.embeddingModel) ?? []), c]);
  }
  return groups;
}

/**
 * Reciprocal Rank Fusion: Jede Liste vergibt 1/(60 + Platz) Punkte. Wer in beiden
 * Listen weit oben steht, gewinnt – ohne dass man Ähnlichkeit und Stichwort-Punkte
 * (verschiedene Skalen) gegeneinander gewichten muss.
 */
export function fuseRanks(lists: number[][]): number[] {
  const points = new Map<number, number>();
  for (const list of lists) {
    list.forEach((id, index) => {
      points.set(id, (points.get(id) ?? 0) + 1 / (RRF_K + index + 1));
    });
  }
  return [...points.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/**
 * Stichwort-Abfrage für eine Frage: sinnvolle Wörter einzeln (ODER), jeweils als
 * Wortanfang. Jedes Wort steht in Anführungszeichen – so werden Zeichen wie `-`
 * oder `*` aus der Frage nie als Suchbefehle gelesen. Null = nichts zu suchen.
 */
export function buildKeywordQuery(question: string): string | null {
  const words = contentWords(question).slice(0, 12);
  if (words.length === 0) return null;
  return words.map((w) => `"${w}"*`).join(' OR ');
}
