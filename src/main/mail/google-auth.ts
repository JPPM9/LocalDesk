import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MAIL_REAUTH_MESSAGE, type GoogleAppInput } from '../../shared/mail';
import type { Fetch } from './mail-fetch';

/** Lesen, Labels und Sterne ändern. Mehr als nötig – siehe docs/email-einrichten.md. */
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

export const GOOGLE_URLS = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  revoke: 'https://oauth2.googleapis.com/revoke',
  profile: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
} as const;

/** So lange wartet LocalDesk, bis du dich im Browser angemeldet hast. */
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;

/**
 * Abgelaufene oder widerrufene Anmeldung – nur neu anmelden hilft
 * (Passwort geändert, Zugriff bei Google entfernt, 6 Monate nicht genutzt …).
 */
export class MailReauthError extends Error {
  constructor() {
    super(MAIL_REAUTH_MESSAGE);
  }
}

export interface AccessToken {
  token: string;
  /** Zeitpunkt (ms), ab dem der Zugangsschlüssel nicht mehr gilt. */
  expiresAt: number;
}

export interface GoogleSignIn {
  email: string;
  refreshToken: string;
  access: AccessToken;
}

export interface SignInDeps {
  fetch: Fetch;
  /** Öffnet die Anmeldeseite im System-Browser. */
  openBrowser: (url: string) => Promise<void>;
  signal: AbortSignal;
  now: () => number;
  timeoutMs?: number;
}

const base64url = (bytes: Buffer) => bytes.toString('base64url');

/** PKCE: Einmal-Schlüssel, damit nur LocalDesk den Code aus dem Browser einlösen kann. */
export function createPkce() {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function googleAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const url = new URL(GOOGLE_URLS.auth);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    code_challenge: options.challenge,
    code_challenge_method: 'S256',
    state: options.state,
    // Langlebige Anmeldung (Refresh-Token) – und die Seite immer zeigen, damit
    // Google auch beim zweiten Mal einen Refresh-Token liefert.
    access_type: 'offline',
    prompt: 'consent',
  }).toString();
  return url.toString();
}

/**
 * Anmeldung über den System-Browser: Ein kleiner Server nur auf 127.0.0.1
 * nimmt die Rückleitung von Google entgegen, danach wird der Code gegen
 * Schlüssel getauscht. Die E-Mail-Adresse kommt aus Gmail selbst.
 */
export async function signInWithGoogle(
  app: GoogleAppInput,
  deps: SignInDeps,
): Promise<GoogleSignIn> {
  const { verifier, challenge } = createPkce();
  const state = base64url(randomBytes(24));
  const {
    promise: codePromise,
    resolve,
    reject,
  } = Promise.withResolvers<string>();
  // Abbruch oder Zeitablauf kann vor dem `await` kommen – nicht als „unbehandelt“ melden.
  codePromise.catch(() => {});
  let finished = false;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method !== 'GET' || url.pathname !== '/') {
      res.writeHead(404).end();
      return;
    }
    if (finished) {
      page(
        res,
        200,
        'Die Anmeldung ist schon abgeschlossen. Du kannst dieses Fenster schließen.',
      );
      return;
    }
    // Fremde Aufrufe (ohne passenden state) ignorieren – die Anmeldung läuft weiter.
    if (!sameText(url.searchParams.get('state') ?? '', state)) {
      page(res, 400, 'Diese Anfrage gehört nicht zu deiner Anmeldung.');
      return;
    }
    finished = true;
    const code = url.searchParams.get('code');
    if (code) {
      page(
        res,
        200,
        'Angemeldet. Du kannst dieses Fenster schließen und zu LocalDesk zurückkehren.',
      );
      resolve(code);
    } else {
      page(
        res,
        200,
        'Anmeldung abgebrochen. Du kannst dieses Fenster schließen.',
      );
      reject(new Error(describeAuthError(url.searchParams.get('error'))));
    }
  });

  const onAbort = () => reject(new Error('Anmeldung abgebrochen.'));
  deps.signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(
    () =>
      reject(
        new Error(
          'Keine Anmeldung innerhalb von 5 Minuten – bitte noch einmal.',
        ),
      ),
    deps.timeoutMs ?? SIGN_IN_TIMEOUT_MS,
  );

  try {
    await new Promise<void>((ok, fail) => {
      server.once('error', fail);
      server.listen(0, '127.0.0.1', ok);
    });
    if (deps.signal.aborted) throw new Error('Anmeldung abgebrochen.');
    const { port } = server.address() as AddressInfo;
    const redirectUri = `http://127.0.0.1:${port}`;
    await deps.openBrowser(
      googleAuthUrl({ clientId: app.clientId, redirectUri, challenge, state }),
    );
    const code = await codePromise;

    const tokens = await postToken(deps.fetch, {
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: app.clientId,
      client_secret: app.clientSecret,
    });
    if (!tokens.refresh_token) {
      throw new Error(
        'Google hat keine dauerhafte Anmeldung geliefert – bitte noch einmal.',
      );
    }
    // Bei Google kann man einzelne Rechte abwählen – ohne Gmail-Zugriff geht nichts.
    if (!tokens.scope?.split(' ').includes(GOOGLE_SCOPE)) {
      await revokeGoogleToken(deps.fetch, tokens.refresh_token).catch(() => {});
      throw new Error(
        'Der Zugriff auf Gmail wurde nicht erlaubt. Setze bei der Anmeldung den Haken bei Gmail.',
      );
    }
    const access = toAccess(tokens, deps.now());
    try {
      const email = await gmailAddress(deps.fetch, access.token);
      return { email, refreshToken: tokens.refresh_token, access };
    } catch (error) {
      // Nicht nutzbare Anmeldung nicht bei Google offen stehen lassen.
      await revokeGoogleToken(deps.fetch, tokens.refresh_token).catch(() => {});
      throw error;
    }
  } finally {
    clearTimeout(timer);
    deps.signal.removeEventListener('abort', onAbort);
    server.close();
    server.closeAllConnections();
  }
}

