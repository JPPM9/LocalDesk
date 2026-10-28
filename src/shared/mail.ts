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

/** Eine Mail in der Liste – nur Kopfdaten und Vorschau. */
export interface MailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  /** Eingangszeit (ms). */
  date: number;
  /** Vorschau als reiner Text. */
  snippet: string;
  unread: boolean;
  starred: boolean;
  /** Kennungen der Labels (Gmail) – Namen über `MailLabel`. */
  labelIds: string[];
}

/** Eine geöffnete Mail. Der Inhalt ist immer reiner Text (HTML wird umgewandelt). */
export interface MailMessage extends MailSummary {
  to: string;
  cc: string;
  text: string;
  /** Text wurde gekürzt (sehr lange Mail). */
  truncated: boolean;
  /** Anhänge nur als Name und Größe – geladen wird nichts. */
  attachments: { name: string; size: number }[];
}

export interface MailLabel {
  id: string;
  name: string;
  /** „system“ = von Gmail (Posteingang, Gesendet …), „user“ = selbst angelegt. */
  type: 'system' | 'user';
}

export interface MailListQuery {
  accountId: string;
  /** Gmail-Suche, z. B. „is:unread from:bank“. */
  query?: string;
  /** Nur Mails mit diesem Label; ohne = Posteingang. */
  labelId?: string;
  pageToken?: string;
  /** 1–50, Standard 25. */
  max?: number;
}

export interface MailPage {
  messages: MailSummary[];
  nextPageToken?: string;
}

/**
 * Die EINZIGEN Änderungen, die LocalDesk an Mails kennt – jeweils erst nach
 * deiner Bestätigung. Senden, Löschen, Archivieren gibt es nicht.
 */
export type MailChange =
  | { kind: 'label'; messageId: string; labelId: string }
  | { kind: 'star'; messageId: string; starred: boolean };

/** Fehlertext bei abgelaufener Anmeldung – die Oberfläche bietet dann „neu anmelden“ an. */
export const MAIL_REAUTH_MESSAGE =
  'Die Anmeldung bei Google gilt nicht mehr – bitte neu anmelden.';

export const MAIL_PAGE_MAX = 50;
export const MAIL_QUERY_MAX = 500;
/** Längere Mails werden für Anzeige und Modell gekürzt. */
export const MAIL_TEXT_MAX = 100_000;

const MAIL_ID = /^[A-Za-z0-9_-]{1,200}$/;

/** Kennungen von Gmail (Mails, Labels) sind kurz und harmlos – alles andere lehnen wir ab. */
export function isMailId(value: unknown): value is string {
  return typeof value === 'string' && MAIL_ID.test(value);
}

/** Prüft eine Änderung, bevor sie überhaupt an den Anbieter geht. */
export function checkMailChange(input: unknown): Result<MailChange> {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (!isMailId(raw.messageId)) {
    return { ok: false, error: 'Unbekannte Mail.' };
  }
  if (raw.kind === 'label' && isMailId(raw.labelId)) {
    return {
      ok: true,
      value: { kind: 'label', messageId: raw.messageId, labelId: raw.labelId },
    };
  }
  if (raw.kind === 'star' && typeof raw.starred === 'boolean') {
    return {
      ok: true,
      value: { kind: 'star', messageId: raw.messageId, starred: raw.starred },
    };
  }
  return { ok: false, error: 'Diese Änderung gibt es in LocalDesk nicht.' };
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
