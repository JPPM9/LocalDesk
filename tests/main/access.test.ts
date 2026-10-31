import { describe, expect, it, vi } from 'vitest';
import type { ChatChunk, ChatRequest } from '../../src/shared/api';
import { setMessageLanguage } from '../../src/shared/messages';
import {
  AccessGrants,
  checkAccessArguments,
  type AccessDeps,
  type Mailbox,
} from '../../src/main/access';
import { mailTools } from '../../src/main/mail/mail-tools';
import type { Provider } from '../../src/main/providers/provider';
import { runAnswer, type ToolRuntime } from '../../src/main/tool-loop';

const MAILBOX = { client: {}, labels: [], allLabels: [] } as unknown as Mailbox;

function setup(
  options: {
    accounts?: { id: string; email: string }[];
    servers?: { id: string; name: string; folders: string[] }[];
    mailbox?: Mailbox | null;
    serverIds?: string[];
  } = {},
) {
  const persisted: unknown[] = [];
  const deps: AccessDeps = {
    mailAccounts: () =>
      options.accounts ?? [{ id: 'a1', email: 'ich@gmail.com' }],
    servers: () =>
      options.servers ?? [
        { id: 's1', name: 'Dokumente', folders: ['C:\\Docs'] },
        { id: 's2', name: 'Fotos', folders: ['C:\\Fotos'] },
      ],
    openMailbox: async (id) => (id === 'a1' ? MAILBOX : null),
    persist: (patch) => persisted.push(patch),
  };
  const grants = new AccessGrants(deps, {
    mailbox: options.mailbox ?? null,
    serverIds: options.serverIds ?? [],
  });
  return { grants, persisted };
}

describe('checkAccessArguments', () => {
  it('behält nur gültige Werte', () => {
    expect(
      checkAccessArguments({
        what: 'mail',
        reason: 'x'.repeat(500),
        ids: ['a1', 'a1', '', 5, 'b'],
        scope: 'chat',
      }),
    ).toEqual({
      what: 'mail',
      reason: 'x'.repeat(300),
      ids: ['a1', 'b'],
      scope: 'chat',
    });
    expect(checkAccessArguments({ what: 'mail' })).toEqual({
      what: 'mail',
      reason: '',
      ids: [],
    });
    expect(
      checkAccessArguments({ what: 'mail', scope: 'immer' }),
    ).not.toHaveProperty('scope');
    expect(checkAccessArguments({ what: 'alles' })).toBeNull();
    expect(checkAccessArguments(null)).toBeNull();
  });
});

describe('AccessGrants', () => {
  it('bietet nur an, worum man noch bitten kann', () => {
    expect(setup().grants.kinds()).toEqual(['mail', 'files']);
    expect(setup({ mailbox: MAILBOX }).grants.kinds()).toEqual(['files']);
    expect(setup({ serverIds: ['s1', 's2'] }).grants.kinds()).toEqual(['mail']);
    expect(setup({ accounts: [], servers: [] }).grants.kinds()).toEqual([]);
    expect(setup({ accounts: [], servers: [] }).grants.tool()).toBeNull();
  });

  it('das Werkzeug fragt immer nach und nennt nur die möglichen Arten', () => {
    const tool = setup({ mailbox: MAILBOX }).grants.tool()!;
    expect(tool).toMatchObject({
      toolName: 'request_access',
      permission: 'ask',
      alwaysAsk: true,
      destructive: false,
    });
    expect(tool.editable).toBeDefined();
    const what = (
      tool.inputSchema.properties as Record<string, { enum: string[] }>
    ).what;
    expect(what.enum).toEqual(['files']);
  });

  it('ohne Auswahl oder Dauer wird nichts freigegeben', async () => {
    const { grants, persisted } = setup();
    for (const args of [
      { what: 'mail' },
      { what: 'mail', ids: ['a1'] },
      { what: 'mail', scope: 'chat', ids: [] },
    ]) {
      const result = await grants.grant(args);
      expect(result.isError).toBe(true);
      expect(result.text).toBe('Keine Auswahl getroffen.');
    }
    expect(grants.mailbox).toBeNull();
    expect(persisted).toEqual([]);
  });

  it('Postfach „für diesen Chat“: gleich verfügbar und dauerhaft gemerkt', async () => {
    const { grants, persisted } = setup();
    const result = await grants.grant({
      what: 'mail',
      ids: ['a1'],
      scope: 'chat',
    });
    expect(result).toEqual({
      text: 'Zugriff erlaubt: Postfach ich@gmail.com (für diesen Chat). Die E-Mail-Werkzeuge stehen jetzt bereit – nutze sie jetzt, statt zu raten.',
      isError: false,
    });
    expect(grants.mailbox).toBe(MAILBOX);
    expect(persisted).toEqual([{ mailAccountId: 'a1' }]);
    expect(grants.kinds()).toEqual(['files']);
  });

  it('„nur diese Antwort“ wird nicht gespeichert', async () => {
    const { grants, persisted } = setup();
    await grants.grant({ what: 'mail', ids: ['a1'], scope: 'once' });
    expect(grants.mailbox).toBe(MAILBOX);
    expect(persisted).toEqual([]);
  });

  it('ein unbekanntes Konto oder ein erfundener Server wird abgelehnt', async () => {
    const { grants, persisted } = setup();
    expect(
      (await grants.grant({ what: 'mail', ids: ['fremd'], scope: 'chat' }))
        .text,
    ).toBe('Dieses Postfach gibt es nicht (mehr).');
    expect(
      (await grants.grant({ what: 'files', ids: ['s9'], scope: 'chat' }))
        .isError,
    ).toBe(true);
    expect(grants.mailbox).toBeNull();
    expect(grants.serverIds).toEqual([]);
    expect(persisted).toEqual([]);
  });

  it('Datei-Server: nur die gewählten, ohne Doppelte', async () => {
    const { grants, persisted } = setup({ serverIds: ['s2'] });
    const result = await grants.grant({
      what: 'files',
      ids: ['s1', 's2'],
      scope: 'chat',
    });
    expect(result.text).toBe(
      'Zugriff erlaubt: Dateien über Dokumente (für diesen Chat). Die Dateiwerkzeuge dieser Server stehen jetzt bereit – lies die Datei damit, erfinde keine Inhalte.',
    );
    expect(grants.serverIds).toEqual(['s2', 's1']);
    expect(persisted).toEqual([{ serverIds: ['s1'] }]);
    expect(grants.kinds()).toEqual(['mail']);
    // Zweimal dasselbe geht nicht.
    expect(
      (await grants.grant({ what: 'files', ids: ['s1'], scope: 'chat' })).text,
    ).toBe('Diesen Zugriff gibt es in diesem Chat schon.');
  });

  it('Texte folgen der Sprache', async () => {
    setMessageLanguage('en');
    try {
      const { grants } = setup();
      expect(
        (await grants.grant({ what: 'mail', ids: ['a1'], scope: 'once' })).text,
      ).toBe(
        'Access allowed: mailbox ich@gmail.com (for this answer only). The e-mail tools are now available – use them now instead of guessing.',
      );
    } finally {
      setMessageLanguage('de');
    }
  });
});

