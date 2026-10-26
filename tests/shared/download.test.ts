import { describe, expect, it } from 'vitest';
import type { PullChunk } from '../../src/shared/api';
import {
  applyPullChunk,
  downloadPercent,
  isValidModelName,
  newDownload,
} from '../../src/shared/download';

const weights = 'sha256:797b70c4edf8';
const template = 'sha256:c71d239df917';

/** Spielt Meldungen nacheinander ein, wie sie von Ollama kommen. */
const play = (chunks: PullChunk[]) =>
  chunks.reduce(applyPullChunk, newDownload('all-minilm', 0));

describe('applyPullChunk', () => {
  it('summiert den Fortschritt über alle Schichten', () => {
    const state = play([
      { status: 'pulling manifest' },
      { status: 'pulling 797b', digest: weights, total: 45_949_216 },
      { status: 'pulling c71d', digest: template, total: 11_357 },
      {
        status: 'pulling 797b',
        digest: weights,
        total: 45_949_216,
        completed: 13_500_416,
      },
      {
        status: 'pulling c71d',
        digest: template,
        total: 11_357,
        completed: 11_357,
      },
    ]);
    expect(state.phase).toBe('downloading');
    expect(state.totalBytes).toBe(45_960_573);
    expect(state.completedBytes).toBe(13_511_773);
    expect(downloadPercent(state)).toBe(29);
  });

  it('behält den Fortschritt, wenn eine Meldung „completed“ weglässt', () => {
    const state = play([
      { status: 'pulling 797b', digest: weights, total: 100, completed: 40 },
      { status: 'pulling 797b', digest: weights, total: 100 },
    ]);
    expect(state.completedBytes).toBe(40);
  });

  it('erkennt Prüfen und Fertig', () => {
    const verifying = play([
      { status: 'pulling 797b', digest: weights, total: 100, completed: 100 },
      { status: 'verifying sha256 digest' },
    ]);
    expect(verifying.phase).toBe('verifying');
    const done = applyPullChunk(verifying, { status: 'success' });
    expect(done.phase).toBe('done');
    expect(downloadPercent(done)).toBe(100);
  });

  it('startet bei 0 % ohne bekannte Größe', () => {
    expect(downloadPercent(play([{ status: 'pulling manifest' }]))).toBe(0);
  });
});

describe('isValidModelName', () => {
  it('akzeptiert Namen aus der Ollama-Bibliothek', () => {
    for (const name of [
      'all-minilm',
      'qwen3:14b',
      'nomic-embed-text:latest',
      'hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M',
      'gemma4:12b-it-q4_K_M',
    ]) {
      expect(isValidModelName(name), name).toBe(true);
    }
  });

  it('lehnt Unsinn und Tricks ab', () => {
    for (const name of [
      '',
      ' qwen3',
      'qwen3 14b',
      'qwen3:14b:extra',
      '../etc/passwd',
      'a//b',
      '"; rm -rf',
      '-flag',
      'x'.repeat(201),
    ]) {
      expect(isValidModelName(name), name).toBe(false);
    }
  });
});
