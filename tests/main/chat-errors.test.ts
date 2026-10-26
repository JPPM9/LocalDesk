import { describe, expect, it } from 'vitest';
import { describeChatError } from '../../src/main/chat-errors';

describe('describeChatError', () => {
  it('erklärt fehlende Tool-Fähigkeit', () => {
    expect(
      describeChatError(
        new Error(
          'registry.ollama.ai/library/gemma3:4b does not support tools',
        ),
      ),
    ).toContain('kann keine Tools benutzen');
  });

  it('erklärt Ladeabstürze und behält die Originalmeldung (gesehen mit Ollama 0.40.11)', () => {
    const original =
      'llama-server process has terminated: exit status 0xc0000409: CUDA error: shared object initialization failed';
    const text = describeChatError(new Error(original));
    expect(text).toContain('Ollama konnte das Modell nicht laden');
    expect(text).toContain(original);
  });

  it('lässt unbekannte Fehler unverändert', () => {
    expect(describeChatError(new Error('model not found'))).toBe(
      'model not found',
    );
    expect(describeChatError('kaputt')).toBe('kaputt');
  });
});
