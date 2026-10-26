import { beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../../src/main/db/database';
import {
  checkCollectionInput,
  KnowledgeRepository,
} from '../../src/main/db/knowledge-repository';
import { fromBlob, normalize } from '../../src/main/rag/vectors';

let db: DatabaseSync;
let clock: number;
let repo: KnowledgeRepository;

beforeEach(() => {
  db = openDatabase(':memory:');
  clock = 1000;
  repo = new KnowledgeRepository(db, () => clock);
});

const input = {
  id: 'k1',
  name: 'Studium',
  sources: [{ kind: 'folder' as const, path: 'C:\\Users\\nutzer\\Studium' }],
};
const chunk = (text: string, start = 0) => ({
  chunk: { text, start, end: start + text.length, heading: 'notiz.md' },
  vector: normalize([1, 2, 3]),
});

describe('checkCollectionInput', () => {
  it('verlangt Namen und vollständige Pfade', () => {
    expect(checkCollectionInput({ ...input, name: ' ' }).ok).toBe(false);
    expect(
      checkCollectionInput({
        ...input,
        sources: [{ kind: 'folder', path: 'Studium' }],
      }).ok,
    ).toBe(false);
    expect(
      checkCollectionInput({
        ...input,
        sources: [{ kind: 'x', path: 'C:\\a' }],
      }).ok,
    ).toBe(false);
  });

  it('lehnt ganze Laufwerke als Ordner ab, einzelne Dateien dort sind ok', () => {
    expect(
      checkCollectionInput({
        ...input,
        sources: [{ kind: 'folder', path: 'D:\\' }],
      }).ok,
    ).toBe(false);
    expect(
      checkCollectionInput({
        ...input,
        sources: [{ kind: 'file', path: 'D:\\liste.md' }],
      }).ok,
    ).toBe(true);
  });

  it('entfernt doppelte Quellen (Groß-/Kleinschreibung egal)', () => {
    const result = checkCollectionInput({
      ...input,
      sources: [
        { kind: 'folder', path: 'C:\\Studium' },
        { kind: 'folder', path: 'c:\\studium\\' },
      ],
    });
    expect(result.ok && result.value.sources).toHaveLength(1);
  });
});

describe('KnowledgeRepository', () => {
  it('legt Sammlungen an und behält beim Ändern das Embedding-Modell', () => {
    repo.saveCollection(input, 'qwen3-embedding:0.6b');
    repo.saveCollection({ ...input, name: 'Uni' }, 'anderes-modell');
    const saved = repo.getCollection('k1');
    expect(saved?.name).toBe('Uni');
    expect(saved?.embeddingModel).toBe('qwen3-embedding:0.6b');
    expect(repo.listCollections()).toHaveLength(1);
  });

  it('speichert Dokumente mit Abschnitten und ersetzt sie beim erneuten Einlesen', () => {
    repo.saveCollection(input, 'm');
    const doc = {
      path: 'C:\\Users\\nutzer\\Studium\\notiz.md',
      size: 10,
      mtime: 5,
      hash: 'h1',
      status: 'ok' as const,
    };
    repo.saveDocument('k1', doc, [chunk('eins'), chunk('zwei', 4)]);
    repo.saveDocument('k1', { ...doc, hash: 'h2' }, [chunk('neu')]);

    const stored = repo.chunks('k1');
    expect(stored.map((c) => c.text)).toEqual(['neu']);
    expect(stored[0].heading).toBe('notiz.md');
    expect([...fromBlob(stored[0].vector)]).toEqual([...normalize([1, 2, 3])]);
    expect(repo.knownDocuments('k1').get(doc.path)?.hash).toBe('h2');
    expect(repo.stats('k1')).toMatchObject({
      documents: 1,
      chunks: 1,
      problems: 0,
    });
  });

  it('zählt übersprungene und fehlerhafte Dateien als Probleme', () => {
    repo.saveCollection(input, 'm');
    const base = { size: 1, mtime: 1, hash: '' };
    repo.saveDocument(
      'k1',
      {
        ...base,
        path: 'C:\\a.bin',
        status: 'skipped',
        error: 'keine Textdatei',
      },
      [],
    );
    repo.saveDocument(
      'k1',
      { ...base, path: 'C:\\b.md', status: 'error', error: 'kaputt' },
      [],
    );
    repo.saveDocument('k1', { ...base, path: 'C:\\c.md', status: 'empty' }, []);
    expect(repo.stats('k1').problems).toBe(2);
    expect(
      repo.listDocuments('k1').map((d) => [d.path, d.status, d.error]),
    ).toEqual([
      ['C:\\a.bin', 'skipped', 'keine Textdatei'],
      ['C:\\b.md', 'error', 'kaputt'],
      ['C:\\c.md', 'empty', undefined],
    ]);
  });

  it('löscht beim Löschen der Sammlung Dokumente und Abschnitte mit', () => {
    repo.saveCollection(input, 'm');
    repo.saveDocument(
      'k1',
      { path: 'C:\\a.md', size: 1, mtime: 1, hash: 'h', status: 'ok' },
      [chunk('x')],
    );
    repo.deleteCollection('k1');
    const count = (table: string) =>
      (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number })
        .n;
    expect(count('documents')).toBe(0);
    expect(count('chunks')).toBe(0);
  });

  it('merkt sich den Zeitpunkt des letzten Einlesens', () => {
    repo.saveCollection(input, 'm');
    expect(repo.stats('k1').indexedAt).toBeUndefined();
    clock = 5000;
    repo.setIndexedAt('k1');
    expect(repo.stats('k1').indexedAt).toBe(5000);
  });
});
