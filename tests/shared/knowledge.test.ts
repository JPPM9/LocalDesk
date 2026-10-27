import { describe, expect, it } from 'vitest';
import type { MessageRecord, SourceRef } from '../../src/shared/api';
import {
  knowledgeQuery,
  sourceLabel,
  withKnowledge,
} from '../../src/shared/knowledge';

const user = (content: string): MessageRecord => ({
  id: content,
  role: 'user',
  content,
  thinking: '',
  status: 'done',
});

const source: SourceRef = {
  n: 1,
  collectionId: 'k',
  collectionName: 'Verträge',
  documentId: 'd',
  path: 'C:\\docs\\skript.pdf',
  page: 12,
  text: 'Der Median ist robust.',
  score: 0.7,
};

describe('knowledgeQuery', () => {
  it('nimmt bei kurzen Nachfragen die vorige Frage dazu', () => {
    expect(
      knowledgeQuery(
        [user('Wie hoch ist die Kündigungsfrist im Mietvertrag?')],
        'Und die Nebenkosten?',
      ),
    ).toBe(
      'Wie hoch ist die Kündigungsfrist im Mietvertrag?\nUnd die Nebenkosten?',
    );
  });

  it('nimmt die vorige Frage nicht dazu, wenn die neue ein eigenes Thema hat', () => {
    const history = [user('Does the Apache license grant patent rights?')];
    expect(
      knowledgeQuery(history, 'Wer hat die Fußball-WM 2014 gewonnen?'),
    ).toBe('Wer hat die Fußball-WM 2014 gewonnen?');
    expect(knowledgeQuery(history, 'Und darf ich eine Katze halten?')).toBe(
      'Und darf ich eine Katze halten?',
    );
    expect(knowledgeQuery(history, 'Und was noch?')).toBe(
      'Does the Apache license grant patent rights?\nUnd was noch?',
    );
  });

  it('lässt lange Fragen und erste Fragen unverändert', () => {
    const long =
      'Erkläre mir ausführlich, was im Skript über den Median und Ausreißer steht.';
    expect(knowledgeQuery([user('Vorher')], long)).toBe(long);
    expect(knowledgeQuery([], 'Kurz?')).toBe('Kurz?');
  });
});

describe('sourceLabel', () => {
  it('zeigt Dateiname und Seite', () => {
    expect(sourceLabel(source)).toBe('skript.pdf, S. 12');
    expect(sourceLabel({ path: 'C:\\a\\notiz.md' })).toBe('notiz.md');
  });
});

describe('withKnowledge', () => {
  const request = {
    model: 'qwen3:14b',
    messages: [
      { role: 'system' as const, content: 'Sei knapp.' },
      { role: 'user' as const, content: 'Was ist der Median?' },
    ],
  };

  it('gibt der letzten Frage die Auszüge mit Nummern mit', () => {
    const result = withKnowledge(request, [source]);
    expect(result.messages[0]).toEqual(request.messages[0]);
    expect(result.messages[1].content).toContain(
      '[1] skript.pdf, S. 12\nDer Median ist robust.',
    );
    expect(result.messages[1].content).toMatch(/Frage: Was ist der Median\?$/);
    expect(result.messages[1].content).toContain('ehrlich');
    // Das Original bleibt unverändert (gespeichert wird die Frage ohne Auszüge).
    expect(request.messages[1].content).toBe('Was ist der Median?');
  });

  it('ändert nichts ohne Quellen', () => {
    expect(withKnowledge(request, [])).toBe(request);
  });
});
