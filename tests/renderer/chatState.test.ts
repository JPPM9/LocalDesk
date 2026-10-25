import { describe, expect, it } from 'vitest';
import {
  applyChatEvent,
  toRequestMessages,
  type UiMessage,
} from '../../src/renderer/chat/chatState';

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

describe('toRequestMessages', () => {
  it('schickt nur Rolle und Text, ohne Gedanken, Fehler oder leere Antworten', () => {
    const messages: UiMessage[] = [
      user,
      { ...answer, content: 'Hallo!', thinking: 'geheim', status: 'done' },
      { ...user, id: 'u2', content: 'Und jetzt?' },
      { ...answer, id: 'r2', status: 'error', error: 'kaputt' },
      { ...answer, id: 'r3', content: '' },
    ];

    expect(toRequestMessages(messages)).toEqual([
      { role: 'user', content: 'Hallo' },
      { role: 'assistant', content: 'Hallo!' },
      { role: 'user', content: 'Und jetzt?' },
    ]);
  });

  it('behält abgebrochene Antworten mit Text als Kontext', () => {
    const messages: UiMessage[] = [
      user,
      { ...answer, content: 'Teil', status: 'aborted' },
    ];
    expect(toRequestMessages(messages)).toHaveLength(2);
  });
});
