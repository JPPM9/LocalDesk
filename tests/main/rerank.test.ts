import { describe, expect, it } from 'vitest';
import type {
  ChatChunk,
  ChatRequest,
  ModelInfo,
  SourceRef,
} from '../../src/shared/api';
import { rerankSources } from '../../src/main/rag/rerank';
import type { Provider } from '../../src/main/providers/provider';

const source = (n: number): SourceRef => ({
  n,
  collectionId: 'c',
  collectionName: 'S',
  documentId: `d${n}`,
  path: `datei${n}.md`,
  text: `Text ${n}`,
  score: 0.5,
});
const sources = [source(1), source(2), source(3)];

const modelInfo = (capabilities: string[]): ModelInfo => ({
  name: 'm',
  sizeBytes: 1,
  modifiedAt: '',
  capabilities,
});

/** Provider-Nachbau: antwortet mit `answer`, merkt sich die Anfrage. */
function fakeProvider(
  behavior: (
    request: ChatRequest,
    signal: AbortSignal,
  ) => AsyncGenerator<ChatChunk>,
  capabilities: string[] = ['completion', 'thinking'],
) {
  const requests: ChatRequest[] = [];
  const provider = {
    listModels: async () => ({
      ok: true as const,
      value: [modelInfo(capabilities)],
    }),
    chat: (request: ChatRequest, signal: AbortSignal) => {
      requests.push(request);
      return behavior(request, signal);
    },
  } as unknown as Provider;
  return { provider, requests };
}

const answers = (text: string) =>
  async function* (): AsyncGenerator<ChatChunk> {
    yield { type: 'content', text };
    yield { type: 'done' } as ChatChunk;
  };

const options = (signal = new AbortController().signal) => ({
  model: 'm',
  contextLength: 4096,
  signal,
});

describe('rerankSources', () => {
  it('liefert die vom Modell gewählte Reihenfolge', async () => {
    const { provider } = fakeProvider(answers('{"ranking":[3,1,2]}'));
    const result = await rerankSources(provider, 'Frage?', sources, options());
    expect(result?.map((s) => s.n)).toEqual([3, 1, 2]);
  });

  it('fragt mit Format, ohne Denken, mit dem Kontext des Chats und Temperatur 0', async () => {
    const { provider, requests } = fakeProvider(answers('{"ranking":[1]}'));
    await rerankSources(provider, 'Frage?', sources, options());
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      model: 'm',
      think: false,
      options: { contextLength: 4096, temperature: 0 },
      format: { required: ['ranking'] },
    });
    expect(requests[0].messages[1].content).toContain('Frage: Frage?');
  });

  it('schaltet bei gpt-oss das Denken auf niedrig statt aus', async () => {
    const { provider, requests } = fakeProvider(answers('{"ranking":[1]}'), [
      'completion',
      'thinking',
    ]);
    (provider as unknown as { listModels: () => Promise<unknown> }).listModels =
      async () => ({
        ok: true,
        value: [
          {
            ...modelInfo(['completion', 'thinking']),
            name: 'gpt-oss:20b',
            family: 'gptoss',
          },
        ],
      });
    await rerankSources(provider, 'F', sources, {
      ...options(),
      model: 'gpt-oss:20b',
    });
    expect(requests[0].think).toBe('low');
  });

  it('gibt null zurück bei unlesbarer Antwort, Fehler und zu wenig Kandidaten', async () => {
    const bad = fakeProvider(answers('Hier sind meine Gedanken …'));
    expect(
      await rerankSources(bad.provider, 'F', sources, options()),
    ).toBeNull();

    const broken = fakeProvider(async function* () {
      throw new Error('Ollama aus');
      yield { type: 'content', text: '' } as ChatChunk;
    });
    expect(
      await rerankSources(broken.provider, 'F', sources, options()),
    ).toBeNull();

    const none = fakeProvider(answers('{"ranking":[1]}'));
    expect(
      await rerankSources(none.provider, 'F', [source(1)], options()),
    ).toBeNull();
    expect(none.requests).toHaveLength(0);
  });

  it('bricht nach dem Zeitlimit ab und gibt null zurück', async () => {
    const slow = fakeProvider(async function* (_request, signal) {
      await new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () =>
          reject(new Error('abgebrochen')),
        ),
      );
      yield { type: 'content', text: '' } as ChatChunk;
    });
    const started = Date.now();
    const result = await rerankSources(slow.provider, 'F', sources, {
      ...options(),
      timeoutMs: 50,
    });
    expect(result).toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('Stopp der Antwort bricht auch das Sortieren ab', async () => {
    const controller = new AbortController();
    const slow = fakeProvider(async function* (_request, signal) {
      await new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () =>
          reject(new Error('abgebrochen')),
        ),
      );
      yield { type: 'content', text: '' } as ChatChunk;
    });
    const pending = rerankSources(
      slow.provider,
      'F',
      sources,
      options(controller.signal),
    );
    setTimeout(() => controller.abort(), 20);
    expect(await pending).toBeNull();
  });

  it('ergänzt fehlende Nummern in der alten Reihenfolge', async () => {
    const { provider } = fakeProvider(answers('{"ranking":[2]}'));
    const result = await rerankSources(provider, 'F', sources, options());
    expect(result?.map((s) => s.n)).toEqual([2, 1, 3]);
  });
});
