import { describe, expect, it } from 'vitest';
import {
  isValidRepoId,
  ollamaNameFor,
  parseFiles,
  parseSearch,
  quantFromPath,
} from '../../src/shared/catalog';
import { estimateNeedBytes, fitModel } from '../../src/shared/model-fit';

const GB = 1024 ** 3;

describe('quantFromPath', () => {
  it('erkennt gängige Quantisierungen', () => {
    expect(quantFromPath('Qwen3-4B-Q4_K_M.gguf')).toBe('Q4_K_M');
    expect(quantFromPath('Qwen3-4B-UD-Q4_K_XL.gguf')).toBe('Q4_K_XL');
    expect(quantFromPath('model-IQ3_XXS.gguf')).toBe('IQ3_XXS');
    expect(quantFromPath('Qwen3-4B-BF16.gguf')).toBe('BF16');
    expect(quantFromPath('Q8_0/model-00001-of-00002.gguf')).toBe('Q8_0');
    expect(quantFromPath('model-q5_k_s.gguf')).toBe('Q5_K_S');
  });
  it('lässt Namen wie Qwen3 in Ruhe', () => {
    expect(quantFromPath('Qwen3.gguf')).toBeNull();
    expect(quantFromPath('readme.md')).toBeNull();
  });
});

describe('parseFiles', () => {
  it('fasst geteilte Dateien zusammen und ignoriert Zusatzdateien', () => {
    const files = parseFiles([
      { type: 'file', path: '.gitattributes', size: 100 },
      { type: 'file', path: 'm-Q4_K_M.gguf', size: 1, lfs: { size: 2000 } },
      {
        type: 'file',
        path: 'm-Q8_0-00001-of-00002.gguf',
        size: 1,
        lfs: { size: 3000 },
      },
      {
        type: 'file',
        path: 'm-Q8_0-00002-of-00002.gguf',
        size: 1,
        lfs: { size: 4000 },
      },
      { type: 'file', path: 'mmproj-F16.gguf', size: 1, lfs: { size: 999 } },
      { type: 'directory', path: 'x' },
    ]);
    expect(files).toEqual([
      { quant: 'Q4_K_M', sizeBytes: 2000, files: 1 },
      { quant: 'Q8_0', sizeBytes: 7000, files: 2 },
    ]);
  });
  it('zählt eine zweite, nicht geteilte Datei derselben Quantisierung nicht dazu', () => {
    expect(
      parseFiles([
        { type: 'file', path: 'a/m-Q4_K_M.gguf', lfs: { size: 2000 } },
        { type: 'file', path: 'b/m-Q4_K_M.gguf', lfs: { size: 9000 } },
      ]),
    ).toEqual([{ quant: 'Q4_K_M', sizeBytes: 2000, files: 1 }]);
  });
  it('liefert bei Unsinn eine leere Liste', () => {
    expect(parseFiles({})).toEqual([]);
    expect(parseFiles(null)).toEqual([]);
  });
});

describe('parseSearch / Namen', () => {
  it('liest nur gültige Repos', () => {
    const models = parseSearch([
      {
        id: 'unsloth/Qwen3-4B-GGUF',
        downloads: 5,
        likes: 2,
        tags: ['gguf', 3],
      },
      { id: 'kaputt', downloads: 1 },
      { id: '../x/y' },
    ]);
    expect(models).toEqual([
      { id: 'unsloth/Qwen3-4B-GGUF', downloads: 5, likes: 2, tags: ['gguf'] },
    ]);
  });
  it('prüft Repo-Kennungen streng und baut den Ollama-Namen', () => {
    expect(isValidRepoId('a/b')).toBe(true);
    expect(isValidRepoId('a/b/c')).toBe(false);
    expect(isValidRepoId('a b/c')).toBe(false);
    expect(ollamaNameFor('unsloth/Qwen3-4B-GGUF', 'Q4_K_M')).toBe(
      'hf.co/unsloth/Qwen3-4B-GGUF:Q4_K_M',
    );
  });
});

describe('fitModel', () => {
  const pc = { vramBytes: 16 * GB, ramBytes: 16 * GB };
  it('kleines Modell passt ganz auf die Grafikkarte', () => {
    expect(fitModel(4 * GB, pc).level).toBe('gpu');
  });
  it('größeres läuft teils auf dem Prozessor', () => {
    expect(fitModel(20 * GB, pc).level).toBe('partial');
  });
  it('zu großes passt nicht', () => {
    expect(fitModel(40 * GB, pc).level).toBe('no');
  });
  it('ohne Grafikkarte zählt der Arbeitsspeicher', () => {
    const cpuOnly = { vramBytes: null, ramBytes: 16 * GB };
    expect(fitModel(4 * GB, cpuOnly).level).toBe('cpu');
    expect(fitModel(14 * GB, cpuOnly).level).toBe('no');
  });
  it('mehr Kontext braucht mehr Platz', () => {
    expect(estimateNeedBytes(4 * GB, 32768)).toBeGreaterThan(
      estimateNeedBytes(4 * GB, 4096),
    );
  });
});
