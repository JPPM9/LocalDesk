import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  describeGmailError,
  GOOGLE_SCOPE,
  GOOGLE_URLS,
  signInWithGoogle,
} from '../../src/main/mail/google-auth';
import type { MailClient } from '../../src/main/mail/mail-client';
import { guardedFetch, type Fetch } from '../../src/main/mail/mail-fetch';
import {
  callMailTool,
  describeMailChange,
  mailChanges,
  mailTools,
} from '../../src/main/mail/mail-tools';
import {
  checkGoogleApp,
  checkMailChange,
  isMailReauthMessage,
  mailReauthMessage,
  type MailLabel,
  type MailMessage,
  type MailSummary,
} from '../../src/shared/mail';
import { setMessageLanguage } from '../../src/shared/messages';

const ALL: MailLabel[] = [
  { id: 'INBOX', name: 'INBOX', type: 'system' },
  { id: 'Label_1', name: 'Rechnungen', type: 'user' },
];
const OWN = ALL.filter((l) => l.type === 'user');

const summary: MailSummary = {
  id: 'm1',
  threadId: 't1',
  from: 'Bank <info@bank.example>',
  subject: '',
  date: new Date(2026, 9, 28, 9, 30).getTime(),
  snippet: 'Pay by Friday',
  unread: true,
  starred: false,
  labelIds: ['INBOX', 'Label_1'],
};

const client: MailClient = {
  list: async () => ({ messages: [summary] }),
  get: async (): Promise<MailMessage> => ({
    ...summary,
    to: 'me@gmail.com',
    cc: '',
    text: 'Hello',
    truncated: false,
    attachments: [{ name: 'bill.pdf', size: 1 }],
  }),
  summaries: async () => [summary],
  labels: async () => ALL,
  apply: async () => {},
};

beforeEach(() => setMessageLanguage('en'));
afterEach(() => setMessageLanguage('de'));

const message = (task: () => unknown) =>
  Promise.resolve()
    .then(task)
    .then(
      () => 'kein Fehler',
      (error: Error) => error.message,
    );

