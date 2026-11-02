import { describe, expect, it } from 'vitest';
import type {
  ModelInfo,
  ProviderStatus,
  ServerProfile,
} from '../../src/shared/api';
import type { Provider } from '../../src/main/providers/provider';
import { probeServers } from '../../src/main/server-probe';

const profile = (
  id: string,
  baseUrl: string,
  active = false,
): ServerProfile => ({
  id,
  name: id,
  baseUrl,
  active,
});

const model = (name: string): ModelInfo => ({
  name,
  sizeBytes: 1,
  modifiedAt: '',
  capabilities: [],
});

/** Server-Nachbau je Adresse: Status, Modelle oder ein Fehler beim Abfragen. */
function providers(
  table: Record<
    string,
    {
      status: ProviderStatus;
      models?: string[];
      modelsFail?: boolean;
      throws?: string;
    }
  >,
) {
  const asked: string[] = [];
  const make = (baseUrl: string): Provider => {
    asked.push(baseUrl);
    const entry = table[baseUrl];
    return {
      baseUrl,
      checkStatus: async () => {
        if (entry.throws) throw new Error(entry.throws);
        return entry.status;
      },
      listModels: async () =>
        entry.modelsFail
          ? { ok: false as const, error: 'kaputt' }
          : { ok: true as const, value: (entry.models ?? []).map(model) },
    } as unknown as Provider;
  };
  return { make, asked };
}

const online = (baseUrl: string): ProviderStatus => ({
  online: true,
  baseUrl,
  version: '0.40.13',
});
const offline = (baseUrl: string): ProviderStatus => ({
  online: false,
  baseUrl,
  error: 'Zeitüberschreitung',
});

describe('probeServers', () => {
  it('fragt nur die nicht aktiven Profile ab', async () => {
    const { make, asked } = providers({
      'http://localhost:11434': { status: online('http://localhost:11434') },
      'http://192.168.1.20:11434': {
        status: online('http://192.168.1.20:11434'),
        models: ['qwen3:14b', 'gemma4:12b'],
      },
    });
    const result = await probeServers(
      [
        profile('local', 'http://localhost:11434', true),
        profile('laptop', 'http://192.168.1.20:11434'),
      ],
      make,
    );
    expect(asked).toEqual(['http://192.168.1.20:11434']);
    expect(result).toEqual([
      {
        profileId: 'laptop',
        name: 'laptop',
        baseUrl: 'http://192.168.1.20:11434',
        local: false,
        online: true,
        version: '0.40.13',
        models: ['qwen3:14b', 'gemma4:12b'],
      },
    ]);
  });

  it('meldet nicht erreichbare Server mit Grund und ohne Modelle', async () => {
    const { make } = providers({
      'http://10.0.0.5:11434': { status: offline('http://10.0.0.5:11434') },
    });
    const [result] = await probeServers(
      [profile('x', 'http://10.0.0.5:11434')],
      make,
    );
    expect(result).toMatchObject({
      online: false,
      error: 'Zeitüberschreitung',
      models: [],
    });
  });

  it('übersteht einen Server, der beim Abfragen wirft oder die Modelle nicht liefert', async () => {
    const { make } = providers({
      'http://a:11434': { status: online('http://a:11434'), throws: 'kaputt' },
      'http://b:11434': { status: online('http://b:11434'), modelsFail: true },
    });
    const result = await probeServers(
      [profile('a', 'http://a:11434'), profile('b', 'http://b:11434')],
      make,
    );
    expect(result[0]).toMatchObject({
      online: false,
      error: 'kaputt',
      models: [],
    });
    expect(result[1]).toMatchObject({ online: true, models: [] });
  });

  it('erkennt, ob ein Profil auf diesen PC zeigt', async () => {
    const { make } = providers({
      'http://127.0.0.1:11434': { status: online('http://127.0.0.1:11434') },
      'http://127.0.0.2:21434': { status: online('http://127.0.0.2:21434') },
    });
    const result = await probeServers(
      [
        profile('a', 'http://127.0.0.1:11434'),
        profile('b', 'http://127.0.0.2:21434'),
      ],
      make,
    );
    expect(result.map((p) => p.local)).toEqual([true, false]);
  });

  it('fragt parallel ab, nicht nacheinander', async () => {
    const started: number[] = [];
    const make = (baseUrl: string) =>
      ({
        baseUrl,
        checkStatus: async () => {
          started.push(Date.now());
          await new Promise((r) => setTimeout(r, 60));
          return online(baseUrl);
        },
        listModels: async () => ({ ok: true as const, value: [] }),
      }) as unknown as Provider;
    const t0 = Date.now();
    await probeServers(
      [
        profile('a', 'http://a:1'),
        profile('b', 'http://b:1'),
        profile('c', 'http://c:1'),
      ],
      make,
    );
    expect(Date.now() - t0).toBeLessThan(170);
    expect(Math.max(...started) - Math.min(...started)).toBeLessThan(40);
  });

  it('ohne andere Profile gibt es nichts abzufragen', async () => {
    const { make, asked } = providers({});
    expect(
      await probeServers([profile('x', 'http://localhost:11434', true)], make),
    ).toEqual([]);
    expect(asked).toEqual([]);
  });
});
