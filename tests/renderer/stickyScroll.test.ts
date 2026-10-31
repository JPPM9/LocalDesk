import { describe, expect, it } from 'vitest';
import { isNearBottom } from '../../src/renderer/components/StickyScroll';

describe('isNearBottom', () => {
  const box = (scrollTop: number) => ({
    scrollHeight: 2000,
    clientHeight: 600,
    scrollTop,
  });

  it('ganz unten und knapp darüber zählt als unten', () => {
    expect(isNearBottom(box(1400))).toBe(true);
    expect(isNearBottom(box(1360))).toBe(true);
  });

  it('wer hochgescrollt hat, ist nicht mehr unten', () => {
    expect(isNearBottom(box(1300))).toBe(false);
    expect(isNearBottom(box(0))).toBe(false);
  });

  it('ein Bereich ohne Scrollen ist immer unten', () => {
    expect(
      isNearBottom({ scrollHeight: 400, clientHeight: 600, scrollTop: 0 }),
    ).toBe(true);
  });

  it('die Toleranz lässt sich ändern', () => {
    expect(isNearBottom(box(1300), 200)).toBe(true);
  });
});
