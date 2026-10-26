import type { DownloadState, PullChunk } from './api';

/**
 * Erlaubte Modellnamen wie in der Ollama-Bibliothek: „qwen3:14b“,
 * „hf.co/nutzer/modell:Q4_K_M“, „nomic-embed-text“. Leerzeichen, Anführungszeichen
 * oder Pfad-Tricks wie „..“ sind nicht erlaubt.
 */
export function isValidModelName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 200 &&
    /^[a-z0-9][a-z0-9._/-]*(:[a-z0-9._-]+)?$/i.test(name) &&
    !name.includes('..') &&
    !name.includes('//')
  );
}

export function newDownload(model: string, now: number): DownloadState {
  return {
    model,
    phase: 'starting',
    layers: {},
    completedBytes: 0,
    totalBytes: 0,
    startedAt: now,
  };
}

/**
 * Baut eine Meldung von Ollama in den Download-Stand ein. Gesamtfortschritt =
 * Summe über alle Schichten. Gibt einen neuen Stand zurück (ändert den alten nicht).
 */
export function applyPullChunk(
  state: DownloadState,
  chunk: PullChunk,
): DownloadState {
  let { phase, layers } = state;

  if (chunk.digest && typeof chunk.total === 'number') {
    const previous = layers[chunk.digest];
    layers = {
      ...layers,
      [chunk.digest]: {
        total: chunk.total,
        // Ollama lässt „completed“ weg, solange noch nichts geladen ist.
        completed: chunk.completed ?? previous?.completed ?? 0,
      },
    };
    phase = 'downloading';
  } else if (
    chunk.status.startsWith('verifying') ||
    chunk.status.startsWith('writing')
  ) {
    phase = 'verifying';
  } else if (chunk.status === 'success') {
    phase = 'done';
  }

  const all = Object.values(layers);
  return {
    ...state,
    phase,
    layers,
    totalBytes: all.reduce((sum, layer) => sum + layer.total, 0),
    completedBytes: all.reduce(
      (sum, layer) => sum + Math.min(layer.completed, layer.total),
      0,
    ),
  };
}

/** Fortschritt in Prozent (0–100), fertig = 100. */
export function downloadPercent(state: DownloadState): number {
  if (state.phase === 'done') return 100;
  if (state.totalBytes <= 0) return 0;
  return Math.min(
    100,
    Math.floor((state.completedBytes / state.totalBytes) * 100),
  );
}
