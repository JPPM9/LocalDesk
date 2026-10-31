import { afterEach, describe, expect, it } from 'vitest';
import { GMAIL_API, GmailClient } from '../../src/main/mail/gmail-client';
import { guardedFetch, type Fetch } from '../../src/main/mail/mail-fetch';
import { checkMailChange, MAIL_TEXT_MAX } from '../../src/shared/mail';

const b64 = (text: string, encoding: BufferEncoding = 'utf8') =>
  Buffer.from(text, encoding).toString('base64url');

const LABELS = [
  { id: 'INBOX', name: 'INBOX', type: 'system' },
  { id: 'TRASH', name: 'TRASH', type: 'system' },
  { id: 'Label_7', name: 'Rechnungen', type: 'user' },
];

function message(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    threadId: `t-${id}`,
    labelIds: ['INBOX', 'UNREAD'],
    snippet: 'Hallo &amp; willkommen',
    internalDate: '1793000000000',
    payload: {
      headers: [
        { name: 'From', value: 'Bank <info@bank.example>' },
        { name: 'Subject', value: `Betreff ${id}` },
        { name: 'To', value: 'ich@gmail.com' },
      ],
      ...extra,
    },
  };
}

/** Nachgebautes Gmail: merkt sich Methode, Pfad und Inhalt jeder Anfrage. */
function fakeGmail(
  respond?: (path: string, init?: RequestInit) => Response | undefined,
) {
  const calls: {
    method: string;
    path: string;
    body?: unknown;
    auth?: string;
  }[] = [];
  let tokenNumber = 1;
  const fetch: Fetch = async (url, init) => {
    const path = url.slice(GMAIL_API.length);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      method: init?.method ?? 'GET',
      path,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: headers.Authorization,
    });
    const custom = respond?.(path, init);
    if (custom) return custom;
    if (path.startsWith('/messages?')) {
      return Response.json({
        messages: [{ id: 'm1' }, { id: 'm2' }, { id: '../böse' }],
        nextPageToken: 'weiter',
      });
    }
    const one = /^\/messages\/(\w+)\?format=/.exec(path);
    if (one) return Response.json(message(one[1]));
    if (path === '/labels') return Response.json({ labels: LABELS });
    if (path.endsWith('/modify')) return Response.json({});
    return new Response('', { status: 404 });
  };
  const auth = {
    token: async () => `zugang-${tokenNumber}`,
    invalidate: () => {
      tokenNumber++;
    },
  };
  return { calls, client: new GmailClient(guardedFetch(fetch), auth) };
}

describe('GmailClient.list', () => {
  it('liest den Posteingang mit Kopfdaten und überspringt seltsame Kennungen', async () => {
    const { calls, client } = fakeGmail();
    const page = await client.list({ max: 99 });
    expect(calls[0].path).toBe('/messages?maxResults=50&labelIds=INBOX');
    expect(page.nextPageToken).toBe('weiter');
    expect(page.messages).toEqual([
      {
        id: 'm1',
        threadId: 't-m1',
        from: 'Bank <info@bank.example>',
        subject: 'Betreff m1',
        date: 1793000000000,
        snippet: 'Hallo & willkommen',
        unread: true,
        starred: false,
        labelIds: ['INBOX', 'UNREAD'],
      },
      expect.objectContaining({ id: 'm2' }),
    ]);
    expect(calls.some((c) => c.path.includes('böse'))).toBe(false);
    expect(calls.every((c) => c.auth === 'Bearer zugang-1')).toBe(true);
  });

  it('sucht im ganzen Postfach, wenn eine Suche angegeben ist', async () => {
    const { calls, client } = fakeGmail();
    await client.list({
      query: ' is:unread  from:bank ',
      max: 5,
      pageToken: 'p2',
    });
    expect(calls[0].path).toBe(
      '/messages?maxResults=5&q=is%3Aunread++from%3Abank&pageToken=p2',
    );
  });

  it('holt bei 401 einmal einen frischen Zugangsschlüssel', async () => {
    let first = true;
    const { calls, client } = fakeGmail((path) => {
      if (path === '/labels' && first) {
        first = false;
        return new Response('{}', { status: 401 });
      }
      return undefined;
    });
    await expect(client.labels()).resolves.toHaveLength(3);
    expect(calls.map((c) => c.auth)).toEqual([
      'Bearer zugang-1',
      'Bearer zugang-2',
    ]);
  });

  it('gibt Googles Fehler verständlich weiter', async () => {
    const { client } = fakeGmail(() =>
      Response.json({ error: { message: 'Quota exceeded' } }, { status: 403 }),
    );
    await expect(client.list({ max: 5 })).rejects.toThrow(
      'Gmail lehnt die Anfrage ab (403): Quota exceeded',
    );
  });
});

