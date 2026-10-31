import type { ChatMessage } from './api';
import type { MailChange, MailLabel, MailSummary } from './mail';
import { tr } from './messages';

/** So viele Mails sortiert das Modell auf einmal. */
export const SORT_MAILS_MAX = 25;
/** So viele Änderungen nimmt LocalDesk pro Klick „Übernehmen“ an. */
export const APPLY_CHANGES_MAX = 100;

/**
 * Labels, die das Modell vorschlagen darf: nur selbst angelegte. „[Gmail]/…“
 * entsteht, wenn ein Mailprogramm per IMAP verbunden war – das sind Ordner-Reste
 * wie „[Gmail]/All Mail“, keine Labels zum Sortieren.
 */
export function isSortableLabel(label: MailLabel): boolean {
  return label.type === 'user' && !/^\[(gmail|google mail)\]/i.test(label.name);
}

/** Ein Vorschlag für eine Mail – jede Änderung bestätigst du einzeln. */
export interface MailSuggestion {
  messageId: string;
  from: string;
  subject: string;
  /** Kurze Begründung des Modells. */
  reason: string;
  label?: { id: string; name: string };
  /** true = Stern setzen, false = Stern entfernen. */
  star?: boolean;
}

/** Die Änderungen eines Vorschlags als `MailChange` (für „Übernehmen“). */
export function suggestionChanges(s: MailSuggestion): MailChange[] {
  return [
    ...(s.label
      ? [
          {
            kind: 'label' as const,
            messageId: s.messageId,
            labelId: s.label.id,
          },
        ]
      : []),
    ...(s.star !== undefined
      ? [{ kind: 'star' as const, messageId: s.messageId, starred: s.star }]
      : []),
  ];
}

/**
 * Antwortformat (JSON-Schema): Ollama erzwingt damit, dass die Antwort genau so
 * aussieht. Labels nur aus deiner Liste – „“ heißt „kein Label“.
 */
export function sortingSchema(labels: MailLabel[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            mail: { type: 'integer' },
            label: { type: 'string', enum: ['', ...labels.map((l) => l.name)] },
            star: { type: 'boolean' },
            reason: { type: 'string' },
          },
          required: ['mail', 'label', 'reason'],
        },
      },
    },
    required: ['suggestions'],
  };
}

/** Anfrage: Mails nur mit Kopfdaten und Vorschau – fremder Inhalt, klar abgegrenzt. */
export function sortingMessages(
  mails: MailSummary[],
  labels: MailLabel[],
  allLabels: MailLabel[],
): ChatMessage[] {
  const names = new Map(allLabels.map((l) => [l.id, l.name]));
  const list = mails
    .map((m, i) => {
      const own = m.labelIds
        .map((id) => names.get(id))
        .filter((n): n is string => !!n && labels.some((l) => l.name === n));
      return [
        `[${i + 1}]`,
        tr('prompt.mailFrom', { value: m.from || '–' }),
        tr('prompt.mailSubject', { value: m.subject || tr('mail.noSubject') }),
        tr('prompt.sortPreview', { value: m.snippet.slice(0, 200) }),
        tr('prompt.sortHasLabels', {
          value: own.length > 0 ? own.join(', ') : tr('prompt.sortNone'),
        }),
        tr('prompt.sortStar', {
          value: m.starred ? tr('prompt.yes') : tr('prompt.no'),
        }),
      ].join('\n');
    })
    .join('\n\n');
  const labelList =
    labels.length > 0
      ? labels.map((l) => `- ${l.name}`).join('\n')
      : tr('prompt.sortNoLabels');
  return [
    {
      role: 'system',
      content: tr('prompt.sortSystem'),
    },
    {
      role: 'user',
      content: tr('prompt.sortUser', { labels: labelList, list }),
    },
  ];
}

/**
 * Liest die Antwort und behält nur Gültiges: bekannte Mail, eigenes Label, das
 * die Mail noch nicht hat, Stern nur wenn er sich ändert. Eine Mail höchstens einmal.
 */
export function parseSuggestions(
  answer: string,
  mails: MailSummary[],
  labels: MailLabel[],
): MailSuggestion[] {
  let raw: unknown;
  try {
    raw = JSON.parse(answer);
  } catch {
    throw new Error(tr('prompt.sortUnreadable'));
  }
  const items = (raw as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(items)) {
    throw new Error(tr('prompt.sortUnreadable'));
  }
  const seen = new Set<string>();
  const result: MailSuggestion[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const index = typeof item?.mail === 'number' ? item.mail - 1 : -1;
    const mail = Number.isInteger(index) ? mails[index] : undefined;
    if (!mail || seen.has(mail.id)) continue;
    const label = labels.find((l) => l.name === item.label);
    const suggestion: MailSuggestion = {
      messageId: mail.id,
      from: mail.from,
      subject: mail.subject,
      reason:
        typeof item.reason === 'string' ? item.reason.trim().slice(0, 200) : '',
      ...(label &&
        !mail.labelIds.includes(label.id) && {
          label: { id: label.id, name: label.name },
        }),
      ...(typeof item.star === 'boolean' &&
        item.star !== mail.starred && { star: item.star }),
    };
    if (suggestion.label || suggestion.star !== undefined) {
      seen.add(mail.id);
      result.push(suggestion);
    }
  }
  return result;
}
