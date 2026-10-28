import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  GOOGLE_SCOPE,
  GOOGLE_URLS,
  MailReauthError,
  refreshGoogleAccess,
  signInWithGoogle,
} from '../../src/main/mail/google-auth';
import { guardedFetch, type Fetch } from '../../src/main/mail/mail-fetch';

const APP = {
  clientId: '123456789012-abcdefghij0123456789.apps.googleusercontent.com',
  clientSecret: 'GOCSPX-geheim',
};

/** Nachgebautes Google: merkt sich die Anfragen und antwortet wie die echte API. */
function fakeGoogle(options: { scope?: string; tokenError?: string } = {}) {
  const calls: { url: string; body: URLSearchParams | null; auth?: string }[] =
    [];
  const fetch: Fetch = async (url, init) => {
    const body =
      typeof init?.body === 'string' ? new URLSearchParams(init.body) : null;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, body, auth: headers.Authorization });
    if (url === GOOGLE_URLS.token) {
      if (options.tokenError) {
        return Response.json({ error: options.tokenError }, { status: 400 });
      }
      return Response.json({
        access_token: 'zugang-1',
        expires_in: 3599,
        refresh_token: 'dauer-1',
        scope: options.scope ?? GOOGLE_SCOPE,
      });
    }
    if (url === GOOGLE_URLS.profile) {
      return Response.json({ emailAddress: 'ich@gmail.com' });
    }
    if (url === GOOGLE_URLS.revoke) return new Response('', { status: 200 });
    return new Response('', { status: 404 });
  };
  return { calls, fetch: guardedFetch(fetch) };
}

/** Spielt den Browser: liest die Anmeldeadresse und ruft die Rückleitung auf. */
function browser(answer: (state: string) => Record<string, string>) {
  const seen: { url?: URL; page?: string } = {};
  const openBrowser = async (url: string) => {
    seen.url = new URL(url);
    const redirect = seen.url.searchParams.get('redirect_uri')!;
    const state = seen.url.searchParams.get('state')!;
    // Ein fremder Aufruf ohne passenden state darf nichts beenden.
    const stranger = await globalThis.fetch(
      `${redirect}/?code=boese&state=falsch`,
    );
    expect(stranger.status).toBe(400);
    const query = new URLSearchParams(answer(state)).toString();
    seen.page = await (await globalThis.fetch(`${redirect}/?${query}`)).text();
  };
  return { seen, openBrowser };
}

const deps = (fetch: Fetch, openBrowser: (url: string) => Promise<void>) => ({
  fetch,
  openBrowser,
  signal: new AbortController().signal,
  now: () => 1_000_000,
});

describe('signInWithGoogle', () => {
  it('meldet über Loopback + PKCE an und holt die Adresse aus Gmail', async () => {
    const google = fakeGoogle();
    const { seen, openBrowser } = browser((state) => ({ code: 'c0de', state }));

    const result = await signInWithGoogle(APP, deps(google.fetch, openBrowser));

    expect(result).toEqual({
      email: 'ich@gmail.com',
      refreshToken: 'dauer-1',
      access: { token: 'zugang-1', expiresAt: 1_000_000 + 3539_000 },
    });
    const params = seen.url!.searchParams;
    expect(seen.url!.origin + seen.url!.pathname).toBe(GOOGLE_URLS.auth);
    expect(params.get('scope')).toBe(GOOGLE_SCOPE);
    expect(params.get('redirect_uri')).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('access_type')).toBe('offline');
    expect(seen.page).toContain('Angemeldet');

    // PKCE: Der eingelöste Verifier passt zur Challenge aus der Anmeldeadresse.
    const exchange = google.calls.find((c) => c.url === GOOGLE_URLS.token)!;
    const verifier = exchange.body!.get('code_verifier')!;
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(
      params.get('code_challenge'),
    );
    expect(exchange.body!.get('code')).toBe('c0de');
    expect(exchange.body!.get('redirect_uri')).toBe(params.get('redirect_uri'));
    const profile = google.calls.find((c) => c.url === GOOGLE_URLS.profile)!;
    expect(profile.auth).toBe('Bearer zugang-1');
  });

  it('meldet Ablehnen im Browser verständlich', async () => {
    const google = fakeGoogle();
    const { openBrowser } = browser((state) => ({
      error: 'access_denied',
      state,
    }));
    await expect(
      signInWithGoogle(APP, deps(google.fetch, openBrowser)),
    ).rejects.toThrow('abgelehnt');
    expect(google.calls).toHaveLength(0);
  });

  it('lehnt ab und widerruft, wenn der Gmail-Haken fehlt', async () => {
    const google = fakeGoogle({ scope: 'openid' });
    const { openBrowser } = browser((state) => ({ code: 'c', state }));
    await expect(
      signInWithGoogle(APP, deps(google.fetch, openBrowser)),
    ).rejects.toThrow('Gmail wurde nicht erlaubt');
    expect(google.calls.map((c) => c.url)).toContain(GOOGLE_URLS.revoke);
  });

  it('erklärt falsche App-Daten', async () => {
    const google = fakeGoogle({ tokenError: 'invalid_client' });
    const { openBrowser } = browser((state) => ({ code: 'c', state }));
    await expect(
      signInWithGoogle(APP, deps(google.fetch, openBrowser)),
    ).rejects.toThrow('Client-ID und Clientschlüssel');
  });

  it('lässt sich abbrechen, während der Browser offen ist', async () => {
    const controller = new AbortController();
    const running = signInWithGoogle(APP, {
      fetch: fakeGoogle().fetch,
      openBrowser: async () => controller.abort(),
      signal: controller.signal,
      now: () => 0,
    });
    await expect(running).rejects.toThrow('abgebrochen');
  });

  it('gibt nach der Wartezeit auf', async () => {
    const running = signInWithGoogle(APP, {
      fetch: fakeGoogle().fetch,
      openBrowser: async () => {},
      signal: new AbortController().signal,
      now: () => 0,
      timeoutMs: 20,
    });
    await expect(running).rejects.toThrow('5 Minuten');
  });
});

describe('refreshGoogleAccess', () => {
  it('holt einen neuen Zugangsschlüssel', async () => {
    const google = fakeGoogle();
    await expect(
      refreshGoogleAccess(google.fetch, APP, 'dauer-1', 0),
    ).resolves.toEqual({ token: 'zugang-1', expiresAt: 3539_000 });
    expect(google.calls[0].body!.get('grant_type')).toBe('refresh_token');
  });

  it('meldet eine abgelaufene Anmeldung als „neu anmelden“', async () => {
    const google = fakeGoogle({ tokenError: 'invalid_grant' });
    await expect(
      refreshGoogleAccess(google.fetch, APP, 'alt', 0),
    ).rejects.toBeInstanceOf(MailReauthError);
  });
});

describe('guardedFetch', () => {
  const ok: Fetch = async () => new Response('ok');

  it('lässt nur Googles Mail-Adressen über HTTPS durch', async () => {
    const fetch = guardedFetch(ok);
    await expect(fetch(GOOGLE_URLS.profile)).resolves.toBeInstanceOf(Response);
    for (const url of [
      'https://example.com/',
      'http://gmail.googleapis.com/gmail/v1/users/me/profile',
      'https://gmail.googleapis.com.evil.com/',
      'https://evil.com/?https://gmail.googleapis.com',
      'kein-url',
    ]) {
      await expect(fetch(url)).rejects.toThrow();
    }
  });
});
