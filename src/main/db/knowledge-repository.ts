import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type {
  CollectionConfig,
  CollectionStats,
  DocumentStatus,
  KnowledgeDocument,
  KnowledgeSource,
  Result,
} from '../../shared/api';
import type { Chunk } from '../rag/chunk';
import { toBlob } from '../rag/vectors';
import { isDriveRoot } from './mcp-repository';

const NAME_MAX_LENGTH = 80;
const MAX_SOURCES = 20;

interface CollectionRow {
  id: string;
  name: string;
  sources_json: string;
  embedding_model: string;
  indexed_at: number | null;
}

interface DocumentRow {
  id: string;
  path: string;
  size: number;
  mtime: number;
  hash: string;
  status: DocumentStatus;
  error: string | null;
  chunk_count: number;
  indexed_at: number;
}

/** Was „Neu einlesen“ über eine schon bekannte Datei wissen muss. */
export interface KnownDocument {
  id: string;
  size: number;
  mtime: number;
  hash: string;
  status: DocumentStatus;
}

/** Eine eingelesene Datei, wie sie gespeichert wird. */
export interface DocumentInput {
  path: string;
  size: number;
  mtime: number;
  hash: string;
  status: DocumentStatus;
  error?: string;
}

/** Ein gespeicherter Abschnitt für die Suche. */
export interface StoredChunk {
  id: number;
  documentId: string;
  path: string;
  start: number;
  end: number;
  heading: string | null;
  text: string;
  vector: Uint8Array;
}

