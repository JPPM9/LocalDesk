import type { Result } from './api';
import type { MailLabel } from './mail';
import { tr } from './messages';

/** Längster Name für ein neues oder umbenanntes Label. */
export const LABEL_NAME_MAX = 100;
/** So viele neue Labels legt ein Durchgang („Übernehmen“ beim Sortieren) höchstens an. */
export const NEW_LABELS_MAX = 3;

/** Namen, die Gmail selbst für seine Systemlabels und Ordner benutzt (klein geschrieben). */
const RESERVED = new Set([
  'inbox',
  'sent',
  'sent mail',
  'draft',
  'drafts',
  'trash',
  'bin',
  'spam',
  'junk',
  'starred',
  'unread',
  'important',
  'chat',
  'snoozed',
  'scheduled',
  'all mail',
]);

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Prüft den Namen für ein neues Label (oder, mit `ignoreId`, für das Umbenennen dieses
 * Labels): nicht leer, nicht zu lang, keine Steuerzeichen, kein Name von Gmail selbst
 * und kein Name, den es schon gibt (Groß-/Kleinschreibung zählt nicht). Gibt den
 * bereinigten Namen zurück. Mehr prüft Gmail selbst.
 */
export function checkLabelName(
  input: unknown,
  labels: MailLabel[],
  ignoreId?: string,
): Result<string> {
  const name = typeof input === 'string' ? input.trim() : '';
  if (!name) return { ok: false, error: tr('mail.labelNameEmpty') };
  if (name.length > LABEL_NAME_MAX) {
    return {
      ok: false,
      error: tr('mail.labelNameTooLong', { max: LABEL_NAME_MAX }),
    };
  }
  if ([...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) {
    return { ok: false, error: tr('mail.labelNameBad') };
  }
  const lower = name.toLowerCase();
  if (
    RESERVED.has(lower) ||
    lower.startsWith('category_') ||
    /^\[(gmail|google mail)\]/.test(lower)
  ) {
    return { ok: false, error: tr('mail.labelNameReserved', { name }) };
  }
  if (labels.some((l) => l.id !== ignoreId && sameName(l.name, name))) {
    return { ok: false, error: tr('mail.labelNameExists', { name }) };
  }
  return { ok: true, value: name };
}