describe('GmailClient.get', () => {
  it('nimmt den Text-Teil und listet Anhänge, ohne sie zu laden', async () => {
    const { client } = fakeGmail((path) =>
      path.startsWith('/messages/m1?')
        ? Response.json(
            message('m1', {
              mimeType: 'multipart/mixed',
              parts: [
                {
                  mimeType: 'multipart/alternative',
                  parts: [
                    {
                      mimeType: 'text/plain',
                      headers: [
                        {
                          name: 'Content-Type',
                          value: 'text/plain; charset="iso-8859-1"',
                        },
                      ],
                      body: { data: b64('Grüße\r\naus Köln', 'latin1') },
                    },
                    {
                      mimeType: 'text/html',
                      body: { data: b64('<p>HTML</p>') },
                    },
                  ],
                },
                {
                  mimeType: 'text/plain',
                  filename: 'notiz.txt',
                  body: { size: 1234, attachmentId: 'a1' },
                },
              ],
            }),
          )
        : undefined,
    );
    const mail = await client.get('m1');
    expect(mail.text).toBe('Grüße\naus Köln');
    expect(mail.to).toBe('ich@gmail.com');
    expect(mail.truncated).toBe(false);
    expect(mail.attachments).toEqual([{ name: 'notiz.txt', size: 1234 }]);
  });

  it('wandelt reine HTML-Mails in Text und kürzt sehr lange', async () => {
    const long = `<p>${'a'.repeat(MAIL_TEXT_MAX + 10)}</p>`;
    const { client } = fakeGmail((path) =>
      path.startsWith('/messages/m1?')
        ? Response.json(
            message('m1', { mimeType: 'text/html', body: { data: b64(long) } }),
          )
        : undefined,
    );
    const mail = await client.get('m1');
    expect(mail.text).toHaveLength(MAIL_TEXT_MAX);
    expect(mail.truncated).toBe(true);
  });

  it('lehnt seltsame Kennungen ab, bevor eine Anfrage rausgeht', async () => {
    const { calls, client } = fakeGmail();
    await expect(client.get('../../labels')).rejects.toThrow('Unbekannte');
    expect(calls).toEqual([]);
  });
});

