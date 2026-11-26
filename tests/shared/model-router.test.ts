import { describe, expect, it } from 'vitest';
import type { ModelInfo } from '../../src/shared/api';
import {
  billions,
  detectSignals,
  pickModel,
  type TaskSignals,
} from '../../src/shared/model-router';

const GB = 1024 ** 3;
const model = (
  name: string,
  size: number,
  parameterSize: string,
  capabilities: string[] = ['completion'],
  extra: Partial<ModelInfo> = {},
): ModelInfo => ({
  name,
  sizeBytes: size * GB,
  modifiedAt: '',
  parameterSize,
  capabilities,
  ...extra,
});

const pc = { vramBytes: 17 * GB, ramBytes: 32 * GB };
const plain: TaskSignals = {
  images: false,
  tools: false,
  code: false,
  reasoning: false,
  contextTokens: 1000,
};

const models = [
  model('gemma4:12b', 8, '11.9B', [
    'completion',
    'vision',
    'tools',
    'thinking',
  ]),
  model('gpt-oss:20b', 13.8, '20.9B', ['completion', 'tools', 'thinking']),
  model('qwen3-coder:30b', 18, '30B', ['completion', 'tools']),
  model('qwen3-embedding:0.6b', 0.6, '595M', ['embedding']),
];

describe('pickModel', () => {
  it('nimmt für einfachen Text das größte Modell, das auf die Karte passt', () => {
    const pick = pickModel(models, plain, pc);
    expect(pick?.model).toBe('gpt-oss:20b');
    expect(pick?.reasons).toContain('fitsGpu');
  });

  it('Bilder verlangen ein Vision-Modell', () => {
    const pick = pickModel(models, { ...plain, images: true }, pc);
    expect(pick?.model).toBe('gemma4:12b');
    expect(pick?.reasons).toContain('vision');
  });

  it('Werkzeuge schließen Modelle ohne Werkzeug-Fähigkeit aus', () => {
    const only = [
      model('a:70b', 5, '70B', ['completion']),
      model('b:7b', 4, '7B', ['completion', 'tools']),
    ];
    expect(pickModel(only, { ...plain, tools: true }, pc)?.model).toBe('b:7b');
  });

  it('Code-Aufgaben bevorzugen ein Coder-Modell, wenn es passt', () => {
    const pick = pickModel(
      models,
      { ...plain, code: true },
      {
        vramBytes: 24 * GB,
        ramBytes: 32 * GB,
      },
    );
    expect(pick?.model).toBe('qwen3-coder:30b');
    expect(pick?.reasons).toContain('code');
  });

  it('ein Modell, das nicht passt, verliert gegen ein kleineres', () => {
    const small = { vramBytes: 8 * GB, ramBytes: 8 * GB };
    expect(pickModel(models, plain, small)?.model).toBe('gemma4:12b');
  });

  it('das bereits geladene Modell bekommt Vorrang bei knappem Abstand', () => {
    const near = [model('a:14b', 9, '14B'), model('b:14b', 9, '14B')];
    expect(pickModel(near, plain, pc, ['b:14b'])?.model).toBe('b:14b');
    expect(pickModel(near, plain, pc, ['b:14b'])?.reasons).toContain('loaded');
  });

  it('Embedding-Modelle sind nie die Wahl; ohne Modelle gibt es keine Wahl', () => {
    const only = [model('e:0.6b', 0.6, '595M', ['embedding'])];
    expect(pickModel(only, plain, pc)).toBeNull();
    expect(pickModel([], plain, pc)).toBeNull();
  });

  it('Server ohne Größenangabe werden neutral behandelt', () => {
    const remote = [model('cloud', 0, '', ['completion', 'tools'])];
    expect(pickModel(remote, { ...plain, tools: true }, pc)?.model).toBe(
      'cloud',
    );
  });
});

describe('Signale und Größen', () => {
  const base = { images: false, tools: false, contextTokens: 0 };
  it('erkennt Code und Rechenaufgaben an Stichwörtern', () => {
    expect(detectSignals('Schreib eine Python-Funktion', base).code).toBe(true);
    expect(detectSignals('Warum ist der Himmel blau?', base).code).toBe(false);
    expect(
      detectSignals('Berechne schrittweise die Gleichung', base).reasoning,
    ).toBe(true);
    expect(detectSignals('Hallo', { ...base, codeArea: true }).code).toBe(true);
  });
  it('liest Parameterzahlen', () => {
    expect(billions('14.8B')).toBeCloseTo(14.8);
    expect(billions('595.78M')).toBeCloseTo(0.59578);
    expect(billions(undefined)).toBe(0);
  });
});
