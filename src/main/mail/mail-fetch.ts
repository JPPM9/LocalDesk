import { tr } from '../../shared/messages';

/**
 * Netzwerk-Regel für E-Mail: Nur diese Adressen darf LocalDesk für Mails
 * ansprechen – und nur über HTTPS. Alles andere wird abgelehnt, bevor eine
 * Verbindung entsteht. Outlook kommt später dazu.
 */
export const MAIL_HOSTS: ReadonlySet<string> = new Set([
  'accounts.google.com',
  'oauth2.googleapis.com',
  'gmail.googleapis.com',
]);

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Hüllt `fetch` so ein, dass nur die erlaubten Mail-Adressen erreichbar sind. */
export function guardedFetch(fetchImpl: Fetch): Fetch {
  return (url, init) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return Promise.reject(new Error(tr('mail.badAddress', { url })));
    }
    if (parsed.protocol !== 'https:' || !MAIL_HOSTS.has(parsed.hostname)) {
      return Promise.reject(
        new Error(tr('mail.addressBlocked', { host: parsed.host })),
      );
    }
    return fetchImpl(url, init);
  };
}
