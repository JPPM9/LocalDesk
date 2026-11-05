import http from 'node:http';
import type { AddressInfo } from 'node:net';
import zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkWebUrl } from '../../src/main/web/address';
import {
  decodeBody,
  fetchWebPage,
  isTextType,
  type WebFetchDeps,
} from '../../src/main/web/fetch';
import { setMessageLanguage } from '../../src/shared/messages';

afterEach(() => setMessageLanguage('de'));

/** Ein Testserver auf 127.0.0.1; `seen` merkt sich, was ankam. */
let server: http.Server;
let port: number;
let seen: http.IncomingMessage[];
let handler: (req: http.IncomingMessage, res: http.ServerResponse) => void;

beforeEach(async () => {
  seen = [];
  handler = (_req, res) => res.end('ok');
  server = http.createServer((req, res) => {
    seen.push(req);
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** „Das Internet“ im Test: example.test liegt auf 127.0.0.1, alles ist erlaubt. */
const open = (extra: WebFetchDeps = {}): WebFetchDeps => ({
  resolve: async () => [{ address: '127.0.0.1', family: 4 }],
  isAllowedAddress: () => true,
  checkUrl: (raw) => ({ ok: true, value: new URL(raw) }),
  ...extra,
});
const page = (path = '/') => new URL(`http://example.test:${port}${path}`);
const signal = () => new AbortController().signal;
const html = (
  res: http.ServerResponse,
  body: string,
  type = 'text/html; charset=utf-8',
) => {
  res.writeHead(200, { 'content-type': type });
  res.end(body);
};

describe('fetchWebPage: normale Seiten', () => {
  it('lädt HTML und liefert Adresse, Typ und Text', async () => {
    handler = (_req, res) => html(res, '<html><body>Grüße</body></html>');
    expect(await fetchWebPage(page('/a?b=1'), signal(), open())).toEqual({
      ok: true,
      value: {
        url: `http://example.test:${port}/a?b=1`,
        contentType: 'text/html',
        text: '<html><body>Grüße</body></html>',
        truncated: false,
        redirected: false,
      },
    });
  });

  it('schickt nur das Nötigste: GET, ein klarer User-Agent, keine Cookies, kein Referer', async () => {
    await fetchWebPage(page('/x'), signal(), open());
    const req = seen[0];
    expect(req.method).toBe('GET');
    expect(req.url).toBe('/x');
    expect(req.headers['user-agent']).toMatch(/^LocalDesk/);
    expect(req.headers['accept-encoding']).toBe('gzip, deflate, br');
    for (const name of ['cookie', 'referer', 'authorization', 'origin']) {
      expect(req.headers[name], name).toBeUndefined();
    }
    expect(req.headers.host).toBe(`example.test:${port}`);
  });

  it('versteht Text, Markdown, JSON und XML', async () => {
    for (const type of [
      'text/plain',
      'text/markdown',
      'application/json',
      'application/xml',
      'application/rss+xml',
      'application/vnd.api+json',
    ]) {
      handler = (_req, res) => html(res, 'Inhalt', type);
      const result = await fetchWebPage(page(), signal(), open());
      expect(result.ok, type).toBe(true);
    }
  });
});

describe('fetchWebPage: Weiterleitungen', () => {
  it('folgt Weiterleitungen (auch relative) und meldet die Endadresse', async () => {
    handler = (req, res) => {
      if (req.url === '/a') {
        res.writeHead(301, { location: '/b' });
        res.end();
      } else if (req.url === '/b') {
        res.writeHead(302, { location: `http://example.test:${port}/ziel` });
        res.end();
      } else {
        html(res, 'Ziel');
      }
    };
    const result = await fetchWebPage(page('/a'), signal(), open());
    expect(result).toMatchObject({
      ok: true,
      value: {
        url: `http://example.test:${port}/ziel`,
        text: 'Ziel',
        redirected: true,
      },
    });
    expect(seen.map((r) => r.url)).toEqual(['/a', '/b', '/ziel']);
  });

  it('höchstens 5 Weiterleitungen', async () => {
    handler = (req, res) => {
      const n = Number(req.url!.slice(1)) || 0;
      res.writeHead(302, { location: `/${n + 1}` });
      res.end();
    };
    expect(await fetchWebPage(page('/0'), signal(), open())).toEqual({
      ok: false,
      error: 'Die Adresse leitet zu oft weiter.',
    });
    expect(seen).toHaveLength(6); // die erste Anfrage + 5 Weiterleitungen
    // genau 5 gehen noch
    seen = [];
    handler = (req, res) => {
      const n = Number(req.url!.slice(1)) || 0;
      if (n < 5) {
        res.writeHead(302, { location: `/${n + 1}` });
        res.end();
      } else {
        html(res, 'angekommen');
      }
    };
    expect((await fetchWebPage(page('/0'), signal(), open())).ok).toBe(true);
  });

  it('jede Weiterleitung wird neu geprüft: auf eine private Adresse geht es nie', async () => {
    for (const target of [
      'http://127.0.0.1:11434/api/tags',
      'http://localhost/',
      'http://169.254.169.254/latest/meta-data/',
      'http://192.168.178.1/',
      'http://[::1]/',
      'file:///C:/Windows/win.ini',
      'ftp://example.com/x',
    ]) {
      seen = [];
      handler = (_req, res) => {
        res.writeHead(302, { location: target });
        res.end();
      };
      // Die erste Adresse darf (Testserver), jede Weiterleitung prüft die echte Regel.
      const result = await fetchWebPage(
        page(),
        signal(),
        open({ checkUrl: checkWebUrl }),
      );
      expect(result.ok, target).toBe(false);
      expect(seen, target).toHaveLength(1);
    }
  });
});

describe('fetchWebPage: Sperre beim Verbindungsaufbau', () => {
  it('ein Domainname, der auf 127.0.0.1 zeigt, wird nie verbunden', async () => {
    // Standard-Prüfung: example.test → 127.0.0.1 ist gesperrt, obwohl die Adresse selbst harmlos aussieht.
    const result = await fetchWebPage(page(), signal(), {
      resolve: async () => [{ address: '127.0.0.1', family: 4 }],
    });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('privaten oder lokalen Netz'),
    });
    expect(seen).toHaveLength(0);
  });

  it('eine einzige gesperrte Adresse unter mehreren genügt (kein Auswählen der „guten“)', async () => {
    const result = await fetchWebPage(page(), signal(), {
      resolve: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(seen).toHaveLength(0);
  });

  it('auch gesperrte IPv6- und gemappte Adressen', async () => {
    for (const address of [
      '::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      'fd00::5',
      '169.254.169.254',
    ]) {
      const result = await fetchWebPage(page(), signal(), {
        resolve: async () => [
          { address, family: address.includes(':') ? 6 : 4 },
        ],
      });
      expect(result.ok, address).toBe(false);
    }
    expect(seen).toHaveLength(0);
  });

  it('eine Domain ohne Adresse oder ein Fehler der Namensauflösung ist „nicht erreichbar“', async () => {
    expect(
      await fetchWebPage(page(), signal(), { resolve: async () => [] }),
    ).toEqual({
      ok: false,
      error: 'Die Seite ist nicht erreichbar.',
    });
    expect(
      await fetchWebPage(page(), signal(), {
        resolve: async () => {
          throw new Error('ENOTFOUND');
        },
      }),
    ).toEqual({ ok: false, error: 'Die Seite ist nicht erreichbar.' });
  });
});

describe('fetchWebPage: Fehler und Grenzen', () => {
  it('404, andere Fehlercodes und ein toter Server', async () => {
    handler = (_req, res) => {
      res.writeHead(404);
      res.end('weg');
    };
    expect(await fetchWebPage(page(), signal(), open())).toEqual({
      ok: false,
      error: 'Die Seite gibt es nicht (Fehler 404).',
    });
    handler = (_req, res) => {
      res.writeHead(503);
      res.end();
    };
    expect(await fetchWebPage(page(), signal(), open())).toEqual({
      ok: false,
      error: 'Die Seite antwortet mit Fehler 503.',
    });
    handler = (_req, res) => {
      res.writeHead(403);
      res.end();
    };
    expect((await fetchWebPage(page(), signal(), open())).ok).toBe(false);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    expect(await fetchWebPage(page(), signal(), open())).toEqual({
      ok: false,
      error: 'Die Seite ist nicht erreichbar.',
    });
    // damit das afterEach nicht ein zweites Mal schließt
    server = http.createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
  });

  it('Zeitlimit: antwortet die Seite nicht, bricht es ab', async () => {
    handler = () => {
      /* antwortet nie */
    };
    const started = Date.now();
    expect(
      await fetchWebPage(page(), signal(), open({ timeoutMs: 150 })),
    ).toEqual({
      ok: false,
      error: 'Die Seite antwortet nicht (Zeitlimit).',
    });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('Zeitlimit gilt auch für eine Antwort, die nur tröpfelt', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      const timer = setInterval(() => res.write('x'), 30);
      res.on('close', () => clearInterval(timer));
    };
    const result = await fetchWebPage(
      page(),
      signal(),
      open({ timeoutMs: 200 }),
    );
    expect(result).toEqual({
      ok: false,
      error: 'Die Seite antwortet nicht (Zeitlimit).',
    });
  });

  it('„Stopp“ bricht den Abruf ab (wirft)', async () => {
    handler = () => {
      /* antwortet nie */
    };
    const controller = new AbortController();
    const pending = fetchWebPage(page(), controller.signal, open());
    setTimeout(() => controller.abort(), 50);
    await expect(pending).rejects.toBeDefined();
    await expect(
      fetchWebPage(page(), AbortSignal.abort(), open()),
    ).rejects.toBeDefined();
  });

  it('Größenlimit: nur der Anfang wird gelesen und es wird gesagt', async () => {
    handler = (_req, res) => html(res, 'a'.repeat(5000), 'text/plain');
    const result = await fetchWebPage(
      page(),
      signal(),
      open({ maxBytes: 1000 }),
    );
    expect(result).toMatchObject({ ok: true, value: { truncated: true } });
    expect(result.ok && result.value.text).toHaveLength(1000);
  });

  it('eine „Zip-Bombe“ (klein gepackt, riesig entpackt) bricht nach dem Entpacken ab', async () => {
    const bomb = zlib.gzipSync(Buffer.alloc(20_000_000, 97));
    expect(bomb.length).toBeLessThan(100_000);
    handler = (_req, res) => {
      res.writeHead(200, {
        'content-type': 'text/plain',
        'content-encoding': 'gzip',
      });
      res.end(bomb);
    };
    const result = await fetchWebPage(
      page(),
      signal(),
      open({ maxBytes: 1_000_000 }),
    );
    expect(result).toMatchObject({ ok: true, value: { truncated: true } });
    expect(result.ok && result.value.text).toHaveLength(1_000_000);
  });

  it('PDF, Bilder und Downloads werden abgelehnt, ohne sie zu laden', async () => {
    for (const type of [
      'application/pdf',
      'image/png',
      'application/octet-stream',
      'application/zip',
      'video/mp4',
    ]) {
      handler = (_req, res) => html(res, 'binär', type);
      expect(await fetchWebPage(page(), signal(), open()), type).toEqual({
        ok: false,
        error: expect.stringContaining(`Typ: ${type}`),
      });
    }
  });

  it('ohne Angabe des Typs: Binärdaten werden erkannt, Text geht', async () => {
    handler = (_req, res) => {
      res.writeHead(200);
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]));
    };
    expect((await fetchWebPage(page(), signal(), open())).ok).toBe(false);
    handler = (_req, res) => {
      res.writeHead(200);
      res.end('einfach Text');
    };
    expect(await fetchWebPage(page(), signal(), open())).toMatchObject({
      ok: true,
      value: { text: 'einfach Text', contentType: '' },
    });
  });

  it('Fehlertexte folgen der Sprache', async () => {
    setMessageLanguage('en');
    handler = (_req, res) => {
      res.writeHead(404);
      res.end();
    };
    expect(await fetchWebPage(page(), signal(), open())).toEqual({
      ok: false,
      error: 'The page does not exist (error 404).',
    });
  });
});

describe('fetchWebPage: Komprimierung', () => {
  const serve = (encode: (b: Buffer) => Buffer, encoding: string) => {
    handler = (_req, res) => {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-encoding': encoding,
      });
      res.end(encode(Buffer.from('<p>Übergröße ✓</p>')));
    };
  };

  it('entpackt gzip, deflate und Brotli', async () => {
    for (const [encode, encoding] of [
      [(b: Buffer) => zlib.gzipSync(b), 'gzip'],
      [(b: Buffer) => zlib.deflateSync(b), 'deflate'],
      [(b: Buffer) => zlib.brotliCompressSync(b), 'br'],
    ] as const) {
      serve(encode, encoding);
      expect(
        await fetchWebPage(page(), signal(), open()),
        encoding,
      ).toMatchObject({
        ok: true,
        value: { text: '<p>Übergröße ✓</p>' },
      });
    }
  });

  it('eine unbekannte Kompression ist ein Fehler, keine Datenmüll-Antwort', async () => {
    serve((b) => b, 'compress');
    expect((await fetchWebPage(page(), signal(), open())).ok).toBe(false);
  });

  it('kaputt gepackte Daten sind ein Fehler', async () => {
    serve(() => Buffer.from('das ist kein gzip'), 'gzip');
    expect((await fetchWebPage(page(), signal(), open())).ok).toBe(false);
  });
});