/** Sammlungen, ihre Dokumente und Abschnitte. */
export class KnowledgeRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
  ) {}

  listCollections(): CollectionConfig[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, sources_json, embedding_model, indexed_at FROM collections',
      )
      .all() as unknown as CollectionRow[];
    return rows
      .map(toConfig)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  getCollection(collectionId: string): CollectionConfig | null {
    const row = this.db
      .prepare(
        'SELECT id, name, sources_json, embedding_model, indexed_at FROM collections WHERE id = ?',
      )
      .get(collectionId) as unknown as CollectionRow | undefined;
    return row ? toConfig(row) : null;
  }

  /**
   * Legt an oder ändert (gleiche id). Das Embedding-Modell wird nur beim Anlegen
   * festgelegt – Fingerabdrücke verschiedener Modelle passen nicht zusammen.
   */
  saveCollection(
    input: unknown,
    embeddingModel: string,
  ): Result<CollectionConfig> {
    const checked = checkCollectionInput(input);
    if (!checked.ok) return checked;
    const { id, name, sources } = checked.value;
    this.db
      .prepare(
        `INSERT INTO collections (id, name, sources_json, embedding_model, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, sources_json = excluded.sources_json`,
      )
      .run(id, name, JSON.stringify(sources), embeddingModel, this.now());
    return { ok: true, value: this.getCollection(id)! };
  }

  deleteCollection(collectionId: string) {
    this.db.prepare('DELETE FROM collections WHERE id = ?').run(collectionId);
  }

  setIndexedAt(collectionId: string) {
    this.db
      .prepare('UPDATE collections SET indexed_at = ? WHERE id = ?')
      .run(this.now(), collectionId);
  }

  stats(collectionId: string): CollectionStats {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS documents,
                COALESCE(SUM(chunk_count), 0) AS chunks,
                COALESCE(SUM(status IN ('error', 'skipped')), 0) AS problems
           FROM documents WHERE collection_id = ?`,
      )
      .get(collectionId) as {
      documents: number;
      chunks: number;
      problems: number;
    };
    const indexedAt =
      (
        this.db
          .prepare('SELECT indexed_at FROM collections WHERE id = ?')
          .get(collectionId) as { indexed_at: number | null } | undefined
      )?.indexed_at ?? undefined;
    return {
      documents: row.documents,
      chunks: row.chunks,
      problems: row.problems,
      ...(indexedAt !== undefined && { indexedAt }),
    };
  }

  listDocuments(collectionId: string): KnowledgeDocument[] {
    const rows = this.db
      .prepare(
        `SELECT id, path, size, mtime, hash, status, error, chunk_count, indexed_at
           FROM documents WHERE collection_id = ?`,
      )
      .all(collectionId) as unknown as DocumentRow[];
    return rows
      .map((row) => ({
        id: row.id,
        path: row.path,
        sizeBytes: row.size,
        status: row.status,
        ...(row.error && { error: row.error }),
        chunkCount: row.chunk_count,
        indexedAt: row.indexed_at,
      }))
      .sort((a, b) => a.path.localeCompare(b.path, 'de'));
  }

  /** Bekannte Dateien (Pfad → Stand), um Geändertes zu erkennen. */
  knownDocuments(collectionId: string): Map<string, KnownDocument> {
    const rows = this.db
      .prepare(
        'SELECT id, path, size, mtime, hash, status FROM documents WHERE collection_id = ?',
      )
      .all(collectionId) as unknown as DocumentRow[];
    return new Map(
      rows.map((r) => [
        r.path,
        {
          id: r.id,
          size: r.size,
          mtime: r.mtime,
          hash: r.hash,
          status: r.status,
        },
      ]),
    );
  }

  /**
   * Speichert eine Datei mit ihren Abschnitten und ersetzt die alten – alles oder
   * nichts, damit nie eine halb eingelesene Datei in der Suche landet.
   */
  saveDocument(
    collectionId: string,
    doc: DocumentInput,
    chunks: { chunk: Chunk; vector: Float32Array }[],
  ) {
    this.db.exec('BEGIN');
    try {
      const existing = this.db
        .prepare(
          'SELECT id FROM documents WHERE collection_id = ? AND path = ?',
        )
        .get(collectionId, doc.path) as { id: string } | undefined;
      const documentId = existing?.id ?? randomUUID();
      this.db
        .prepare(
          `INSERT INTO documents
             (id, collection_id, path, size, mtime, hash, status, error, chunk_count, indexed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET size = excluded.size, mtime = excluded.mtime,
             hash = excluded.hash, status = excluded.status, error = excluded.error,
             chunk_count = excluded.chunk_count, indexed_at = excluded.indexed_at`,
        )
        .run(
          documentId,
          collectionId,
          doc.path,
          doc.size,
          doc.mtime,
          doc.hash,
          doc.status,
          doc.error ?? null,
          chunks.length,
          this.now(),
        );
      this.db
        .prepare('DELETE FROM chunks WHERE document_id = ?')
        .run(documentId);
      const insert = this.db.prepare(
        `INSERT INTO chunks (document_id, position, start, end, heading, text, vector)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      chunks.forEach(({ chunk, vector }, position) => {
        insert.run(
          documentId,
          position,
          chunk.start,
          chunk.end,
          chunk.heading ?? null,
          chunk.text,
          toBlob(vector),
        );
      });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /** Datei unverändert (gleiche Prüfsumme), nur die Änderungszeit ist neu. */
  touchDocument(documentId: string, mtime: number) {
    this.db
      .prepare('UPDATE documents SET mtime = ? WHERE id = ?')
      .run(mtime, documentId);
  }

  removeDocuments(documentIds: string[]) {
    const statement = this.db.prepare('DELETE FROM documents WHERE id = ?');
    for (const id of documentIds) statement.run(id);
  }

  /** Alle Abschnitte einer Sammlung mit Fingerabdruck – für die Suche. */
  chunks(collectionId: string): StoredChunk[] {
    return this.db
      .prepare(
        `SELECT c.id, c.document_id AS documentId, d.path, c.start, c.end, c.heading, c.text, c.vector
           FROM chunks c JOIN documents d ON d.id = c.document_id
          WHERE d.collection_id = ?
          ORDER BY d.path, c.position`,
      )
      .all(collectionId) as unknown as StoredChunk[];
  }
}

/**
 * Prüft Name und Quellen aus der Oberfläche. Quellen müssen vollständige Pfade
 * sein; ein ganzes Laufwerk ist zu weit gefasst (wie bei den MCP-Ordnern).
 */
export function checkCollectionInput(
  input: unknown,
): Result<{ id: string; name: string; sources: KnowledgeSource[] }> {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Ungültige Eingabe' };
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id === '' || raw.id.length > 100) {
    return { ok: false, error: 'Sammlung ohne ID' };
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return { ok: false, error: 'Bitte gib der Sammlung einen Namen.' };

  const sources: KnowledgeSource[] = [];
  const seen = new Set<string>();
  for (const entry of Array.isArray(raw.sources) ? raw.sources : []) {
    const source = entry as Partial<KnowledgeSource>;
    if (source?.kind !== 'folder' && source?.kind !== 'file') {
      return { ok: false, error: 'Unbekannte Quellenart' };
    }
    if (
      typeof source.path !== 'string' ||
      !path.win32.isAbsolute(source.path)
    ) {
      return { ok: false, error: `Kein vollständiger Pfad: ${source.path}` };
    }
    if (source.kind === 'folder' && isDriveRoot(source.path)) {
      return {
        ok: false,
        error: `Ein ganzes Laufwerk (${source.path}) ist zu viel – bitte einen Unterordner wählen.`,
      };
    }
    const normalized = withoutTrailingSlash(path.win32.normalize(source.path));
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ kind: source.kind, path: normalized });
  }
  if (sources.length > MAX_SOURCES) {
    return { ok: false, error: `Höchstens ${MAX_SOURCES} Quellen.` };
  }
  return {
    ok: true,
    value: { id: raw.id, name: name.slice(0, NAME_MAX_LENGTH), sources },
  };
}

/** „C:\Studium\“ → „C:\Studium“, aber „D:\“ bleibt „D:\“. */
function withoutTrailingSlash(value: string): string {
  return isDriveRoot(value) ? value : value.replace(/[\\/]+$/, '');
}

function toConfig(row: CollectionRow): CollectionConfig {
  let sources: KnowledgeSource[] = [];
  try {
    const parsed = JSON.parse(row.sources_json) as unknown;
    if (Array.isArray(parsed)) {
      sources = parsed.filter(
        (s): s is KnowledgeSource =>
          (s?.kind === 'folder' || s?.kind === 'file') &&
          typeof s.path === 'string',
      );
    }
  } catch {
    // kaputtes JSON → keine Quellen
  }
  return {
    id: row.id,
    name: row.name,
    sources,
    embeddingModel: row.embedding_model,
  };
}
