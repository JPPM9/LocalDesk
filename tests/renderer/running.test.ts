import { describe, expect, it } from 'vitest';
import type { RunningModel } from '../../src/shared/api';
import {
  expiresIn,
  gpuSplit,
  gpuSplitLabel,
  totalVram,
} from '../../src/renderer/utils/running';

const model = (sizeBytes: number, vramBytes: number): RunningModel => ({
  name: 'm',
  sizeBytes,
  vramBytes,
});

describe('gpuSplit / gpuSplitLabel', () => {
  it('erkennt ein Modell komplett im VRAM', () => {
    const m = model(14_383_820_307, 14_383_820_307);
    expect(gpuSplit(m)).toEqual({ gpu: 100, cpu: 0 });
    expect(gpuSplitLabel(m)).toBe('100 % GPU');
  });

  it('zeigt eine Aufteilung, wenn nicht alles in den VRAM passt', () => {
    // z. B. muse-glimmer:30b (18 GB) auf einer 16-GB-Karte
    const m = model(18_000_000_000, 13_500_000_000);
    expect(gpuSplit(m)).toEqual({ gpu: 75, cpu: 25 });
    expect(gpuSplitLabel(m)).toBe('75 % GPU / 25 % CPU');
  });

  it('erkennt reinen CPU-Betrieb und unbekannte Größe', () => {
    expect(gpuSplitLabel(model(1000, 0))).toBe('100 % CPU');
    expect(gpuSplit(model(0, 0))).toEqual({ gpu: 0, cpu: 0 });
  });

  it('summiert den VRAM aller geladenen Modelle', () => {
    expect(totalVram([model(10, 8), model(5, 5)])).toBe(13);
  });
});

describe('expiresIn', () => {
  const now = new Date('2026-10-26T18:50:00+01:00').getTime();

  it('zeigt Minuten und Sekunden bis zum Entladen', () => {
    expect(expiresIn('2026-10-26T18:55:30+01:00', now)).toBe('5 Min.');
    expect(expiresIn('2026-10-26T18:50:45+01:00', now)).toBe('45 s');
    expect(expiresIn('2026-10-26T20:20:00+01:00', now)).toBe('1 Std. 30 Min.');
  });

  it('erkennt „gleich“ und „dauerhaft geladen“', () => {
    expect(expiresIn('2026-10-26T18:49:00+01:00', now)).toBe('gleich');
    expect(expiresIn('2318-01-01T00:00:00Z', now)).toBe('dauerhaft');
  });

  it('gibt null für fehlende oder kaputte Angaben', () => {
    expect(expiresIn(undefined, now)).toBeNull();
    expect(expiresIn('kaputt', now)).toBeNull();
  });
});
