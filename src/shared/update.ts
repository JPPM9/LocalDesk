import { tr } from './messages';

/**
 * Stand des Update-Knopfs. Gesucht wird nur, wenn du klickst; geladen und installiert
 * erst nach deiner Bestätigung.
 */
export type UpdateState =
  /** Noch nicht gesucht. */
  | { kind: 'idle' }
  /** Entwicklungsmodus – Updates gibt es nur in der installierten App. */
  | { kind: 'dev' }
  | { kind: 'checking' }
  /** Du hast die neueste Version. */
  | { kind: 'latest'; version: string }
  | { kind: 'available'; version: string; notes: string; date?: string }
  | {
      kind: 'downloading';
      version: string;
      percent: number;
      transferred: number;
      total: number;
    }
  /** Geladen und geprüft – Neustart installiert. */
  | { kind: 'ready'; version: string }
  | { kind: 'error'; error: string };

/**
 * Release-Notizen kommen von GitHub als HTML (aus dem Changelog-Markdown).
 * Für die Anzeige: lesbarer Text mit „- “ für Listenpunkte, ohne Tags.
 */
export function releaseNotesText(
  notes: string | { version: string; note: string | null }[] | null | undefined,
): string {
  if (!notes) return '';
  const html = Array.isArray(notes)
    ? notes.map((n) => n.note ?? '').join('\n')
    : notes;
  return html
    .replace(/\s*<li[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|ul|ol|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Technische Fehler des Updaters in verständliche Sätze übersetzen. */
export function describeUpdateError(message: string): string {
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|net::ERR_/i.test(message)) {
    return tr('update.offline');
  }
  if (
    /\b404\b|Unable to find latest version|No published versions/i.test(message)
  ) {
    return tr('update.noRelease');
  }
  if (/sha512 checksum mismatch|checksum/i.test(message)) {
    return tr('update.checksum');
  }
  if (/\b403\b|rate limit/i.test(message)) {
    return tr('update.rateLimit');
  }
  return message.split('\n')[0].slice(0, 300);
}