/** Neuer Zugangsschlüssel (gilt etwa 1 Stunde) aus der dauerhaften Anmeldung. */
export async function refreshGoogleAccess(
  fetch: Fetch,
  app: GoogleAppInput,
  refreshToken: string,
  now: number,
): Promise<AccessToken> {
  const tokens = await postToken(fetch, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: app.clientId,
    client_secret: app.clientSecret,
  });
  return toAccess(tokens, now);
}

/** Widerruft die Anmeldung bei Google (Abmelden). */
export async function revokeGoogleToken(fetch: Fetch, token: string) {
  const response = await fetch(GOOGLE_URLS.revoke, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString(),
  });
  // 400 = Schlüssel gilt schon nicht mehr – Ziel erreicht.
  if (!response.ok && response.status !== 400) {
    throw new Error(`Google hat das Abmelden abgelehnt (${response.status}).`);
  }
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function postToken(
  fetch: Fetch,
  params: Record<string, string>,
): Promise<TokenResponse & { access_token: string }> {
  const response = await fetch(GOOGLE_URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (body.error === 'invalid_grant') throw new MailReauthError();
  if (!response.ok || !body.access_token) {
    throw new Error(describeTokenError(body.error, response.status));
  }
  return body as TokenResponse & { access_token: string };
}

async function gmailAddress(
  fetch: Fetch,
  accessToken: string,
): Promise<string> {
  const response = await fetch(GOOGLE_URLS.profile, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json().catch(() => ({}))) as {
    emailAddress?: unknown;
  } & GoogleApiError;
  if (!response.ok || typeof body.emailAddress !== 'string') {
    throw new Error(describeGmailError(response.status, body));
  }
  return body.emailAddress;
}

/** Fehlerantwort der Google-APIs (gekürzt auf das, was wir lesen). */
export interface GoogleApiError {
  error?: {
    message?: unknown;
    details?: { reason?: unknown }[];
  };
}

/** Übersetzt die häufigen Gmail-Fehler; sonst zählt Googles eigener Text. */
export function describeGmailError(
  status: number,
  body: GoogleApiError,
): string {
  const reasons = (body.error?.details ?? []).map((d) => d?.reason);
  const message =
    typeof body.error?.message === 'string' ? body.error.message : '';
  if (
    reasons.includes('SERVICE_DISABLED') ||
    /has not been used|is disabled/i.test(message)
  ) {
    return 'Die Gmail-API ist im Google-Projekt nicht aktiviert. Google Cloud Console → APIs & Dienste → Bibliothek → „Gmail API“ → Aktivieren, ein paar Minuten warten und dann neu anmelden.';
  }
  if (status === 401)
    return 'Gmail hat die Anmeldung nicht angenommen – bitte neu anmelden.';
  if (status === 429)
    return 'Gmail meldet zu viele Anfragen – bitte kurz warten.';
  return `Gmail lehnt die Anfrage ab (${status})${message ? `: ${message.slice(0, 300)}` : '.'}`;
}

function toAccess(
  tokens: { access_token: string; expires_in?: number },
  now: number,
): AccessToken {
  // Eine Minute Puffer, damit ein Schlüssel nicht mitten in einer Anfrage abläuft.
  const seconds = Math.max(60, tokens.expires_in ?? 3600);
  return { token: tokens.access_token, expiresAt: now + (seconds - 60) * 1000 };
}

function describeAuthError(error: string | null): string {
  return error === 'access_denied'
    ? 'Du hast die Anmeldung bei Google abgelehnt.'
    : `Google hat die Anmeldung abgebrochen (${error ?? 'unbekannt'}).`;
}

function describeTokenError(error: string | undefined, status: number): string {
  switch (error) {
    case 'invalid_client':
    case 'unauthorized_client':
      return 'Google kennt diese App nicht – stimmen Client-ID und Clientschlüssel?';
    default:
      return `Google hat die Anmeldung abgelehnt (${error ?? status}).`;
  }
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Antwortseite im Browser – ohne fremde Inhalte. */
function page(res: ServerResponse, status: number, text: string) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    'Cache-Control': 'no-store',
  });
  res.end(
    `<!doctype html><html lang="de"><meta charset="utf-8"><title>LocalDesk</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.5">` +
      `<h1 style="font-size:1.2rem">LocalDesk</h1><p>${text}</p></body></html>`,
  );
}
