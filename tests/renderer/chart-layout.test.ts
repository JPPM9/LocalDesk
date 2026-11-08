import { describe, expect, it } from 'vitest';
import {
  pieSlices,
  shortLabel,
  slicePath,
  valueAxis,
} from '../../src/renderer/utils/chart-layout';

describe('valueAxis', () => {
  it('umfasst alle Werte und die Null bei Balken', () => {
    const axis = valueAxis([12, 47, 33], { includeZero: true });
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThanOrEqual(47);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.ticks.at(-1)).toBe(axis.max);
    // aufsteigend, gleichmäßige Schritte
    const steps = axis.ticks.slice(1).map((t, i) => t - axis.ticks[i]);
    expect(new Set(steps.map((s) => s.toFixed(9))).size).toBe(1);
    expect(axis.ticks.length).toBeLessThanOrEqual(8);
  });

  it('Linie darf bei einem hohen Bereich ohne Null beginnen', () => {
    const axis = valueAxis([1000, 1040, 1010], { includeZero: false });
    expect(axis.min).toBeGreaterThan(900);
    expect(axis.max).toBeLessThan(1200);
  });

  it('negative Werte und gemischte Vorzeichen', () => {
    const axis = valueAxis([-30, 10], { includeZero: true });
    expect(axis.min).toBeLessThanOrEqual(-30);
    expect(axis.max).toBeGreaterThanOrEqual(10);
    expect(axis.ticks).toContain(0);
  });

  it('nur ein Wert oder nur Nullen ergeben eine gültige Achse', () => {
    const one = valueAxis([5], { includeZero: false });
    expect(one.max).toBeGreaterThan(one.min);
    const zero = valueAxis([0, 0], { includeZero: true });
    expect(zero.max).toBeGreaterThan(zero.min);
    expect(zero.ticks.length).toBeGreaterThan(1);
  });

  it('kleine Werte ohne Rundungsfehler', () => {
    const axis = valueAxis([0.1, 0.35], { includeZero: true });
    for (const tick of axis.ticks) {
      expect(String(tick).length).toBeLessThan(8);
    }
  });

  it('sehr große Werte', () => {
    const axis = valueAxis([2_000_000, 9_500_000], { includeZero: true });
    expect(axis.max).toBeGreaterThanOrEqual(9_500_000);
    expect(axis.ticks.length).toBeLessThanOrEqual(8);
  });
});

describe('pieSlices', () => {
  it('Anteile ergeben einen Vollkreis, in Reihenfolge', () => {
    const slices = pieSlices([1, 1, 2]);
    expect(slices.map((s) => s.share)).toEqual([0.25, 0.25, 0.5]);
    expect(slices[0].start).toBe(0);
    expect(slices.at(-1)!.end).toBeCloseTo(Math.PI * 2);
    expect(slices[1].start).toBeCloseTo(slices[0].end);
  });

  it('Nullen entfallen, behalten aber ihren Index; nichts zu zeichnen = leer', () => {
    const slices = pieSlices([0, 3, 0, 1]);
    expect(slices.map((s) => s.index)).toEqual([1, 3]);
    expect(pieSlices([0, 0])).toEqual([]);
    expect(pieSlices([])).toEqual([]);
  });
});

describe('slicePath', () => {
  it('ein Stück ist ein geschlossener Pfad aus Mittelpunkt und Bogen', () => {
    const path = slicePath(100, 100, 50, 0, Math.PI / 2);
    expect(
      path.startsWith('M 100 100 L 100.00 50.00 A 50 50 0 0 1 150.00 100.00'),
    ).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('über die Hälfte nutzt den großen Bogen', () => {
    expect(slicePath(0, 0, 10, 0, Math.PI * 1.5)).toContain('A 10 10 0 1 1');
  });

  it('ein Vollkreis wird gezeichnet (zwei Bögen)', () => {
    const path = slicePath(0, 0, 10, 0, Math.PI * 2);
    expect(path.match(/A /g)).toHaveLength(2);
  });
});

describe('shortLabel', () => {
  it('kürzt mit Auslassungspunkten und lässt Kurzes', () => {
    expect(shortLabel('Düsseldorf', 6)).toBe('Düsse…');
    expect(shortLabel('Köln', 6)).toBe('Köln');
    expect(shortLabel('abc', 1)).toBe('a…');
  });
});
