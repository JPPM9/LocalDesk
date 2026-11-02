import { describe, expect, it } from 'vitest';
import {
  failoverOptions,
  modelAfterSwitch,
  OFFLINE_POLLS_NEEDED,
  returnOption,
  shouldOfferFailover,
  type ServerProbe,
} from '../../src/shared/failover';

const probe = (
  profileId: string,
  name: string,
  models: string[],
  online = true,
): ServerProbe => ({
  profileId,
  name,
  baseUrl: `http://${name}:11434`,
  local: false,
  online,
  models,
  ...(online ? { version: '0.40' } : { error: 'nicht erreichbar' }),
});

describe('shouldOfferFailover', () => {
  it('erst nach zwei gescheiterten Prüfungen hintereinander und nur mit anderen Profilen', () => {
    expect(OFFLINE_POLLS_NEEDED).toBe(2);
    expect(shouldOfferFailover(0, 2)).toBe(false);
    expect(shouldOfferFailover(1, 2)).toBe(false);
    expect(shouldOfferFailover(2, 2)).toBe(true);
    expect(shouldOfferFailover(7, 1)).toBe(true);
    expect(shouldOfferFailover(5, 0)).toBe(false);
  });
});

describe('failoverOptions', () => {
  it('zeigt nur erreichbare Server, zuerst die mit dem Modell des Chats', () => {
    const options = failoverOptions(
      [
        probe('a', 'Zimmer', ['gemma4:12b']),
        probe('b', 'Laptop', ['qwen3:14b', 'qwen3-embedding:0.6b']),
        probe('c', 'Aus', [], false),
        probe('d', 'Arbeit', ['qwen3:14b']),
      ],
      'qwen3:14b',
    );
    expect(options.map((o) => o.probe.name)).toEqual([
      'Arbeit',
      'Laptop',
      'Zimmer',
    ]);
    expect(options.map((o) => o.hasModel)).toEqual([true, true, false]);
  });

  it('meldet, ob das Embedding-Modell für „Wissen“ da ist', () => {
    const [laptop, zimmer] = failoverOptions(
      [
        probe('b', 'Laptop', ['m', 'qwen3-embedding:0.6b']),
        probe('a', 'Zimmer', ['m']),
      ],
      'm',
    );
    expect(laptop.hasEmbedding).toBe(true);
    expect(zimmer.hasEmbedding).toBe(false);
  });

  it('ohne gewähltes Modell ist hasModel null', () => {
    expect(
      failoverOptions([probe('a', 'X', ['m'])], undefined)[0].hasModel,
    ).toBeNull();
    expect(
      failoverOptions([probe('a', 'X', ['m'])], '')[0].hasModel,
    ).toBeNull();
  });

  it('ohne erreichbaren Server bleibt die Liste leer', () => {
    expect(failoverOptions([probe('a', 'X', [], false)], 'm')).toEqual([]);
    expect(failoverOptions([], 'm')).toEqual([]);
  });
});

describe('modelAfterSwitch', () => {
  const available = ['gemma4:12b', 'qwen3:14b'];

  it('behält das Modell, wenn der neue Server es hat', () => {
    expect(modelAfterSwitch(available, 'qwen3:14b', 'gemma4:12b')).toBe(
      'qwen3:14b',
    );
  });

  it('nimmt sonst das zuletzt gewählte, wenn es dort ist', () => {
    expect(modelAfterSwitch(available, 'gpt-oss:20b', 'qwen3:14b')).toBe(
      'qwen3:14b',
    );
  });

  it('nimmt sonst das erste installierte', () => {
    expect(modelAfterSwitch(available, 'gpt-oss:20b', 'nicht-da')).toBe(
      'gemma4:12b',
    );
    expect(modelAfterSwitch(available, 'gpt-oss:20b', null)).toBe('gemma4:12b');
  });

  it('ohne Modelle auf dem neuen Server bleibt es beim bisherigen', () => {
    expect(modelAfterSwitch([], 'qwen3:14b', 'gemma4:12b')).toBe('qwen3:14b');
  });
});

describe('returnOption', () => {
  const probes = [
    probe('home', 'Dieser PC', ['m']),
    probe('b', 'Laptop', ['m'], false),
  ];

  it('liefert den früheren Server, wenn er wieder erreichbar ist', () => {
    expect(returnOption(probes, 'home')?.name).toBe('Dieser PC');
  });

  it('nichts, solange er nicht erreichbar ist, unbekannt oder nicht gemerkt', () => {
    expect(returnOption(probes, 'b')).toBeNull();
    expect(returnOption(probes, 'gibt-es-nicht')).toBeNull();
    expect(returnOption(probes, null)).toBeNull();
  });
});
