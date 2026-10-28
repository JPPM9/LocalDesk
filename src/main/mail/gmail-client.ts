import {
  isMailId,
  MAIL_PAGE_MAX,
  MAIL_QUERY_MAX,
  MAIL_TEXT_MAX,
  type MailChange,
  type MailLabel,
  type MailMessage,
  type MailPage,
  type MailSummary,
} from '../../shared/mail';
import { describeGmailError, type GoogleApiError } from './google-auth';
import { decodeEntities, htmlToText } from './html-to-text';
import { mapLimit, type MailClient } from './mail-client';
import type { Fetch } from './mail-fetch';

export const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** HTML über dieser Größe wird vor dem Umwandeln abgeschnitten. */
const HTML_MAX = 2_000_000;

export interface GmailAuth {
  /** Gültiger Zugangsschlüssel. */
  token(): Promise<string>;
  /** Zugangsschlüssel verwerfen (Gmail hat ihn mit 401 abgelehnt). */
  invalidate(): void;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
}

/**
 * Gmail über die REST-API. Geschrieben wird nur über `modify` – und nur ein
 * Label hinzufügen oder den Stern setzen/entfernen.
 */
export class GmailClient implements MailClient {
  private labelCheck: Promise<MailLabel[]> | null = null;

  constructor(
    private readonly fetch: Fetch,
    private readonly auth: GmailAuth,
  ) {}

  async list(options: {
    query?: string;
    labelId?: string;
    pageToken?: string;
    max: number;
  }): Promise<MailPage> {
    const params = new URLSearchParams({
      maxResults: String(Math.min(Math.max(1, options.max), MAIL_PAGE_MAX)),
    });
    const query = options.query?.trim().slice(0, MAIL_QUERY_MAX);
    if (query) params.set('q', query);
    const labelId = options.labelId ?? (query ? undefined : 'INBOX');
    if (labelId) params.set('labelIds', checkedId(labelId));
    if (options.pageToken) {
      params.set('pageToken', options.pageToken.slice(0, 500));
    }

    const page = await this.request<{
      messages?: { id: string }[];
      nextPageToken?: string;
    }>(`/messages?${params}`);
    const ids = (page.messages ?? []).map((m) => m.id).filter(isMailId);
    const messages = await this.summaries(ids);
    return {
      messages,
      ...(page.nextPageToken && { nextPageToken: page.nextPageToken }),
    };
  }

  /** Je Mail eine Anfrage für die Kopfdaten – höchstens 8 gleichzeitig. */
  summaries(messageIds: string[]): Promise<MailSummary[]> {
    return mapLimit(messageIds.map(checkedId), 8, (id) =>
      this.request<GmailMessage>(
        `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      ).then(toSummary),
    );
  }

  async get(messageId: string): Promise<MailMessage> {
    const message = await this.request<GmailMessage>(
      `/messages/${checkedId(messageId)}?format=full`,
    );
    const summary = toSummary(message);
    const payload = message.payload ?? {};
    const full = bodyText(payload);
    return {
      ...summary,
      to: header(payload, 'To'),
      cc: header(payload, 'Cc'),
      text: full.slice(0, MAIL_TEXT_MAX),
      truncated: full.length > MAIL_TEXT_MAX,
      attachments: attachments(payload),
    };
  }

  async labels(): Promise<MailLabel[]> {
    const { labels = [] } = await this.request<{
      labels?: { id: string; name: string; type?: string }[];
    }>('/labels');
    return labels
      .filter((l) => isMailId(l.id) && typeof l.name === 'string')
      .map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type === 'user' ? ('user' as const) : ('system' as const),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async apply(change: MailChange): Promise<void> {
    const messageId = checkedId(change.messageId);
    let body: { addLabelIds?: string[]; removeLabelIds?: string[] };
    if (change.kind === 'label') {
      // Nur eigene Labels – keine Systemlabels wie TRASH, SPAM oder SENT.
      // Die Labels nur einmal pro Durchgang holen (mehrere Änderungen hintereinander).
      this.labelCheck ??= this.labels();
      const label = (await this.labelCheck).find(
        (l) => l.id === change.labelId,
      );
      if (!label || label.type !== 'user') {
        throw new Error('Dieses Label gibt es nicht (mehr).');
      }
      body = { addLabelIds: [label.id] };
    } else {
      body = change.starred
        ? { addLabelIds: ['STARRED'] }
        : { removeLabelIds: ['STARRED'] };
    }
    await this.request(`/messages/${messageId}/modify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** Eine Anfrage an Gmail; bei 401 einmal mit frischem Zugangsschlüssel. */
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetch(`${GMAIL_API}${path}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${await this.auth.token()}`,
        },
      });
      if (response.status === 401 && attempt === 0) {
        this.auth.invalidate();
        continue;
      }
      const body = (await response.json().catch(() => ({}))) as T &
        GoogleApiError;
      if (!response.ok) {
        throw new Error(describeGmailError(response.status, body));
      }
      return body;
    }
  }
}

function checkedId(id: string): string {
  if (!isMailId(id)) throw new Error('Unbekannte Kennung.');
  return id;
}

function header(part: GmailPart, name: string): string {
  const lower = name.toLowerCase();
  return (
    part.headers?.find((h) => h.name.toLowerCase() === lower)?.value ?? ''
  ).trim();
}

function toSummary(message: GmailMessage): MailSummary {
  const payload = message.payload ?? {};
  const labelIds = message.labelIds ?? [];
  const date = Number(message.internalDate);
  return {
    id: message.id,
    threadId: message.threadId,
    from: header(payload, 'From'),
    subject: header(payload, 'Subject'),
    date: Number.isFinite(date) ? date : 0,
    snippet: decodeEntities(message.snippet ?? ''),
    unread: labelIds.includes('UNREAD'),
    starred: labelIds.includes('STARRED'),
    labelIds,
  };
}

/** Text der Mail: bevorzugt der Text-Teil, sonst der umgewandelte HTML-Teil. */
export function bodyText(payload: GmailPart): string {
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (part: GmailPart) => {
    // Angehängte Dateien (auch .txt/.html) gehören nicht zum Mailtext.
    if (part.filename) return;
    const type = (part.mimeType ?? '').toLowerCase();
    if (part.body?.data && type === 'text/plain') plain.push(decodePart(part));
    else if (part.body?.data && type === 'text/html')
      html.push(decodePart(part));
    for (const child of part.parts ?? []) walk(child);
  };
  walk(payload);
  if (plain.length > 0)
    return plain.join('\n\n').replace(/\r\n?/g, '\n').trim();
  return htmlToText(html.join('\n').slice(0, HTML_MAX));
}

function decodePart(part: GmailPart): string {
  const bytes = Buffer.from(part.body?.data ?? '', 'base64url');
  const charset =
    /charset\s*=\s*"?([\w.:-]+)/i.exec(header(part, 'Content-Type'))?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // Unbekannter Zeichensatz – UTF-8 ist die beste Annahme.
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function attachments(payload: GmailPart): { name: string; size: number }[] {
  const found: { name: string; size: number }[] = [];
  const walk = (part: GmailPart) => {
    if (part.filename) {
      found.push({ name: part.filename, size: part.body?.size ?? 0 });
    }
    for (const child of part.parts ?? []) walk(child);
  };
  walk(payload);
  return found;
}