describe('E-Mail auf Englisch', () => {
  it('Prüfung der Google-App und der Änderungen', () => {
    expect(checkGoogleApp({ clientId: 'x', clientSecret: 'y' })).toEqual({
      ok: false,
      error:
        "The client ID doesn't look right – it ends in “.apps.googleusercontent.com”.",
    });
    expect(checkMailChange({})).toEqual({
      ok: false,
      error: 'Unknown mail.',
    });
    expect(checkMailChange({ messageId: 'm1', kind: 'delete' })).toEqual({
      ok: false,
      error: 'LocalDesk has no such change.',
    });
  });

  it('Gmail- und Anmeldefehler', () => {
    expect(describeGmailError(401, {})).toBe(
      'Gmail did not accept the sign-in – please sign in again.',
    );
    expect(describeGmailError(429, {})).toBe(
      'Gmail reports too many requests – please wait a moment.',
    );
    expect(describeGmailError(500, { error: { message: 'Boom' } })).toBe(
      'Gmail refuses the request (500): Boom',
    );
    expect(describeGmailError(500, {})).toBe(
      'Gmail refuses the request (500).',
    );
    expect(
      describeGmailError(403, { error: { message: 'API has not been used' } }),
    ).toContain('The Gmail API is not enabled');
  });

  it('Neu-anmelden-Text wird in beiden Sprachen erkannt', () => {
    const english = mailReauthMessage();
    expect(english).toBe(
      'The Google sign-in is no longer valid – please sign in again.',
    );
    setMessageLanguage('de');
    const german = mailReauthMessage();
    expect(german).toContain('bitte neu anmelden');
    for (const text of [english, german, `Fehler: ${english}`]) {
      expect(isMailReauthMessage(text), text).toBe(true);
    }
    expect(isMailReauthMessage('Something else')).toBe(false);
  });

  it('Netzwerk-Regel', async () => {
    const fetch = guardedFetch(async () => new Response('x'));
    expect(await message(() => fetch('nonsense'))).toBe(
      'Invalid address: nonsense',
    );
    expect(await message(() => fetch('https://evil.example/'))).toBe(
      'Address not allowed (network rule): evil.example',
    );
  });

  it('Werkzeuge: Ergebnisse und Vorschau', async () => {
    expect(mailTools(OWN, async () => '')[0].serverName).toBe('E-mail');
    expect(await message(() => mailChanges({}, OWN))).toBe(
      "The mail's identifier is missing.",
    );
    expect(
      await message(() =>
        mailChanges({ id: 'm1', label: 'Gibt es nicht' }, OWN),
      ),
    ).toBe("The label “Gibt es nicht” doesn't exist.");
    expect(await message(() => mailChanges({ id: 'm1' }, OWN))).toBe(
      'No change given (label or star).',
    );
    expect(
      await message(() =>
        describeMailChange(client, { id: 'm1', label: 'Rechnungen' }, OWN),
      ),
    ).toBe('The mail already has the label “Rechnungen”.');
    expect(
      await message(() =>
        describeMailChange(client, { id: 'm1', star: false }, OWN),
      ),
    ).toBe('The mail has no star.');
    const preview = await describeMailChange(
      client,
      { id: 'm1', star: true, reason: 'looks important' },
      OWN,
    );
    expect(preview).toMatch(
      /^Add star\nMail: Bank <info@bank\.example> – “\(no subject\)” \(.+\)\nReason: looks important$/,
    );

    const search = await callMailTool(
      client,
      'mail_search',
      { query: 'bank' },
      OWN,
      ALL,
    );
    expect(search).toContain('1 mails for “bank”, newest first:');
    expect(search).toContain('From: Bank <info@bank.example>');
    expect(search).toContain('Subject: (no subject)');
    expect(search).toContain('unread');
    expect(search).toContain('Labels: Rechnungen');
    expect(search).toContain('Preview: Pay by Friday');
    expect(await callMailTool(client, 'mail_search', {}, OWN, ALL)).toContain(
      '1 mails in the inbox, newest first:',
    );
    const read = await callMailTool(
      client,
      'mail_read',
      { id: 'm1' },
      OWN,
      ALL,
    );
    expect(read).toContain('To: me@gmail.com');
    expect(read).toContain('Attachments (not loaded): bill.pdf');
    expect(
      await callMailTool(
        client,
        'mail_change',
        { id: 'm1', star: true },
        OWN,
        ALL,
      ),
    ).toBe('Done – the change has been applied in Gmail.');
    expect(
      await message(() => callMailTool(client, 'mail_read', {}, OWN, ALL)),
    ).toBe("The mail's identifier is missing.");
  });
});

describe('Anmeldung im Browser auf Englisch', () => {
  const APP = {
    clientId: '123456789012-abcdefghij0123456789.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-secret',
  };
  const google: Fetch = guardedFetch(async (url) => {
    if (url === GOOGLE_URLS.token) {
      return Response.json({
        access_token: 'a',
        expires_in: 3599,
        refresh_token: 'r',
        scope: GOOGLE_SCOPE,
      });
    }
    if (url === GOOGLE_URLS.profile)
      return Response.json({ emailAddress: 'me@gmail.com' });
    return new Response('', { status: 404 });
  });
  const run = async (answer: (state: string) => Record<string, string>) => {
    let page = '';
    const promise = signInWithGoogle(APP, {
      fetch: google,
      signal: new AbortController().signal,
      now: () => 0,
      openBrowser: async (url) => {
        const parsed = new URL(url);
        const redirect = parsed.searchParams.get('redirect_uri')!;
        const state = parsed.searchParams.get('state')!;
        const stranger = await globalThis.fetch(
          `${redirect}/?code=x&state=bad`,
        );
        expect(await stranger.text()).toContain(
          "doesn't belong to your sign-in",
        );
        const query = new URLSearchParams(answer(state)).toString();
        page = await (await globalThis.fetch(`${redirect}/?${query}`)).text();
      },
    });
    return { promise, page: () => page };
  };

  it('Erfolgsseite und Ablehnung', async () => {
    const ok = await run((state) => ({ code: 'c', state }));
    await ok.promise;
    expect(ok.page()).toContain('Signed in. You can close this window');
    expect(ok.page()).toContain('<html lang="en">');

    const denied = await run((state) => ({ error: 'access_denied', state }));
    await expect(denied.promise).rejects.toThrow(
      'You declined the sign-in at Google.',
    );
    expect(denied.page()).toContain('Sign-in cancelled.');
  });
});
