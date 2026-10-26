import { describe, expect, it, vi } from 'vitest';
import { OllamaProvider } from '../../src/main/providers/ollama';

const fakeFetch = (response: Response) =>
  vi.fn(async () => response) as unknown as typeof fetch;

// Echte Antwort von Ollama 0.40.11 (gekürzt): qwen3 mit 32K Kontext, ganz im VRAM
const qwen = {
  name: 'qwen3:14b',
  model: 'qwen3:14b',
  size: 14383820307,
  details: { parameter_size: '14.8B', quantization_level: 'Q4_K_M' },
  expires_at: '2026-10-26T18:56:12.6372747+01:00',
  size_vram: 14383820307,
  context_length: 32768,
};

describe('OllamaProvider.listRunning', () => {
  it('liest geladene Modelle aus /api/ps', async () => {
    const fetch = fakeFetch(Response.json({ models: [qwen] }));
    const result = await new OllamaProvider({ fetch }).listRunning();

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/ps',
      expect.anything(),
    );
    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: 'qwen3:14b',
          sizeBytes: 14383820307,
          vramBytes: 14383820307,
          contextLength: 32768,
          parameterSize: '14.8B',
          quantization: 'Q4_K_M',
          expiresAt: '2026-10-26T18:56:12.6372747+01:00',
        },
      ],
    });
  });

  it('meldet eine leere Liste, wenn kein Modell geladen ist', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(Response.json({ models: [] })),
    });
    await expect(provider.listRunning()).resolves.toEqual({
      ok: true,
      value: [],
    });
  });

  it('übersteht fehlende Felder und begrenzt VRAM auf die Gesamtgröße', async () => {
    const provider = new OllamaProvider({
      fetch: fakeFetch(
        Response.json({
          models: [{ name: 'alt:7b', size: 100, size_vram: 999 }, { size: 1 }],
        }),
      ),
    });
    const result = await provider.listRunning();
    expect(result.ok && result.value).toEqual([
      {
        name: 'alt:7b',
        sizeBytes: 100,
        vramBytes: 100,
        contextLength: undefined,
        parameterSize: undefined,
        quantization: undefined,
        expiresAt: undefined,
      },
    ]);
  });

  it('meldet Verbindungsfehler verständlich', async () => {
    const provider = new OllamaProvider({
      fetch: vi.fn(async () => {
        throw new TypeError('fetch failed', {
          cause: { code: 'ECONNREFUSED' },
        });
      }) as unknown as typeof fetch,
    });
    await expect(provider.listRunning()).resolves.toEqual({
      ok: false,
      error: 'Nicht erreichbar – läuft Ollama?',
    });
  });
});
