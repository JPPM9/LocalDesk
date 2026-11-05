import { afterEach, describe, expect, it } from 'vitest';
import { setMessageLanguage } from '../../src/shared/messages';
import {
  parseSearchResponse,
  searchWeb,
  type SearchFetch,
} from '../../src/main/web/search';

afterEach(() => setMessageLanguage('de'));

const KEY = 'abc123.GEHEIMER-SCHLUESSEL';
const answer = (body: unknown, init: ResponseInit = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), init);

/** Ein falscher Suchdienst, der die Anfragen mitschreibt. */
function fakeService(respond: () => Response | Promise<Response>) {
  const sent: {
    url: string;
    method: string;
    redirect: string;
    headers: Record<string, string>;
    body: unknown;
  }[] = [];
  const fetch: SearchFetch = async (url, init) => {
    sent.push({
      url,
      method: init.method,
      redirect: init.redirect,
      headers: init.headers,
      body: JSON.parse(init.body),
    });
    return respond();
  };
  return { sent, fetch };
}
const signal = () => new AbortController().signal;

describe('parseSearchResponse', () => {
  it('nimmt Titel, Adresse und Auszug und macht die Adresse einheitlich', () => {
    expect(
      parseSearchResponse(
        {
          results: [
            {
              title: 'Elektron – Wikipedia',
              url: 'https://de.wikipedia.org/wiki/Elektron#Eigenschaften',
              content: 'Das Elektron ist ein Elementarteilchen.',
            },
            { title: 'Beispiel', url: 'HTTPS://Example.COM', content: 'x' },
          ],
        },
        5,
      ),
    ).toEqual([
      {
        title: 'Elektron – Wikipedia',
        url: 'https://de.wikipedia.org/wiki/Elektron',
        snippet: 'Das Elektron ist ein Elementarteilchen.',
      },
      { title: 'Beispiel', url: 'https://example.com/', snippet: 'x' },
    ]);
  });

  it('macht aus Titel und Auszug eine Zeile und kürzt sie', () => {
    const [hit] = parseSearchResponse(
      {
        results: [
          {
            title: `Zeile 1\n    https://evil.example/\n${'T'.repeat(500)}`,
            url: 'https://a.de/',
            content: `Auszug\n\n    https://evil.example/\r\n${'x'.repeat(2000)}`,
          },
        ],
      },
      5,
    )!;
    expect(hit.title).not.toMatch(/[\r\n]/);
    expect(hit.snippet).not.toMatch(/[\r\n]/);
    expect(hit.title.length).toBeLessThanOrEqual(200);
    expect(hit.snippet.length).toBeLessThanOrEqual(500);
    expect(hit.snippet.endsWith('…')).toBe(true);
  });

  it('lässt Treffer ohne brauchbare Adresse weg, auch Doppelte', () => {
    const hits = parseSearchResponse(
      {
        results: [
          { title: 'a', url: 'ftp://x.de/', content: '' },
          { title: 'b', url: 'javascript:alert(1)', content: '' },
          { title: 'c', url: '', content: '' },
          { title: 'd', content: '' },
          { title: 'e', url: 42 },
          null,
          'text',
          { title: 'f', url: 'https://ok.de/a#x', content: '' },
          { title: 'g', url: 'https://ok.de/a#y', content: '' },
          { title: 'h', url: `https://ok.de/${'a'.repeat(2100)}`, content: '' },
        ],
      },
      5,
    );
    expect(hits).toEqual([{ title: 'f', url: 'https://ok.de/a', snippet: '' }]);
  });

  it('ohne Titel steht die Adresse, und höchstens „limit“ Treffer bleiben', () => {
    const results = Array.from({ length: 9 }, (_, i) => ({
      url: `https://a.de/${i}`,
    }));
    const hits = parseSearchResponse({ results }, 3)!;
    expect(hits).toHaveLength(3);
    expect(hits[0].title).toBe('https://a.de/0');
  });

  it('eine unerwartete Form ist null, eine leere Liste ist leer', () => {
    for (const bad of [
      null,
      'x',
      5,
      [],
      {},
      { results: 'x' },
      { results: {} },
    ]) {
      expect(parseSearchResponse(bad, 5), JSON.stringify(bad)).toBeNull();
    }
    expect(parseSearchResponse({ results: [] }, 5)).toEqual([]);
  });
});

