import {
  ACCESS_TOOL_NAME,
  ACCESS_TOOL_SERVER,
  isAccessKind,
  type AccessKind,
  type AccessScope,
} from '../shared/access';
import type { MailLabel } from '../shared/mail';
import { tr } from '../shared/messages';
import type { OfferedTool } from '../shared/tools';
import type { MailClient } from './mail/mail-client';
import type { ToolResult } from './tool-loop';

/** Ein geöffnetes Postfach für die Mail-Werkzeuge. */
export interface Mailbox {
  client: MailClient;
  /** Eigene Labels (zum Vorschlagen). */
  labels: MailLabel[];
  allLabels: MailLabel[];
}

export interface AccessDeps {
  mailAccounts(): { id: string; email: string }[];
  /** Laufende MCP-Datei-Server. */
  servers(): { id: string; name: string; folders: string[] }[];
  openMailbox(accountId: string): Promise<Mailbox | null>;
  /** „Für diesen Chat erlauben“: dauerhaft in den Einstellungen des Chats merken. */
  persist(patch: { mailAccountId?: string; serverIds?: string[] }): void;
}

const IDS_MAX = 20;

/**
 * Prüft die Eingaben der Freigabe-Karte (und des Modells): was, welche Auswahl, wie lange.
 * Die Auswahl (`ids`) und `scope` kommen von dir, nicht vom Modell.
 */
export function checkAccessArguments(
  args: unknown,
): Record<string, unknown> | null {
  if (typeof args !== 'object' || args === null) return null;
  const raw = args as Record<string, unknown>;
  if (!isAccessKind(raw.what)) return null;
  const ids = Array.isArray(raw.ids)
    ? raw.ids.filter(
        (id): id is string =>
          typeof id === 'string' && id !== '' && id.length <= 100,
      )
    : [];
  return {
    what: raw.what,
    reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 300) : '',
    ids: [...new Set(ids)].slice(0, IDS_MAX),
    ...(raw.scope === 'chat' || raw.scope === 'once'
      ? { scope: raw.scope }
      : {}),
  };
}

/**
 * Freigaben, die im Lauf einer Antwort dazukommen können. Das Modell bittet mit
 * „request_access“, DU entscheidest in der Karte (Auswahl + Dauer). Erst danach
 * stehen Postfach oder Datei-Werkzeuge bereit – schon in der nächsten Runde.
 */
export class AccessGrants {
  mailbox: Mailbox | null;
  serverIds: string[];

  constructor(
    private readonly deps: AccessDeps,
    initial: { mailbox: Mailbox | null; serverIds: string[] },
  ) {
    this.mailbox = initial.mailbox;
    this.serverIds = [...initial.serverIds];
  }

  /** Worum das Modell noch bitten kann (was in diesem Chat nicht schon an ist). */
  kinds(): AccessKind[] {
    const kinds: AccessKind[] = [];
    if (this.mailbox === null && this.deps.mailAccounts().length > 0) {
      kinds.push('mail');
    }
    if (this.deps.servers().some((s) => !this.serverIds.includes(s.id))) {
      kinds.push('files');
    }
    return kinds;
  }

  /** Das Werkzeug „Zugriff anfragen“ – nur, wenn es etwas zu erbitten gibt. */
  tool(): OfferedTool | null {
    const kinds = this.kinds();
    if (kinds.length === 0) return null;
    return {
      serverId: ACCESS_TOOL_SERVER,
      serverName: 'LocalDesk',
      toolName: ACCESS_TOOL_NAME,
      description: tr('tool.requestAccess'),
      inputSchema: {
        type: 'object',
        properties: {
          what: {
            type: 'string',
            enum: kinds,
            description: tr('tool.accessWhat'),
          },
          reason: {
            type: 'string',
            description: tr('tool.accessReason'),
          },
        },
        required: ['what'],
      },
      destructive: false,
      permission: 'ask',
      alwaysAsk: true,
      editable: { checkArguments: checkAccessArguments },
    };
  }

  /** Führt die Freigabe aus, nachdem du in der Karte entschieden hast. */
  async grant(args: Record<string, unknown>): Promise<ToolResult> {
    const fail = (text: string): ToolResult => ({ text, isError: true });
    const checked = checkAccessArguments(args) as {
      what: AccessKind;
      ids: string[];
      scope?: AccessScope;
    } | null;
    if (!checked || !checked.scope || checked.ids.length === 0) {
      return fail(tr('access.noChoice'));
    }
    if (!this.kinds().includes(checked.what)) {
      return fail(tr('access.alreadyGranted'));
    }
    const scope =
      checked.scope === 'chat'
        ? tr('access.scopeChat')
        : tr('access.scopeOnce');

    if (checked.what === 'mail') {
      const account = this.deps
        .mailAccounts()
        .find((a) => a.id === checked.ids[0]);
      if (!account) return fail(tr('access.noSuchAccount'));
      const mailbox = await this.deps.openMailbox(account.id);
      if (!mailbox) return fail(tr('access.noSuchAccount'));
      this.mailbox = mailbox;
      if (checked.scope === 'chat') {
        this.deps.persist({ mailAccountId: account.id });
      }
      return {
        text: tr('access.mailGranted', { email: account.email, scope }),
        isError: false,
      };
    }

    const allowed = this.deps
      .servers()
      .filter(
        (s) => checked.ids.includes(s.id) && !this.serverIds.includes(s.id),
      );
    if (allowed.length === 0) return fail(tr('access.noSuchServer'));
    this.serverIds = [...this.serverIds, ...allowed.map((s) => s.id)];
    if (checked.scope === 'chat') {
      this.deps.persist({ serverIds: allowed.map((s) => s.id) });
    }
    return {
      text: tr('access.filesGranted', {
        names: allowed.map((s) => s.name).join(', '),
        scope,
      }),
      isError: false,
    };
  }
}
