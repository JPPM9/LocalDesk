/**
 * Hilfen für Vektoren („Bedeutungs-Fingerabdrücke“). Gespeichert wird als Float32:
 * 4 Bytes pro Zahl, bei 1024 Zahlen also 4 KB pro Abschnitt.
 */

/** Bringt einen Vektor auf Länge 1 – dann ist die Ähnlichkeit ein einfaches Skalarprodukt. */
export function normalize(vector: ArrayLike<number>): Float32Array {
  const result = Float32Array.from(vector);
  let sum = 0;
  for (const x of result) sum += x * x;
  const length = Math.sqrt(sum);
  if (length > 0) for (let i = 0; i < result.length; i++) result[i] /= length;
  return result;
}

/** Für SQLite: Vektor → Binärdaten. */
export function toBlob(vector: Float32Array): Uint8Array {
  return new Uint8Array(
    vector.buffer.slice(
      vector.byteOffset,
      vector.byteOffset + vector.byteLength,
    ),
  );
}

/** Aus SQLite: Binärdaten → Vektor (kopiert, damit die Ausrichtung im Speicher stimmt). */
export function fromBlob(blob: Uint8Array): Float32Array {
  const copy = new Uint8Array(blob.byteLength);
  copy.set(blob);
  return new Float32Array(copy.buffer);
}

/**
 * Ähnlichkeit zweier normierter Vektoren: 1 = gleiche Bedeutung, um 0 = nichts
 * gemeinsam. (Kosinus-Ähnlichkeit, weil beide Länge 1 haben.)
 */
export function similarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export interface Scored<T> {
  item: T;
  score: number;
}

/** Die `k` ähnlichsten Einträge, bester zuerst. */
export function topK<T>(
  query: Float32Array,
  entries: Iterable<{ item: T; vector: Float32Array }>,
  k: number,
): Scored<T>[] {
  const best: Scored<T>[] = [];
  for (const { item, vector } of entries) {
    const score = similarity(query, vector);
    if (best.length < k) {
      best.push({ item, score });
      best.sort((x, y) => y.score - x.score);
    } else if (score > best[best.length - 1].score) {
      best[best.length - 1] = { item, score };
      best.sort((x, y) => y.score - x.score);
    }
  }
  return best;
}

/**
 * Suchanfragen bekommen bei Qwen3-Embedding eine kurze Anweisung vorangestellt
 * (Empfehlung des Herstellers; Dokumente nicht). Mit deutschen Testtexten
 * wurde der Abstand zum nächstbesten Treffer im Mittel etwas größer (0,274 statt 0,235).
 */
export function queryText(model: string, query: string): string {
  if (model.startsWith('qwen3-embedding')) {
    return `Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: ${query}`;
  }
  return query;
}
