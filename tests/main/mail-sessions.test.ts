import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db/database';
import { MailAccountRepository } from '../../src/main/db/mail-account-repository';
import { GOOGLE_URLS } from '../../src/main/mail/google-auth';
import type { Fetch } from '../../src/main/mail/mail-fetch';
import {
  MailSessions,
  type TokenCipher,
} from '../../src/main/mail/mail-sessions';

const APP = { clientId: 'id', clientSecret: 'secret' };

/** Spielzeug-Verschlüsselung: sichtbar anders als der Klartext. */
const reverse = (text: string) => [...text].reverse().join('');
const cipher: TokenCipher = {
  available: async () => true,
  encrypt: async (text) => `enc(${reverse(text)})`,
  decrypt: async (enc) => reverse(enc.slice(4, -1)),
};

let clock: number;
let accounts: MailAccountRepository;
let requests: { url: string; token?: string }[];
let revokeStatus: number;
const fetch: Fetch = async (url, init) => {
  const body = new URLSearchParams(String(init?.body ?? ''));
  requests.push({
    url,
    token: body.get('refresh_token') ?? body.get('token') ?? undefined,
  });
  if (url === GOOGLE_URLS.revoke) {
    return new Response('', { status: revokeStatus });
  }
  return Response.json({
    access_token: `neu-${requests.length}`,
    expires_in: 3600,
  });
};

beforeEach(() => {
  clock = 0;
  requests = [];
  revokeStatus = 200;
  let n = 0;
  accounts = new MailAccountRepository(
    openDatabase(':memory:'),
    () => clock,
    () => `konto-${++n}`,
  );
});

const sessions = (c = cipher) =>
  new MailSessions(
    accounts,
    c,
    () => APP,
    fetch,
    () => clock,
  );

describe('MailSessions', () => {
  const access = (expiresAt: number) => ({ token: 'z', expiresAt });

  it('speichert die Anmeldung nur verschlüsselt', async () => {
    const account = await sessions().remember(
      'ich@gmail.com',
      'dauer',
      access(10),
    );
    expect(account).toEqual({
      id: 'konto-1',
      provider: 'google',
      email: 'ich@gmail.com',
    });
    expect(accounts.encryptedToken('konto-1')).toBe('enc(reuad)');
  });

  it('verweigert das Speichern ohne Verschlüsselung – und widerruft', async () => {
    await expect(
      sessions({ ...cipher, available: async () => false }).remember(
        'a@b.c',
        'x',
        access(1),
      ),
    ).rejects.toThrow('verschlüsseln');
    expect(accounts.list()).toEqual([]);
    expect(requests).toEqual([{ url: GOOGLE_URLS.revoke, token: 'x' }]);
  });

  it('nutzt den Zugangsschlüssel, bis er abläuft, dann einen frischen', async () => {
    const s = sessions();
    await s.remember('ich@gmail.com', 'dauer', access(100));
    clock = 50;
    expect(await s.accessToken('konto-1')).toBe('z');
    expect(requests).toEqual([]);
    clock = 100;
    expect(await s.accessToken('konto-1')).toBe('neu-1');
    expect(requests[0]).toEqual({ url: GOOGLE_URLS.token, token: 'dauer' });
  });

  it('neue Anmeldung desselben Kontos behält die Kennung', async () => {
    const s = sessions();
    await s.remember('ich@gmail.com', 'alt', access(1));
    await s.remember('ich@gmail.com', 'neu', access(1));
    expect(accounts.list()).toHaveLength(1);
    expect(await cipher.decrypt(accounts.encryptedToken('konto-1')!)).toBe(
      'neu',
    );
  });

  it('Abmelden widerruft bei Google und löscht lokal', async () => {
    const s = sessions();
    await s.remember('ich@gmail.com', 'dauer', access(1));
    await expect(s.signOut('konto-1')).resolves.toEqual({ revoked: true });
    expect(requests).toEqual([{ url: GOOGLE_URLS.revoke, token: 'dauer' }]);
    expect(accounts.list()).toEqual([]);
  });

  it('löscht auch, wenn Google nicht erreichbar ist – und sagt es', async () => {
    revokeStatus = 503;
    const s = sessions();
    await s.remember('ich@gmail.com', 'dauer', access(1));
    await expect(s.signOut('konto-1')).resolves.toEqual({ revoked: false });
    expect(accounts.list()).toEqual([]);
    await expect(s.accessToken('konto-1')).rejects.toThrow('nicht (mehr)');
  });
});
