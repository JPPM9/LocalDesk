import path from 'node:path';
import type { CollectionConfig, IndexProgress, Result } from '../../shared/api';
import type {
  DocumentInput,
  KnowledgeRepository,
} from '../db/knowledge-repository';
import { chunkMarkdown, chunkText, embeddingText, type Chunk } from './chunk';
import type { Extractor } from './extractor';
import {
  readDocument,
  scanSources,
  type DocumentRead,
  type FoundFile,
} from './files';
import { normalize } from './vectors';

/** So viele Abschnitte gehen pro Anfrage an Ollama. */
const EMBED_BATCH = 16;

export interface IndexDeps {
  repo: KnowledgeRepository;
  /** Berechnet Fingerabdrücke mit dem Modell der Sammlung. */
  embed: (inputs: string[], signal: AbortSignal) => Promise<Result<number[][]>>;
  onProgress: (progress: IndexProgress) => void;
  signal: AbortSignal;
  /** Liest PDF und Word aus (in der App im Hintergrund-Thread). */
  extractor: Extractor;
}

/** Ein Fehler, der alle Dateien betrifft (Ollama aus, Modell fehlt) → Einlesen stoppen. */
class EmbedError extends Error {}

/**
 * Liest eine Sammlung ein: neue und geänderte Dateien werden (neu) berechnet,
 * gelöschte entfernt, unveränderte übersprungen. Fehler einer einzelnen Datei
 * landen bei der Datei; Fehler beim Einbetten stoppen alles.
 */
export async function indexCollection(
  collection: CollectionConfig,
  { repo, embed, onProgress, signal, extractor }: IndexDeps,
): Promise<IndexProgress> {
  let progress: IndexProgress = {
    collectionId: collection.id,
    phase: 'scanning',
    total: 0,
    done: 0,
  };
  const report = (patch: Partial<IndexProgress>) => {
    progress = { ...progress, ...patch };
    onProgress(progress);
  };
  report({});

  try {
    const scan = await scanSources(collection.sources);
    const known = repo.knownDocuments(collection.id);
    const foundKeys = new Set(scan.files.map((f) => f.path.toLowerCase()));

    // Gelöschte Dateien entfernen – außer ihre Quelle ist gerade nicht erreichbar.
    const missing = scan.missing.map((m) => m.toLowerCase());
    const removed = [...known.entries()]
      .filter(([filePath]) => {
        const key = filePath.toLowerCase();
        return (
          !foundKeys.has(key) &&
          !missing.some((m) => key === m || key.startsWith(m + path.sep))
        );
      })
      .map(([, doc]) => doc.id);
    repo.removeDocuments(removed);

    // Ohne Änderung an Größe und Zeit gilt eine Datei als unverändert.
    const todo = scan.files.filter((file) => {
      const doc = known.get(file.path);
      return (
        !doc ||
        doc.size !== file.size ||
        doc.mtime !== file.mtime ||
        doc.status === 'error'
      );
    });

    let added = 0;
    let updated = 0;
    let unchanged = scan.files.length - todo.length;
    report({ phase: 'indexing', total: todo.length });

    for (const file of todo) {
      signal.throwIfAborted();
      report({ current: file.path });
      const before = known.get(file.path);
      const outcome = await indexFile(file, before?.hash, {
        repo,
        embed,
        signal,
        extractor,
        collectionId: collection.id,
      });
      if (outcome === 'unchanged') {
        repo.touchDocument(before!.id, file.mtime);
        unchanged++;
      } else if (before) {
        updated++;
      } else {
        added++;
      }
      report({ done: progress.done + 1 });
    }

    repo.setIndexedAt(collection.id);
    report({
      phase: 'done',
      current: undefined,
      added,
      updated,
      unchanged,
      removed: removed.length,
      ...(scan.missing.length > 0 && {
        error: `Nicht gefunden: ${scan.missing.join(', ')}`,
      }),
      ...(scan.truncated && {
        error: 'Mehr als 10 000 Dateien – der Rest wurde nicht eingelesen.',
      }),
    });
  } catch (error) {
    if (signal.aborted) {
      report({ phase: 'aborted', current: undefined });
    } else {
      report({
        phase: 'error',
        current: undefined,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return progress;
}

async function indexFile(
  file: FoundFile,
  previousHash: string | undefined,
  deps: Pick<IndexDeps, 'repo' | 'embed' | 'signal' | 'extractor'> & {
    collectionId: string;
  },
): Promise<'saved' | 'unchanged'> {
  const { repo, embed, signal, extractor, collectionId } = deps;
  const base = { path: file.path, size: file.size, mtime: file.mtime };
  const save = (
    doc: DocumentInput,
    chunks: Parameters<KnowledgeRepository['saveDocument']>[2] = [],
  ) => repo.saveDocument(collectionId, doc, chunks);

  let read: DocumentRead;
  try {
    read = await readDocument(file, extractor, previousHash);
  } catch (error) {
    signal.throwIfAborted();
    save({
      ...base,
      hash: '',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    return 'saved';
  }
  // Nur die Zeit hat sich geändert (z. B. Datei kopiert) – nichts neu berechnen.
  if (read.type === 'unchanged') return 'unchanged';
  if (read.type === 'skipped') {
    save({ ...base, hash: read.hash, status: 'skipped', error: read.reason });
    return 'saved';
  }

  const chunks =
    read.type === 'pages'
      ? pageChunks(file.path, read.pages)
      : toChunks(file.path, read.text, read.markdown);
  if (chunks.length === 0) {
    save({
      ...base,
      hash: read.hash,
      status: 'empty',
      ...(read.type === 'pages' && {
        error:
          'Kein Text gefunden – vermutlich eingescannt (Texterkennung gibt es nicht).',
      }),
    });
    return 'saved';
  }

  const vectors: Float32Array[] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    signal.throwIfAborted();
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const result = await embed(batch.map(embeddingText), signal);
    signal.throwIfAborted();
    if (!result.ok) throw new EmbedError(result.error);
    vectors.push(...result.value.map(normalize));
  }
  save(
    { ...base, hash: read.hash, status: 'ok' },
    chunks.map((chunk, i) => ({ chunk, vector: vectors[i] })),
  );
  return 'saved';
}

/**
 * Abschnitte einer Datei. Der Dateiname steht vorne im Überschriften-Pfad –
 * so findet auch „Was steht in einkauf.md?“ die richtige Datei.
 */
function toChunks(filePath: string, text: string, markdown: boolean): Chunk[] {
  const name = path.basename(filePath);
  const chunks = markdown ? chunkMarkdown(text) : chunkText(text);
  return chunks.map((chunk) => ({
    ...chunk,
    heading: chunk.heading ? `${name} › ${chunk.heading}` : name,
  }));
}

/**
 * PDF: jede Seite wird für sich zerlegt – so gehört jeder Abschnitt zu genau einer
 * Seite, und die Quelle kann „S. 12“ angeben. Positionen gelten innerhalb der Seite.
 */
function pageChunks(filePath: string, pages: string[]): Chunk[] {
  const name = path.basename(filePath);
  return pages.flatMap((text, index) =>
    chunkText(text).map((chunk) => ({
      ...chunk,
      page: index + 1,
      heading: `${name} › S. ${index + 1}`,
    })),
  );
}
