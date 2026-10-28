import { describe, expect, it } from 'vitest';
import { checkGoogleApp } from '../../src/shared/mail';

const ID =
  '123456789012-abcdefghij0123456789klmnopqrstuv.apps.googleusercontent.com';

describe('checkGoogleApp', () => {
  it('nimmt die Werte aus der Console an und entfernt Leerzeichen', () => {
    expect(
      checkGoogleApp({
        clientId: ` ${ID}\n`,
        clientSecret: ' GOCSPX-abc_DEF-123 ',
      }),
    ).toEqual({
      ok: true,
      value: { clientId: ID, clientSecret: 'GOCSPX-abc_DEF-123' },
    });
  });

  it('lehnt falsche Client-IDs ab', () => {
    for (const clientId of [
      '',
      'abc.apps.googleusercontent.com',
      `${ID}.evil.com`,
      ID.replace('.apps.', '.app.'),
    ]) {
      expect(
        checkGoogleApp({ clientId, clientSecret: 'GOCSPX-abcdef123' }).ok,
      ).toBe(false);
    }
  });

  it('lehnt leere oder seltsame Schlüssel ab', () => {
    expect(checkGoogleApp({ clientId: ID, clientSecret: '' }).ok).toBe(false);
    expect(
      checkGoogleApp({ clientId: ID, clientSecret: 'a b c d e f g h' }).ok,
    ).toBe(false);
    expect(checkGoogleApp(null).ok).toBe(false);
  });
});
