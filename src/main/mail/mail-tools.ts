import {
  MAIL_TOOL_SERVER,
  type MailChange,
  type MailLabel,
  type MailSummary,
} from '../../shared/mail';
import type { OfferedTool } from '../../shared/tools';
import type { MailClient } from './mail-client';
import { tr } from '../../shared/messages';

export const MAIL_SEARCH_TOOL = 'mail_search';
export const MAIL_READ_TOOL = 'mail_read';
export const MAIL_CHANGE_TOOL = 'mail_change';

/** So viele Mails liefert eine Suche dem Modell höchstens. */
const SEARCH_MAX = 20;
/** So viel Mailtext bekommt das Modell pro Mail (Kontext ist knapp). */
const READ_TEXT_MAX = 12_000;

const foreign = () => tr('tool.mailForeign');

/**
 * Die E-Mail-Werkzeuge im Chat (nur mit eingeschaltetem Schalter „E-Mail“):
 * suchen und lesen ohne Rückfrage, Änderungen IMMER mit Rückfrage – und nur
 * eigenes Label hinzufügen oder Stern. Senden und Löschen gibt es nicht.
 */
export function mailTools(
  labels: MailLabel[],
  describe: (args: Record<string, unknown>) => Promise<string>,
): OfferedTool[] {
  const base = {
    serverId: MAIL_TOOL_SERVER,
    serverName: tr('mail.serverName'),
  };
  return [
    {
      ...base,
      toolName: MAIL_SEARCH_TOOL,
      description: tr('tool.mailSearch'),
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: tr('tool.mailQuery'),
          },
          max: {
            type: 'integer',
            description: tr('tool.mailMax', { max: SEARCH_MAX }),
          },
        },
      },
      destructive: false,
      permission: 'always',
    },
    {
      ...base,
      toolName: MAIL_READ_TOOL,
      description: tr('tool.mailRead'),
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: tr('tool.mailId') },
        },
        required: ['id'],
      },
      destructive: false,
      permission: 'always',
    },
    {
      ...base,
      toolName: MAIL_CHANGE_TOOL,
      description:
        tr('tool.mailChange') +
        (labels.length === 0 ? tr('tool.mailNoLabels') : ''),
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: tr('tool.mailId') },
          ...(labels.length > 0 && {
            label: {
              type: 'string',
              enum: labels.map((l) => l.name),
              description: tr('tool.mailLabel'),
            },
          }),
          star: {
            type: 'boolean',
            description: tr('tool.mailStar'),
          },
          reason: {
            type: 'string',
            description: tr('tool.mailReason'),
          },
        },
        required: ['id'],
      },
      destructive: false,
      permission: 'ask',
      alwaysAsk: true,
      describe,
    },
  ];
}

/** Liest die Änderung aus den Eingaben des Modells (gegen die eigenen Labels geprüft). */
export function mailChanges(
  args: Record<string, unknown>,
  labels: MailLabel[],
): {
  messageId: string;
  label?: MailLabel;
  star?: boolean;
  changes: MailChange[];
} {
  const messageId = typeof args.id === 'string' ? args.id.trim() : '';
  if (!messageId) throw new Error(tr('mail.idMissing'));
  let label: MailLabel | undefined;
  if (args.label !== undefined && args.label !== '') {
    label = labels.find((l) => l.name === args.label);
    if (!label)
      throw new Error(tr('mail.labelMissing', { label: String(args.label) }));
  }
  const star = typeof args.star === 'boolean' ? args.star : undefined;
  const changes: MailChange[] = [
    ...(label
      ? [{ kind: 'label' as const, messageId, labelId: label.id }]
      : []),
    ...(star !== undefined
      ? [{ kind: 'star' as const, messageId, starred: star }]
      : []),
  ];
  if (changes.length === 0) {
    throw new Error(tr('mail.noChange'));
  }
  return { messageId, label, star, changes };
}