describe('searchWeb', () => {
  it('schickt POST an ollama.com mit Schlüssel im Kopf und der Suche im Text', async () => {
    const service = fakeService(() =>
      answer({ results: [{ title: 'T', url: 'https://a.de/', content: 'c' }] }),
    );
    const result = await searchWeb('Elektron Masse', KEY, signal(), 5, {
      fetch: service.fetch,
    });
    expect(result).toEqual({
      ok: true,
      value: [{ title: 'T', url: 'https://a.de/', snippet: 'c' }],
    });
    expect(service.sent).toHaveLength(1);
    const [request] = service.sent;
    expect(request.url).toBe('https://ollama.com/api/web_search');
    expect(request.method).toBe('POST');
    expect(request.redirect).toBe('error');
    expect(request.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(request.body).toEqual({ query: 'Elektron Masse', max_results: 5 });
  });

  it('der Schlüssel steht nirgends außer im Kopf: weder im Text noch in Fehlern', async () => {
    const cases: [() => Response, RegExp][] = [
      [() => answer('', { status: 401 }), /Schlüssel/],
      [() => answer('', { status: 403 }), /Schlüssel/],
      [() => answer('', { status: 429 }), /Limit/],
      [() => answer('Fehler: ' + KEY, { status: 500 }), /Fehler 500/],
      [() => answer('kein json ' + KEY), /unerwartete Antwort/],
      [() => answer({ nichts: KEY }), /unerwartete Antwort/],
    ];
    for (const [respond, pattern] of cases) {
      const service = fakeService(respond);
      const result = await searchWeb('x', KEY, signal(), 5, {
        fetch: service.fetch,
      });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error).toMatch(pattern);
      expect(result.error).not.toContain(KEY);
      expect(JSON.stringify(service.sent[0].body)).not.toContain(KEY);
    }
  });

  it('401, 429 und 500 haben eigene, verständliche Meldungen', async () => {
    const message = async (status: number) => {
      const service = fakeService(() => answer('', { status }));
      const result = await searchWeb('x', KEY, signal(), 5, {
        fetch: service.fetch,
      });
      return result.ok ? '' : result.error;
    };
    expect(await message(401)).toContain('lehnt den Schlüssel ab');
    expect(await message(429)).toContain('Limit der Ollama-Suche');
    expect(await message(503)).toContain('Fehler 503');
    setMessageLanguage('en');
    expect(await message(401)).toContain('rejects the key');
    expect(await message(429)).toContain('limit of the Ollama search');
  });

  it('keine Verbindung, Weiterleitung oder Zeitlimit: Meldung statt Absturz', async () => {
    const offline = await searchWeb('x', KEY, signal(), 5, {
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    });
    expect(offline).toEqual({
      ok: false,
      error: expect.stringContaining('nicht erreichbar'),
    });

    const slow = await searchWeb('x', KEY, signal(), 5, {
      timeoutMs: 30,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    });
    expect(slow).toEqual({
      ok: false,
      error: expect.stringContaining('Zeitlimit'),
    });
  });

  it('zu große Antworten werden abgelehnt (Kopf und beim Lesen)', async () => {
    const declared = await searchWeb('x', KEY, signal(), 5, {
      maxBytes: 100,
      fetch: async () =>
        answer('{"results":[]}', { headers: { 'content-length': '5000' } }),
    });
    expect(declared).toEqual({
      ok: false,
      error: expect.stringContaining('zu groß'),
    });
    const streamed = await searchWeb('x', KEY, signal(), 5, {
      maxBytes: 100,
      fetch: async () =>
        answer(JSON.stringify({ results: [], x: 'y'.repeat(500) })),
    });
    expect(streamed).toEqual({
      ok: false,
      error: expect.stringContaining('zu groß'),
    });
  });

  it('Stopp wirft, statt eine Meldung zu geben', async () => {
    const controller = new AbortController();
    const pending = searchWeb('x', KEY, controller.signal, 5, {
      fetch: (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    });
    setTimeout(() => controller.abort(), 20);
    await expect(pending).rejects.toThrow();
  });

  it('eine leere Trefferliste ist ein Erfolg ohne Treffer', async () => {
    const service = fakeService(() => answer({ results: [] }));
    expect(
      await searchWeb('nichts', KEY, signal(), 5, { fetch: service.fetch }),
    ).toEqual({ ok: true, value: [] });
  });
});
