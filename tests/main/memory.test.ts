import { describe, expect, it } from 'vitest';
import { querySystemMemory } from '../../src/main/system/memory';

describe('querySystemMemory', () => {
  it('liest Speicher und Kerne aus der Quelle', () => {
    expect(
      querySystemMemory({
        totalmem: () => 16,
        freemem: () => 4,
        cpus: () => [{}, {}, {}] as never,
      }),
    ).toEqual({ totalBytes: 16, freeBytes: 4, cpuCount: 3 });
  });
});
