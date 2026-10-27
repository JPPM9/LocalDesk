import { describe, expect, it } from 'vitest';
import type { MessageRecord } from '../../src/shared/api';
import {
  parseSummary,
  shouldSuggestSummary,
  SUMMARY_IDLE_MS,
  summaryMessages,
} from '../../src/shared/summary';

const now = 10 * SUMMARY_IDLE_MS;
const idle = now - SUMMARY_IDLE_MS;

describe('shouldSuggestSummary', () => {
  it('schlägt ab 6 Nachrichten und 30 Minuten Ruhe vor', () => {
    expect(
      shouldSuggestSummary({ messageCount: 6, updatedAt: idle }, now),
    ).toBe(true);
    expect(
      shouldSuggestSummary({ messageCount: 5, updatedAt: idle }, now),
    ).toBe(false);
    expect(
      shouldSuggestSummary({ messageCount: 6, updatedAt: idle + 1 }, now),
    ).toBe(false);
  });

  it('kommt nach Speichern oder „Nein danke“ erst nach 6 neuen Nachrichten wieder', () => {
    const chat = { updatedAt: idle, summaryAtCount: 8 };
    expect(shouldSuggestSummary({ ...chat, messageCount: 8 }, now)).toBe(false);
    expect(shouldSuggestSummary({ ...chat, messageCount: 13 }, now)).toBe(
      false,
    );
    expect(shouldSuggestSummary({ ...chat, messageCount: 14 }, now)).toBe(true);
  });
});

const msg = (role: 'user' | 'assistant', content: string): MessageRecord => ({
  id: content,
  role,
  content,
  thinking: 'geheim',
  status: 'done',
});

describe('summaryMessages', () => {
  it('gibt das Gespräch ohne Gedanken und leere Antworten weiter', () => {
    const [system, user] = summaryMessages([
      msg('user', 'Frage A'),
      msg('assistant', 'Antwort A'),
      msg('assistant', ''),
    ]);
    expect(system.role).toBe('system');
    expect(user.content).toContain('Nutzer: Frage A\n\nAssistent: Antwort A');
    expect(user.content).not.toContain('geheim');
  });

  it('kürzt lange Gespräche vorne', () => {
    const [, user] = summaryMessages([
      msg('user', 'ANFANG ' + 'x'.repeat(30_000)),
      msg('assistant', 'ENDE'),
    ]);
    expect(user.content).toContain('ältere Teile ausgelassen');
    expect(user.content).not.toContain('ANFANG');
    expect(user.content).toContain('ENDE');
  });
});

describe('parseSummary', () => {
  it('nimmt die erste Zeile als Titel', () => {
    expect(parseSummary('# **Median und Mittelwert**\n\n- Punkt', 'X')).toEqual(
      {
        title: 'Median und Mittelwert',
        text: '- Punkt',
      },
    );
    expect(parseSummary('Titel: Lernplan\n- a', 'X').title).toBe('Lernplan');
  });

  it('nutzt den Ersatztitel, wenn die erste Zeile kein Titel ist', () => {
    const long = 'a'.repeat(150);
    expect(parseSummary(long, 'Chat-Titel')).toEqual({
      title: 'Chat-Titel',
      text: long,
    });
  });
});