/** Vorschau für die Rückfrage: welche Mail, was sich ändert, warum. */
export async function describeMailChange(
  client: MailClient,
  args: Record<string, unknown>,
  labels: MailLabel[],
): Promise<string> {
  const { messageId, label, star } = mailChanges(args, labels);
  const [mail] = await client.summaries([messageId]);
  if (label && mail.labelIds.includes(label.id) && star === undefined) {
    throw new Error(tr('mail.hasLabel', { label: label.name }));
  }
  if (star !== undefined && star === mail.starred && !label) {
    throw new Error(star ? tr('mail.hasStar') : tr('mail.hasNoStar'));
  }
  const what = [
    ...(label ? [tr('mail.addLabel', { label: label.name })] : []),
    ...(star !== undefined
      ? [star ? tr('mail.addStar') : tr('mail.removeStar')]
      : []),
  ].join(tr('mail.and'));
  const reason =
    typeof args.reason === 'string' && args.reason.trim()
      ? `\n${tr('mail.reason', { reason: args.reason.trim().slice(0, 200) })}`
      : '';
  return `${what}\n${tr('mail.changePreview', {
    from: mail.from,
    subject: mail.subject || tr('mail.noSubject'),
    date: formatDate(mail.date),
  })}${reason}`;
}

/** Führt ein Mail-Werkzeug aus (Änderungen erst nach deiner Bestätigung). */
export async function callMailTool(
  client: MailClient,
  toolName: string,
  args: Record<string, unknown>,
  labels: MailLabel[],
  allLabels: MailLabel[],
): Promise<string> {
  if (toolName === MAIL_SEARCH_TOOL) {
    const max =
      typeof args.max === 'number' && Number.isFinite(args.max)
        ? Math.min(Math.max(1, Math.round(args.max)), SEARCH_MAX)
        : 10;
    const query = typeof args.query === 'string' ? args.query : undefined;
    const page = await client.list({ query, max });
    if (page.messages.length === 0) return tr('mail.noMails');
    return [
      foreign(),
      query?.trim()
        ? tr('mail.listQuery', {
            count: page.messages.length,
            query: query.trim(),
          })
        : tr('mail.listInbox', { count: page.messages.length }),
      ...page.messages.map((m) => summaryLine(m, allLabels)),
    ].join('\n\n');
  }
  if (toolName === MAIL_READ_TOOL) {
    const id = typeof args.id === 'string' ? args.id.trim() : '';
    if (!id) throw new Error(tr('mail.idMissing'));
    const mail = await client.get(id);
    const text =
      mail.text.length > READ_TEXT_MAX
        ? `${mail.text.slice(0, READ_TEXT_MAX)}\n${tr('mail.restTruncated')}`
        : mail.text || mail.snippet;
    return [
      foreign(),
      summaryLine(mail, allLabels),
      ...(mail.to ? [tr('mail.to', { value: mail.to })] : []),
      ...(mail.cc ? [tr('mail.cc', { value: mail.cc })] : []),
      ...(mail.attachments.length > 0
        ? [
            tr('mail.attachments', {
              names: mail.attachments.map((a) => a.name).join(', '),
            }),
          ]
        : []),
      `<<<MAIL\n${text}\nMAIL>>>`,
    ].join('\n');
  }
  if (toolName === MAIL_CHANGE_TOOL) {
    const { changes } = mailChanges(args, labels);
    for (const change of changes) await client.apply(change);
    return tr('mail.done');
  }
  throw new Error(tr('error.toolMissing', { tool: toolName }));
}

function summaryLine(m: MailSummary, allLabels: MailLabel[]): string {
  const names = m.labelIds
    .map((id) => allLabels.find((l) => l.id === id))
    .filter((l): l is MailLabel => !!l && l.type === 'user')
    .map((l) => l.name);
  const flags = [
    ...(m.unread ? [tr('mail.unread')] : []),
    ...(m.starred ? [tr('mail.starred')] : []),
    ...(names.length > 0 ? [`Labels: ${names.join(', ')}`] : []),
  ];
  return [
    tr('mail.summaryLine', {
      id: m.id,
      date: formatDate(m.date),
      from: m.from || '–',
      subject: m.subject || tr('mail.noSubject'),
      flags: flags.length ? ` · ${flags.join(' · ')}` : '',
    }),
    tr('mail.previewLine', { snippet: m.snippet }),
  ].join('\n');
}

function formatDate(time: number): string {
  return new Date(time).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