describe('decodeBody', () => {
  const ü = (s: string) => Buffer.from(s, 'latin1');

  it('UTF-8 ist der Standard, ein BOM fällt weg', () => {
    expect(decodeBody(Buffer.from('Grüße ✓'), 'text/html')).toBe('Grüße ✓');
    expect(decodeBody(Buffer.from('\ufeffHallo'), 'text/html')).toBe('Hallo');
  });

  it('Zeichensatz aus dem Kopf, aus <meta> und aus dem XML-Kopf', () => {
    expect(decodeBody(ü('Gr\xfc\xdfe'), 'text/html; charset=iso-8859-1')).toBe(
      'Grüße',
    );
    expect(
      decodeBody(ü('<meta charset="windows-1252">Gr\xfc\xdfe'), 'text/html'),
    ).toBe('<meta charset="windows-1252">Grüße');
    expect(
      decodeBody(
        ü(
          '<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">\xe4',
        ),
        'text/html',
      ),
    ).toContain('ä');
    expect(
      decodeBody(
        ü('<?xml version="1.0" encoding="ISO-8859-1"?><a>\xe4</a>'),
        'text/xml',
      ),
    ).toContain('ä');
  });

  it('der Kopf geht vor <meta>', () => {
    expect(
      decodeBody(
        Buffer.from('<meta charset="iso-8859-1">Grüße'),
        'text/html; charset=utf-8',
      ),
    ).toBe('<meta charset="iso-8859-1">Grüße');
  });

  it('ohne Angabe: ist es kein UTF-8, gilt Windows-1252', () => {
    expect(decodeBody(ü('Gr\xfc\xdfe'), 'text/plain')).toBe('Grüße');
  });

  it('UTF-16 mit BOM, unbekannte Zeichensätze und Binärdaten', () => {
    expect(decodeBody(Buffer.from('\ufeffHi', 'utf16le'), 'text/plain')).toBe(
      'Hi',
    );
    expect(
      decodeBody(Buffer.from('Grüße'), 'text/plain; charset=erfunden-9'),
    ).toBe('Grüße');
    expect(
      decodeBody(Buffer.from([0x50, 0x4b, 0x00, 0x03]), 'text/plain'),
    ).toBeNull();
  });
});

describe('isTextType', () => {
  it('Text, HTML, XHTML, JSON, XML und deren „+“-Formen', () => {
    for (const type of [
      'text/html',
      'text/plain',
      'application/json',
      'application/xhtml+xml',
      'image/svg+xml',
      'application/hal+json',
    ]) {
      expect(isTextType(type), type).toBe(true);
    }
    for (const type of [
      'application/pdf',
      'image/png',
      'application/octet-stream',
      'audio/mpeg',
    ]) {
      expect(isTextType(type), type).toBe(false);
    }
  });
});
