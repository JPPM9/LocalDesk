import { describe, expect, it } from 'vitest';
import type { MessageRecord, ModelInfo } from '../../src/shared/api';
import {
  buildChatRequest,
  normalizeSettings,
  thinkFitsModel,
  thinkStyle,
} from '../../src/shared/settings';

describe('normalizeSettings', () => {
  it('übernimmt gültige Werte', () => {
    expect(
      normalizeSettings({
        systemPrompt: 'Du bist ein Python-Tutor.',
        temperature: 0.7,
        contextLength: 16384,
        seed: 42,
        think: false,
      }),
    ).toEqual({
      systemPrompt: 'Du bist ein Python-Tutor.',
      temperature: 0.7,
      contextLength: 16384,
      seed: 42,
      think: false,
    });
  });

  it('begrenzt Werte auf den erlaubten Bereich', () => {
    expect(normalizeSettings({ temperature: 5, contextLength: 10 })).toEqual({
      temperature: 2,
      contextLength: 512,
    });
    expect(normalizeSettings({ temperature: -1 }).temperature).toBe(0);
  });

  it('verwirft Unsinn statt abzustürzen', () => {
    expect(
      normalizeSettings({
        systemPrompt: '   ',
        temperature: 'heiß',
        contextLength: Number.NaN,
        seed: 1.5,
        think: 'vielleicht',
        fremd: 'feld',
      }),
    ).toEqual({});
    expect(normalizeSettings(null)).toEqual({});
    expect(normalizeSettings('text')).toEqual({});
  });

  it('kennt die Denk-Stufen von gpt-oss', () => {
    expect(normalizeSettings({ think: 'low' })).toEqual({ think: 'low' });
  });

  it('übernimmt die gewählten MCP-Server ohne Doppelte und Unsinn', () => {
    expect(
      normalizeSettings({ mcpServers: ['fs-1', 'fs-2', 'fs-1', '', 42, null] }),
    ).toEqual({ mcpServers: ['fs-1', 'fs-2'] });
  });

  it('lässt eine leere Server-Liste weg (= keine Tools)', () => {
    expect(normalizeSettings({ mcpServers: [] })).toEqual({});
    expect(normalizeSettings({ mcpServers: 'fs-1' })).toEqual({});
  });

  it('übernimmt die gewählten Wissenssammlungen genauso', () => {
    expect(
      normalizeSettings({ collections: ['k1', 'k1', 'k2', 7], mcpServers: [] }),
    ).toEqual({ collections: ['k1', 'k2'] });
    expect(normalizeSettings({ collections: [] })).toEqual({});
  });
});

describe('buildChatRequest', () => {
  const history: MessageRecord[] = [
    { id: 'u1', role: 'user', content: 'Hallo', thinking: '', status: 'done' },
  ];

  it('setzt den Systemprompt an den Anfang', () => {
    const request = buildChatRequest('qwen3:14b', history, {
      systemPrompt: 'Antworte kurz.',
    });
    expect(request.messages).toEqual([
      { role: 'system', content: 'Antworte kurz.' },
      { role: 'user', content: 'Hallo' },
    ]);
  });

  it('schickt nur gesetzte Optionen mit', () => {
    expect(buildChatRequest('m', history, {})).toEqual({
      model: 'm',
      messages: [{ role: 'user', content: 'Hallo' }],
    });
    expect(
      buildChatRequest('m', history, { contextLength: 8192, think: 'high' }),
    ).toMatchObject({ options: { contextLength: 8192 }, think: 'high' });
  });

  it('schickt temperature 0 und think false mit (falsy, aber gesetzt)', () => {
    const request = buildChatRequest('m', history, {
      temperature: 0,
      think: false,
    });
    expect(request.options).toEqual({ temperature: 0 });
    expect(request.think).toBe(false);
  });
});

describe('thinkStyle', () => {
  const model = (family: string, capabilities: string[]): ModelInfo => ({
    name: 'x',
    sizeBytes: 0,
    modifiedAt: '',
    family,
    capabilities,
  });

  it('unterscheidet an/aus, Stufen und kein Denken', () => {
    expect(thinkStyle(model('qwen3', ['completion', 'thinking']))).toBe(
      'toggle',
    );
    expect(thinkStyle(model('gptoss', ['completion', 'thinking']))).toBe(
      'levels',
    );
    expect(thinkStyle(model('llama', ['completion']))).toBe('none');
    expect(thinkStyle(undefined)).toBe('none');
  });

  it('erkennt, ob eine Denken-Einstellung nach einem Modellwechsel noch passt', () => {
    const qwen = model('qwen3', ['completion', 'thinking']);
    const gptOss = model('gptoss', ['completion', 'thinking']);
    const llama = model('llama', ['completion']);

    expect(thinkFitsModel(false, qwen)).toBe(true);
    expect(thinkFitsModel(false, gptOss)).toBe(false);
    expect(thinkFitsModel('low', gptOss)).toBe(true);
    expect(thinkFitsModel('low', qwen)).toBe(false);
    expect(thinkFitsModel(true, llama)).toBe(false);
    expect(thinkFitsModel(undefined, llama)).toBe(true);
  });
});
