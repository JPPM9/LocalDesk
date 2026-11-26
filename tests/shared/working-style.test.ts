import { describe, expect, it } from 'vitest';
import { buildChatRequest } from '../../src/shared/settings';
import {
  withWorkingStyle,
  workingStylePrompt,
} from '../../src/shared/working-style';

describe('Arbeitsweise', () => {
  it('der Text nennt die vier Regeln', () => {
    const text = workingStylePrompt();
    for (const n of ['1.', '2.', '3.', '4.']) expect(text).toContain(n);
    expect(text.length).toBeLessThan(1400); // grob 250 Token, nicht mehr
  });

  it('steht vor den übrigen Anweisungen', () => {
    const joined = withWorkingStyle(true, 'Nur Projekt') ?? '';
    expect(joined.endsWith('Nur Projekt')).toBe(true);
    expect(joined.startsWith(workingStylePrompt())).toBe(true);
  });

  it('fehlt ganz, wenn ausgeschaltet und nichts anderes da ist', () => {
    expect(withWorkingStyle(false, undefined)).toBeUndefined();
    expect(withWorkingStyle(false, '  ')).toBeUndefined();
    expect(withWorkingStyle(false, 'Projekt')).toBe('Projekt');
  });

  it('landet als erste System-Nachricht der Anfrage', () => {
    const request = buildChatRequest(
      'm',
      [],
      { systemPrompt: 'Chat' },
      withWorkingStyle(true, 'Projekt'),
    );
    expect(request.messages[0].role).toBe('system');
    const content = request.messages[0].content;
    expect(content.indexOf(workingStylePrompt())).toBe(0);
    expect(content.indexOf('Projekt')).toBeLessThan(content.indexOf('Chat'));
  });
});
