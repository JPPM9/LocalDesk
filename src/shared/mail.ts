import type { Result } from './api';

/** Mail-Anbieter. Outlook folgt später (braucht ein Azure-Verzeichnis). */
export type MailProvider = 'google';

/** Eigene Google-App des Nutzers (Desktop-Client aus der Google Cloud Console). */
export interface GoogleAppInput {
  clientId: string;
  clientSecret: string;
}

/** Was die Oberfläche über die eingetragene App erfährt – der Schlüssel bleibt im Hauptprozess. */
export interface MailAppView {
  provider: MailProvider;
  clientId: string;
}

/** Ein angemeldetes Mail-Konto. */
export interface MailAccountView {
  id: string;
  provider: MailProvider;
  email: string;
}

const GOOGLE_CLIENT_ID =
  /^[0-9]{6,30}-[a-z0-9]{10,64}\.apps\.googleusercontent\.com$/;
const GOOGLE_CLIENT_SECRET = /^[A-Za-z0-9_-]{10,100}$/;

/** Prüft die Werte aus der Google Cloud Console (Leerzeichen vom Kopieren werden entfernt). */
export function checkGoogleApp(input: unknown): Result<GoogleAppInput> {
  const raw = (input ?? {}) as Partial<Record<keyof GoogleAppInput, unknown>>;
  const clientId = typeof raw.clientId === 'string' ? raw.clientId.trim() : '';
  const clientSecret =
    typeof raw.clientSecret === 'string' ? raw.clientSecret.trim() : '';
  if (!GOOGLE_CLIENT_ID.test(clientId)) {
    return {
      ok: false,
      error:
        'Die Client-ID sieht nicht richtig aus – sie endet auf „.apps.googleusercontent.com“.',
    };
  }
  if (!GOOGLE_CLIENT_SECRET.test(clientSecret)) {
    return {
      ok: false,
      error:
        'Der Clientschlüssel sieht nicht richtig aus – er beginnt meist mit „GOCSPX-“.',
    };
  }
  return { ok: true, value: { clientId, clientSecret } };
}
