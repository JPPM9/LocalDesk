import type {
  MailChange,
  MailLabel,
  MailMessage,
  MailPage,
  MailSummary,
} from '../../shared/mail';

/**
 * Was LocalDesk mit einem Postfach tun kann – für jeden Anbieter gleich
 * (Gmail jetzt, Outlook später). Mehr Funktionen gibt es bewusst nicht:
 * kein Senden, kein Löschen, kein Archivieren.
 */
export interface MailClient {
  list(options: {
    query?: string;
    labelId?: string;
    pageToken?: string;
    max: number;
  }): Promise<MailPage>;
  get(messageId: string): Promise<MailMessage>;
  /** Kopfdaten bestimmter Mails (z. B. zum Sortieren). */
  summaries(messageIds: string[]): Promise<MailSummary[]>;
  labels(): Promise<MailLabel[]>;
  /** Nur nach deiner Bestätigung aufrufen. */
  apply(change: MailChange): Promise<void>;
}

/** Führt `task` für alle Einträge aus, höchstens `limit` gleichzeitig. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}