describe('GmailClient.apply', () => {
  it('setzt nur eigene Labels', async () => {
    const { calls, client } = fakeGmail();
    await client.apply({ kind: 'label', messageId: 'm1', labelId: 'Label_7' });
    expect(calls.at(-1)).toMatchObject({
      method: 'POST',
      path: '/messages/m1/modify',
      body: { addLabelIds: ['Label_7'] },
    });
    // Systemlabels wie TRASH wären „Löschen durch die Hintertür“.
    await expect(
      client.apply({ kind: 'label', messageId: 'm1', labelId: 'TRASH' }),
    ).rejects.toThrow('gibt es nicht');
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('setzt und entfernt den Stern', async () => {
    const { calls, client } = fakeGmail();
    await client.apply({ kind: 'star', messageId: 'm1', starred: true });
    await client.apply({ kind: 'star', messageId: 'm1', starred: false });
    expect(calls.map((c) => c.body)).toEqual([
      { addLabelIds: ['STARRED'] },
      { removeLabelIds: ['STARRED'] },
    ]);
  });

  it('kennt keine anderen Schreib-Aufrufe (kein Senden, Löschen, Papierkorb)', async () => {
    const { calls, client } = fakeGmail();
    await client.list({ max: 3 });
    await client.get('m1');
    await client.labels();
    await client.apply({ kind: 'star', messageId: 'm1', starred: true });
    await client.apply({ kind: 'label', messageId: 'm2', labelId: 'Label_7' });
    for (const call of calls) {
      expect(call.method === 'GET' || call.path.endsWith('/modify')).toBe(true);
      expect(call.path).not.toMatch(
        /send|trash|delete|batch|drafts|import|insert/i,
      );
    }
  });
});

describe('GmailClient.createLabel / renameLabel', () => {
  // Nachgebautes Gmail kennt neu angelegte Labels bei späteren Abfragen.
  const labelApi = (path: string, init?: RequestInit) => {
    if (path === '/labels' && init?.method === 'POST') {
      const { name } = JSON.parse(String(init.body)) as { name: string };
      LABELS.push({ id: 'Label_9', name, type: 'user' });
      return Response.json({ id: 'Label_9', name, type: 'user' });
    }
    if (path.startsWith('/labels/') && init?.method === 'PATCH') {
      const { name } = JSON.parse(String(init.body)) as { name: string };
      return Response.json({ id: path.slice('/labels/'.length), name });
    }
    return undefined;
  };

  afterEach(() => {
    // Die Test-Labels aus dem gemeinsamen Nachbau wieder entfernen.
    LABELS.splice(3);
  });

  it('legt ein eigenes Label an und kann es danach sofort setzen', async () => {
    const { calls, client } = fakeGmail(labelApi);
    // Zwischenspeicher der Labels füllen – das neue Label darf trotzdem nicht fehlen.
    await client.apply({ kind: 'label', messageId: 'm1', labelId: 'Label_7' });
    const label = await client.createLabel('  Reisen ');
    expect(label).toEqual({ id: 'Label_9', name: 'Reisen', type: 'user' });
    const post = calls.find((c) => c.method === 'POST' && c.path === '/labels');
    expect(post?.body).toEqual({
      name: 'Reisen',
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    });
    await client.apply({ kind: 'label', messageId: 'm1', labelId: 'Label_9' });
    expect(calls.at(-1)).toMatchObject({
      path: '/messages/m1/modify',
      body: { addLabelIds: ['Label_9'] },
    });
  });

  it('prüft den Namen gegen die echten Labels, bevor er an Gmail geht', async () => {
    const { calls, client } = fakeGmail(labelApi);
    for (const [name, text] of [
      ['rechnungen', 'gibt es schon'],
      ['inbox', 'Gmail selbst'],
      ['', 'fehlt'],
    ] as const) {
      await expect(client.createLabel(name), name).rejects.toThrow(text);
    }
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('weist eine Antwort ohne gültige Kennung zurück', async () => {
    const { client } = fakeGmail((path, init) =>
      path === '/labels' && init?.method === 'POST'
        ? Response.json({ id: '../x', name: 'Reisen' })
        : undefined,
    );
    await expect(client.createLabel('Reisen')).rejects.toThrow(
      'nicht richtig zurückgemeldet',
    );
  });

  it('benennt nur eigene Labels um', async () => {
    const { calls, client } = fakeGmail(labelApi);
    await expect(client.renameLabel('Label_7', 'Belege')).resolves.toEqual({
      id: 'Label_7',
      name: 'Belege',
      type: 'user',
    });
    expect(calls.at(-1)).toMatchObject({
      method: 'PATCH',
      path: '/labels/Label_7',
      body: { name: 'Belege' },
    });
    // Systemlabels (TRASH) und unbekannte Labels bleiben unberührt.
    await expect(client.renameLabel('TRASH', 'Mülleimer')).rejects.toThrow(
      'gibt es nicht',
    );
    await expect(client.renameLabel('Label_99', 'Neu')).rejects.toThrow(
      'gibt es nicht',
    );
    await expect(client.renameLabel('../x', 'Neu')).rejects.toThrow(
      'Unbekannte',
    );
    await expect(client.renameLabel('Label_7', 'Rechnungen')).rejects.toThrow(
      'heißt schon so',
    );
    await expect(client.renameLabel('Label_7', 'SPAM')).rejects.toThrow(
      'Gmail selbst',
    );
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1);
  });

  it('schreibt sonst nur über modify – kein Löschen von Labels', async () => {
    const { calls, client } = fakeGmail(labelApi);
    await client.createLabel('Reisen');
    await client.renameLabel('Label_7', 'Belege');
    await client.apply({ kind: 'star', messageId: 'm1', starred: true });
    for (const call of calls) {
      expect(
        call.method === 'GET' ||
          call.method === 'PATCH' ||
          (call.method === 'POST' &&
            (call.path === '/labels' || call.path.endsWith('/modify'))),
      ).toBe(true);
      expect(call.method).not.toBe('DELETE');
    }
  });

  it('kennt „newLabel“ nicht als einzelne Änderung', async () => {
    const { client } = fakeGmail();
    await expect(
      client.apply({ kind: 'newLabel', messageId: 'm1', name: 'Reisen' }),
    ).rejects.toThrow('gibt es in LocalDesk nicht');
  });
});

describe('checkMailChange', () => {
  it('lässt nur Label und Stern durch', () => {
    expect(
      checkMailChange({ kind: 'star', messageId: 'm1', starred: true }).ok,
    ).toBe(true);
    expect(
      checkMailChange({ kind: 'label', messageId: 'm1', labelId: 'Label_7' })
        .ok,
    ).toBe(true);
    expect(
      checkMailChange({ kind: 'newLabel', messageId: 'm1', name: ' Reisen ' }),
    ).toEqual({
      ok: true,
      value: { kind: 'newLabel', messageId: 'm1', name: 'Reisen' },
    });
    for (const bad of [
      { kind: 'newLabel', messageId: 'm1', name: '' },
      { kind: 'newLabel', messageId: 'm1', name: 'INBOX' },
      { kind: 'newLabel', messageId: 'm1', name: 'x'.repeat(101) },
      { kind: 'newLabel', messageId: 'm1' },
      { kind: 'trash', messageId: 'm1' },
      { kind: 'send', messageId: 'm1' },
      { kind: 'label', messageId: 'm1', labelId: '../x' },
      { kind: 'star', messageId: 'm1', starred: 'ja' },
      { kind: 'star', messageId: '', starred: true },
      null,
    ]) {
      expect(checkMailChange(bad).ok).toBe(false);
    }
  });
});
