import { describe, expect, it } from 'vitest';
import {
  contextUsage,
  estimateContextParts,
  estimateTokens,
  kvBytesPerToken,
  suggestContextLength,
} from '../../src/shared/context';

describe('estimateTokens', () => {
  it('rechnet mit ~4 Zeichen pro Token (JSON: 5,5)', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('x'.repeat(400))).toBe(100);
    expect(estimateTokens('x'.repeat(550), 5.5)).toBe(100);
  });
});

describe('contextUsage', () => {
  const parts = { instructions: 100, history: 1500, knowledge: 1800, tools: 0 };

  it('summiert die Anteile und bewertet den freien Platz', () => {
    expect(contextUsage(parts, 8192)).toMatchObject({
      used: 3400,
      level: 'ok',
    });
    // 4096 − 3400 = 696 frei → weniger als Platz für eine Antwort
    expect(contextUsage(parts, 4096).level).toBe('tight');
    expect(contextUsage({ ...parts, tools: 1500 }, 4096)).toMatchObject({
      level: 'full',
      ratio: 4900 / 4096,
    });
  });
});

describe('suggestContextLength', () => {
  it('schlägt die nächste passende Stufe vor', () => {
    expect(suggestContextLength(3400, 4096)).toBe(8192);
    expect(suggestContextLength(9000, 4096)).toBe(16384);
  });

  it('bleibt beim Maximum des Modells und meldet, wenn nichts mehr geht', () => {
    expect(suggestContextLength(50_000, 4096, 40_960)).toBe(40_960);
    expect(suggestContextLength(50_000, 40_960, 40_960)).toBeNull();
  });
});

// Angaben wie von Ollama 0.40.11 (/api/show, model_info), gekürzt.
const qwen3 = {
  'general.architecture': 'qwen3',
  'qwen3.block_count': 40,
  'qwen3.attention.head_count_kv': 8,
  'qwen3.attention.key_length': 128,
  'qwen3.attention.value_length': 128,
};
const gemma4 = {
  'general.architecture': 'gemma4',
  'gemma4.block_count': 6,
  'gemma4.attention.head_count_kv': [8, 8, 8, 8, 8, 1],
  'gemma4.attention.key_length': 512,
  'gemma4.attention.value_length': 512,
  'gemma4.attention.sliding_window': 1024,
  'gemma4.attention.sliding_window_pattern': [
    true,
    true,
    true,
    true,
    true,
    false,
  ],
};

describe('kvBytesPerToken', () => {
  it('rechnet Schichten × KV-Köpfe × (Schlüssel + Wert) × 2 Byte, plus Puffer', () => {
    // 40 × 8 × 256 × 2 = 163 840 Byte, × 1,2 (gemessen: 178 KB)
    expect(kvBytesPerToken(qwen3)).toBe(196_608);
  });

  it('zählt Sliding-Window-Schichten nicht mit', () => {
    // nur die letzte Schicht wächst: 1 × 1024 × 2 × 1,2
    expect(kvBytesPerToken(gemma4)).toBe(2458);
  });

  it('gibt auf, wenn sich nicht sagen lässt, welche Schichten wachsen (gpt-oss)', () => {
    expect(
      kvBytesPerToken({
        'general.architecture': 'gptoss',
        'gptoss.block_count': 24,
        'gptoss.attention.head_count_kv': 8,
        'gptoss.attention.key_length': 64,
        'gptoss.attention.value_length': 64,
        'gptoss.attention.sliding_window': 128,
      }),
    ).toBeNull();
    expect(kvBytesPerToken({})).toBeNull();
  });
});

describe('estimateContextParts', () => {
  const base = {
    instructions: '',
    history: [],
    knowledgeActive: false,
    lastSources: undefined,
    tools: [],
  };

  it('zählt Verlauf mit Tool-Aufrufen und Anweisungen', () => {
    const parts = estimateContextParts({
      ...base,
      instructions: 'x'.repeat(40),
      history: [
        { role: 'user', content: 'x'.repeat(400) },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ name: 'read_text_file', arguments: { path: 'a.md' } }],
        },
      ],
    });
    expect(parts.instructions).toBe(10);
    expect(parts.history).toBeGreaterThan(100 + 4);
    expect(parts).toMatchObject({ knowledge: 0, tools: 0 });
  });

  it('nimmt für Wissen die Auszüge der letzten Antwort, sonst einen typischen Wert', () => {
    expect(
      estimateContextParts({
        ...base,
        knowledgeActive: true,
        lastSources: [{ text: 'x'.repeat(800) }],
      }).knowledge,
    ).toBe(200 + 90);
    expect(
      estimateContextParts({ ...base, knowledgeActive: true }).knowledge,
    ).toBe(2325);
  });

  it('schätzt Tools nach ihrer Beschreibung', () => {
    const tools = [
      {
        name: 'read_text_file',
        description: 'Liest eine Datei',
        parameters: { type: 'object' },
      },
    ];
    expect(estimateContextParts({ ...base, tools }).tools).toBeGreaterThan(20);
  });
});
