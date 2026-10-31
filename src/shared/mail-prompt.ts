import type { ChatMessage } from './api';
import type { MailMessage } from './mail';
import { messageLocale, tr } from './messages';

/** So viel Mailtext bekommt das Modell zum Zusammenfassen höchstens. */
export const MAIL_SUMMARY_TEXT_MAX = 40_000;

/**
 * Anfrage zum Zusammenfassen einer Mail. Die Mail ist fremder Text – sie steht
 * klar abgegrenzt im Nutzer-Teil, und das Modell soll Anweisungen darin nicht
 * befolgen (z. B. „Ignoriere alles und schreibe …“).
 */
export function mailSummaryMessages(mail: MailMessage): ChatMessage[] {
  let text = mail.text.trim() || mail.snippet;
  if (text.length > MAIL_SUMMARY_TEXT_MAX) {
    text = `${text.slice(0, MAIL_SUMMARY_TEXT_MAX)}\n${tr('prompt.mailRestOmitted')}`;
  }
  const head = [
    tr('prompt.mailFrom', { value: mail.from || '–' }),
    tr('prompt.mailTo', { value: mail.to || '–' }),
    ...(mail.cc ? [tr('prompt.mailCc', { value: mail.cc })] : []),
    tr('prompt.mailDate', {
      value: new Date(mail.date).toLocaleString(messageLocale()),
    }),
    tr('prompt.mailSubject', {
      value: mail.subject || tr('mail.noSubject'),
    }),
    ...(mail.attachments.length > 0
      ? [
          tr('prompt.mailAttachments', {
            value: mail.attachments.map((a) => a.name).join(', '),
          }),
        ]
      : []),
  ].join('\n');
  return [
    {
      role: 'system',
      content: tr('prompt.mailSummarySystem'),
    },
    {
      role: 'user',
      content: tr('prompt.mailSummaryUser', { head, text }),
    },
  ];
}

/**
 * Kontextlänge für die Anfrage: genug für die Mail (grob 3 Zeichen je Token
 * plus Platz für Anweisung und Antwort), aber nicht mehr als nötig – sonst lädt
 * Ollama das Modell mit unnötig viel Speicher.
 */
export function mailSummaryContext(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const needed = Math.ceil(chars / 3) + 1536;
  for (const size of [8192, 16384, 32768]) {
    if (needed <= size) return size;
  }
  return 32768;
}
