import { describe, expect, it } from 'vitest';
import type { MessageRecord as UiMessage } from '../../src/shared/api';
import { applyChatEvent } from '../../src/shared/chat';

const user: UiMessage = {
  id: 'u1',
  role: 'user',
  content: 'Hallo',
  thinking: '',
  status: 'done',
};
const answer: UiMessage = {
  id: 'r1',
  role: 'assistant',
  content: '',
  thinking: '',
  status: 'streaming',
  model: 'qwen3:14b',
};

describe('applyChatEvent', () => {
  it('hängt Text und Gedanken an die passende Antwort an', () => {
    let messages = [user, answer];
    messages = applyChatEvent(messages, {
      requestId: 'r1',
      type: 'thinking',
      text: 'Hm',
    });
    messages = applyChatEvent(messages, {
      requestId: 'r1',
      type: 'content',
      text: 'Hal',
    });
    messages = applyChatEvent(messages, {
      requestId: 'r1',
      type: 'content',
      text: 'lo!',
    });

    expect(messages[1]).toMatchObject({
      thinking: 'Hm',
      content: 'Hallo!',
      status: 'streaming',
    });
    expect(messages[0]).toBe(user); // andere Nachrichten bleiben unverändert
  });

  it('ignoriert Ereignisse für andere Anfragen', () => {
    const messages = applyChatEvent([user, answer], {
      requestId: 'fremd',
      type: 'content',
      text: 'x',
    });
    expect(messages[1].content).toBe('');
  });

  it('setzt Status und Statistik am Ende', () => {
    const stats = {
      outputTokens: 3,
      tokensPerSecond: 37.4,
      promptTokens: 22,
      totalMs: 2638,
    };
    const [, done] = applyChatEvent([user, answer], {
      requestId: 'r1',
      type: 'done',
      stats,
    });
    expect(done).toMatchObject({ status: 'done', stats });
  });

  it('merkt sich Fehler und Abbrüche', () => {
    const [, failed] = applyChatEvent([user, answer], {
      requestId: 'r1',
      type: 'error',
      error: 'out of memory',
    });
    expect(failed).toMatchObject({ status: 'error', error: 'out of memory' });

    const [, aborted] = applyChatEvent([user, answer], {
      requestId: 'r1',
      type: 'aborted',
    });
    expect(aborted.status).toBe('aborted');
  });
});
