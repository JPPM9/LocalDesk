import { describe, expect, it, vi } from 'vitest';
import { parseNvidiaSmi, queryGpus } from '../../src/main/system/gpu';

// Echte Ausgabe auf diesem PC (RTX 4060 Ti, 16 GB)
const REAL_OUTPUT =
  '0, NVIDIA GeForce RTX 4060 Ti, 29, 1322, 16380, 41, 17.81, 165.00\r\n';

describe('parseNvidiaSmi', () => {
  it('liest eine Karte und rechnet MiB in Bytes um', () => {
    expect(parseNvidiaSmi(REAL_OUTPUT)).toEqual([
      {
        index: 0,
        name: 'NVIDIA GeForce RTX 4060 Ti',
        utilizationPercent: 29,
        memoryUsedBytes: 1322 * 1024 * 1024,
        memoryTotalBytes: 16380 * 1024 * 1024,
        temperatureC: 41,
        powerWatts: 17.81,
        powerLimitWatts: 165,
      },
    ]);
  });

  it('liest mehrere Karten und lässt nicht gemeldete Werte weg', () => {
    const output =
      '0, GPU A, 5, 100, 8000, 40, 20.0, 150.0\n1, GPU B, [N/A], 0, 4000, [N/A], [N/A], [N/A]\n';
    const [, b] = parseNvidiaSmi(output);
    expect(parseNvidiaSmi(output)).toHaveLength(2);
    expect(b).toMatchObject({ index: 1, name: 'GPU B', memoryUsedBytes: 0 });
    expect(b.utilizationPercent).toBeUndefined();
    expect(b.temperatureC).toBeUndefined();
  });

  it('ignoriert leere und unvollständige Zeilen', () => {
    expect(parseNvidiaSmi('\n\nkaputt, 1\n')).toEqual([]);
  });
});

describe('queryGpus', () => {
  it('ruft nvidia-smi mit festen Argumenten auf', async () => {
    const run = vi.fn(async () => REAL_OUTPUT);
    const status = await queryGpus(run);
    expect(status).toMatchObject({
      available: true,
      gpus: [{ name: 'NVIDIA GeForce RTX 4060 Ti' }],
    });
    expect(run).toHaveBeenCalledWith('nvidia-smi', [
      '--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit',
      '--format=csv,noheader,nounits',
    ]);
  });

  it('meldet „keine NVIDIA-Karte“, wenn nvidia-smi fehlt', async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error('spawn nvidia-smi ENOENT'), {
        code: 'ENOENT',
      });
    });
    await expect(queryGpus(run)).resolves.toEqual({
      available: false,
      reason: 'no-nvidia',
    });
  });

  it('meldet andere Fehler mit Text', async () => {
    const run = vi.fn(async () => {
      throw new Error('NVIDIA-SMI has failed because it could not communicate');
    });
    await expect(queryGpus(run)).resolves.toMatchObject({
      available: false,
      reason: 'error',
      error: 'NVIDIA-SMI has failed because it could not communicate',
    });
  });
});
