import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  fromBlob,
  normalize,
  queryText,
  similarity,
  toBlob,
  topK,
} from '../../src/main/rag/vectors';

describe('Vektoren', () => {
  it('normiert auf Länge 1 und lässt Nullvektoren in Ruhe', () => {
    expect([...normalize([3, 4])]).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(0.8),
    ]);
    expect([...normalize([0, 0])]).toEqual([0, 0]);
  });

  it('misst Ähnlichkeit: gleich = 1, rechtwinklig = 0, entgegengesetzt = -1', () => {
    const a = normalize([1, 0]);
    expect(similarity(a, normalize([2, 0]))).toBeCloseTo(1);
    expect(similarity(a, normalize([0, 5]))).toBeCloseTo(0);
    expect(similarity(a, normalize([-1, 0]))).toBeCloseTo(-1);
    expect(similarity(a, normalize([1, 0, 0]))).toBe(0);
  });

  it('übersteht den Weg durch SQLite unverändert', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE v (data BLOB)');
    const vector = normalize(Array.from({ length: 1024 }, (_, i) => i - 500));
    db.prepare('INSERT INTO v VALUES (?)').run(toBlob(vector));
    const { data } = db.prepare('SELECT data FROM v').get() as {
      data: Uint8Array;
    };
    expect(data.byteLength).toBe(4096);
    expect(fromBlob(data)).toEqual(vector);
  });

  it('funktioniert auch mit einem Ausschnitt eines größeren Speichers', () => {
    const big = new Float32Array([9, 1, 2, 9]);
    const view = big.subarray(1, 3);
    expect([...fromBlob(toBlob(view))]).toEqual([1, 2]);
  });

  it('findet die k ähnlichsten, bester zuerst', () => {
    const entries = [
      { item: 'oben', vector: normalize([0, 1]) },
      { item: 'rechts', vector: normalize([1, 0]) },
      { item: 'schräg', vector: normalize([1, 1]) },
      { item: 'links', vector: normalize([-1, 0]) },
    ];
    const result = topK(normalize([1, 0.1]), entries, 2);
    expect(result.map((r) => r.item)).toEqual(['rechts', 'schräg']);
    expect(result[0].score).toBeGreaterThan(result[1].score);
    expect(topK(normalize([1, 0]), entries, 10)).toHaveLength(4);
  });

  it('stellt nur bei Qwen3-Embedding eine Anweisung vor die Frage', () => {
    expect(queryText('qwen3-embedding:0.6b', 'Frage')).toMatch(
      /^Instruct: .*\nQuery: Frage$/,
    );
    expect(queryText('bge-m3', 'Frage')).toBe('Frage');
  });
});
