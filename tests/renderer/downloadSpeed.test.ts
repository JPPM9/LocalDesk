import { describe, expect, it } from 'vitest';
import {
  addSample,
  remaining,
  speed,
  type Sample,
} from '../../src/renderer/utils/downloadSpeed';

describe('Download-Tempo', () => {
  it('mittelt über die letzten Sekunden', () => {
    let samples: Sample[] = [];
    samples = addSample(samples, { at: 0, bytes: 0 });
    samples = addSample(samples, { at: 1000, bytes: 10_000_000 });
    samples = addSample(samples, { at: 2000, bytes: 30_000_000 });
    expect(speed(samples)).toBe(15_000_000); // 30 MB in 2 s
  });

  it('vergisst Messpunkte, die älter als 5 Sekunden sind', () => {
    let samples: Sample[] = [{ at: 0, bytes: 0 }];
    samples = addSample(samples, { at: 6000, bytes: 60_000_000 });
    samples = addSample(samples, { at: 7000, bytes: 70_000_000 });
    expect(samples).toHaveLength(2);
    expect(speed(samples)).toBe(10_000_000);
  });

  it('meldet nichts, solange zu wenig gemessen wurde', () => {
    expect(speed([])).toBeNull();
    expect(
      speed([
        { at: 0, bytes: 0 },
        { at: 500, bytes: 100 },
      ]),
    ).toBeNull();
  });
});

describe('Restzeit', () => {
  it('schätzt aus Tempo und fehlenden Bytes', () => {
    expect(remaining(100_000_000, 40_000_000, 10_000_000)).toBe('noch 6 s');
    expect(remaining(9_300_000_000, 300_000_000, 50_000_000)).toBe(
      'noch 3 Min.',
    );
    expect(remaining(20_000_000_000, 0, 2_000_000)).toBe('noch 2 Std. 47 Min.');
  });

  it('gibt null ohne Tempo oder Größe', () => {
    expect(remaining(100, 0, null)).toBeNull();
    expect(remaining(0, 0, 1000)).toBeNull();
  });
});