describe('Zugriff im Lauf einer Antwort', () => {
  it('Modell bittet → Karte erlaubt → Mail-Werkzeuge stehen in der nächsten Runde bereit', async () => {
    const { grants } = setup({ servers: [] });
    const runtime: ToolRuntime = {
      tools: () => [
        ...(grants.tool() ? [grants.tool()!] : []),
        ...(grants.mailbox ? mailTools([], async () => '') : []),
      ],
      call: async (tool, args) =>
        tool.toolName === 'request_access'
          ? grants.grant(args)
          : { text: 'Mails', isError: false },
      // Deine Wahl in der Karte: Konto a1, für diesen Chat.
      ask: vi.fn(async () => ({
        decision: 'once' as const,
        arguments: {
          what: 'mail',
          reason: 'Mails lesen',
          ids: ['a1'],
          scope: 'chat',
        },
      })),
      allowAlways: vi.fn(),
    };
    const requests: ChatRequest[] = [];
    const provider = {
      async *chat(request: ChatRequest): AsyncGenerator<ChatChunk> {
        requests.push(structuredClone(request));
        if (requests.length === 1) {
          yield {
            type: 'tool-calls',
            calls: [
              {
                name: 'request_access',
                arguments: { what: 'mail', reason: 'Mails lesen' },
              },
            ],
          };
        } else {
          yield { type: 'content', text: 'Fertig' };
        }
      },
    } as unknown as Provider;

    await runAnswer({
      provider,
      request: {
        model: 'm',
        messages: [{ role: 'user', content: 'Was ist neu?' }],
      },
      requestId: 'r',
      runtime,
      emit: () => {},
      signal: new AbortController().signal,
      newId: () => 'id',
    });

    const names = (i: number) => requests[i].tools?.map((t) => t.name) ?? [];
    expect(names(0)).toEqual(['request_access']);
    expect(names(1)).toEqual([
      'mail_search',
      'mail_read',
      'mail_change',
      'mail_create_label',
    ]);
    expect(runtime.ask).toHaveBeenCalledOnce();
    expect(requests[1].messages.at(-1)?.content).toContain('Zugriff erlaubt');
  });

  it('lehnst du ab, bleibt alles zu', async () => {
    const { grants } = setup({ servers: [] });
    const runtime: ToolRuntime = {
      tools: () => [...(grants.tool() ? [grants.tool()!] : [])],
      call: async (tool, args) => grants.grant(args),
      ask: vi.fn(async () => ({ decision: 'deny' as const })),
      allowAlways: vi.fn(),
    };
    let round = 0;
    const provider = {
      async *chat(): AsyncGenerator<ChatChunk> {
        round++;
        yield round === 1
          ? {
              type: 'tool-calls',
              calls: [{ name: 'request_access', arguments: { what: 'mail' } }],
            }
          : { type: 'content', text: 'Okay' };
      },
    } as unknown as Provider;
    await runAnswer({
      provider,
      request: { model: 'm', messages: [{ role: 'user', content: 'x' }] },
      requestId: 'r',
      runtime,
      emit: () => {},
      signal: new AbortController().signal,
      newId: () => 'id',
    });
    expect(grants.mailbox).toBeNull();
  });
});
