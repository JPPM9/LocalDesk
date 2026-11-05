import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ChatChunk,
  ChatRequest,
  ChatStats,
  ChatStreamEvent,
  ModelInfo,
  Result,
  ToolCallRecord,
} from '../../src/shared/api';
import { setMessageLanguage } from '../../src/shared/messages';
import type { WebSearchHit } from '../../src/shared/web';
import type { Provider } from '../../src/main/providers/provider';
import {
  runResearch,
  type ResearchDeps,
  type ResearchRun,
} from '../../src/main/research/pipeline';

afterEach(() => setMessageLanguage('de'));

const QUESTION = 'Wie schwer ist ein Elektron?';
const stats = (ms: number): ChatStats => ({
  outputTokens: 100,
  tokensPerSecond: 50,
  promptTokens: 1000,
  totalMs: ms,
});

type Kind = 'plan' | 'notes' | 'report';
type Reply = string | Error | 'hang';

const kindOf = (request: ChatRequest): Kind => {
  const properties = (
    request.format as { properties?: Record<string, unknown> }
  )?.properties;
  if (properties?.queries) return 'plan';
  if (properties?.relevant) return 'notes';
  return 'report';
};

function fakeProvider(
  respond: (kind: Kind, request: ChatRequest, nth: number) => Reply,
  models: ModelInfo[] | 'fail' = [
    {
      name: 'qwen3:14b',
      sizeBytes: 1,
      modifiedAt: '',
      family: 'qwen3',
      capabilities: ['tools', 'thinking'],
    },
  ],
) {
  const calls: { kind: Kind; request: ChatRequest; signal: AbortSignal }[] = [];
  const counts: Record<Kind, number> = { plan: 0, notes: 0, report: 0 };
  const provider = {
    listModels: async (): Promise<Result<ModelInfo[]>> =>
      models === 'fail'
        ? { ok: false, error: 'weg' }
        : { ok: true, value: models },
    async *chat(
      request: ChatRequest,
      signal: AbortSignal,
    ): AsyncGenerator<ChatChunk> {
      const kind = kindOf(request);
      calls.push({ kind, request: structuredClone(request), signal });
      const reply = respond(kind, request, counts[kind]++);
      if (reply === 'hang') {
        await new Promise<never>((_resolve, reject) =>
          signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        );
      }
      if (reply instanceof Error) throw reply;
      if (kind === 'report') {
        for (const piece of reply.split('|')) {
          yield { type: 'thinking', text: 'Gedanke ' };
          yield { type: 'content', text: piece };
        }
      } else {
        yield { type: 'content', text: reply };
      }
      yield { type: 'done', stats: stats(1000) };
    },
  } as unknown as Provider;
  return { provider, calls };
}

const hitsFor = (n: number, prefix: string): WebSearchHit[] =>
  Array.from({ length: n }, (_, i) => ({
    title: `${prefix} Treffer ${i + 1}`,
    url: `https://${prefix}.example/seite${i + 1}`,
    snippet: 'Auszug',
  }));

const longText = (what: string) =>
  `${what}: ${'Das Elektron ist ein Elementarteilchen mit negativer Ladung. '.repeat(10)}`;

function fakeDeps(
  options: {
    search?: (query: string, nth: number) => Result<WebSearchHit[]>;
    page?: (
      url: string,
    ) => Result<{ url: string; title: string; text: string }>;
  } = {},
) {
  let nth = 0;
  const search = vi.fn(
    async (
      query: string,
      _key?: string,
      _signal?: AbortSignal,
      _count?: number,
    ) =>
      options.search
        ? options.search(query, nth++)
        : ({ ok: true, value: hitsFor(5, `q${nth++}`) } as Result<
            WebSearchHit[]
          >),
  );
  const readPage = vi.fn(async (url: string) =>
    options.page
      ? options.page(url)
      : ({
          ok: true,
          value: { url, title: `Seite ${url}`, text: longText(url) },
        } as Result<{ url: string; title: string; text: string }>),
  );
  return { deps: { search, readPage } as ResearchDeps, search, readPage };
}

const plan = (...queries: string[]) => JSON.stringify({ queries });
const facts = (...list: string[]) =>
  JSON.stringify({ relevant: true, facts: list });

async function run(
  provider: Provider,
  deps: ResearchDeps,
  extra: Partial<ResearchRun> = {},
  signal = new AbortController().signal,
) {
  const events: ChatStreamEvent[] = [];
  await runResearch(
    {
      provider,
      model: 'qwen3:14b',
      contextLength: 8192,
      apiKey: 'DER-SCHLUESSEL',
      depth: 'normal',
      question: QUESTION,
      requestId: 'r1',
      signal,
      emit: (event) => events.push(event),
      ...extra,
    },
    deps,
  );
  return events;
}

/** Der letzte Stand jeder Fortschrittszeile. */
const rowsOf = (events: ChatStreamEvent[]) => {
  const rows = new Map<string, ToolCallRecord>();
  for (const e of events)
    if (e.type === 'tool-call') rows.set(e.call.id, e.call);
  return Object.fromEntries(
    [...rows.values()].map((c) => [c.toolName.replace('research_', ''), c]),
  );
};
const content = (events: ChatStreamEvent[]) =>
  events.flatMap((e) => (e.type === 'content' ? [e.text] : [])).join('');
const types = (events: ChatStreamEvent[]) => events.map((e) => e.type);

describe('runResearch: der Normalfall', () => {
  const respond = (kind: Kind, _request: ChatRequest, nth: number): Reply => {
    if (kind === 'plan')
      return plan('Elektron Masse', 'Elektron Ladung', 'Elektron Spin');
    if (kind === 'notes') return facts(`Fakt A${nth}`, `Fakt B${nth}`);
    return '## Kurzfassung\nEin Elektron wiegt wenig [1]. |Mehr dazu [2][3].';
  };

  it('plant, sucht, liest, notiert und schreibt den Bericht mit Quellenliste', async () => {
    const { provider, calls } = fakeProvider(respond);
    const { deps, search, readPage } = fakeDeps();
    const events = await run(provider, deps);

    // Ablauf: Plan → 3 Suchen → Seiten → Notizen → Bericht
    expect(search.mock.calls.map((c) => c[0])).toEqual([
      'Elektron Masse',
      'Elektron Ladung',
      'Elektron Spin',
    ]);
    expect(
      search.mock.calls.every((c) => c[1] === 'DER-SCHLUESSEL' && c[3] === 5),
    ).toBe(true);
    const kinds = calls.map((c) => c.kind);
    expect(kinds[0]).toBe('plan');
    expect(kinds.at(-1)).toBe('report');
    expect(kinds.filter((k) => k === 'notes')).toHaveLength(10);
    // Reihum: erst der beste Treffer jeder Anfrage
    expect(readPage.mock.calls.slice(0, 3).map((c) => c[0])).toEqual([
      'https://q0.example/seite1',
      'https://q1.example/seite1',
      'https://q2.example/seite1',
    ]);

    // Der Bericht kommt gestreamt, danach hängt LocalDesk die Quellenliste an
    const text = content(events);
    expect(text).toContain(
      '## Kurzfassung\nEin Elektron wiegt wenig [1]. Mehr dazu [2][3].',
    );
    expect(text).toContain('## Quellen');
    expect(text).toContain(
      '1. [Seite https://q0.example/seite1](https://q0.example/seite1) – q0.example',
    );
    expect(text).toContain('bitte die Quellen prüfen');
    expect(text).not.toContain('verweisen auf keine Quelle');
    expect(types(events).at(-1)).toBe('done');
    expect(types(events)).not.toContain('error');
    expect(types(events)).toContain('thinking');
  });

  it('drei Fortschrittszeilen mit Stand und Ergebnis', async () => {
    const { provider } = fakeProvider(respond);
    const { deps } = fakeDeps();
    const rows = rowsOf(await run(provider, deps));
    expect(Object.keys(rows)).toEqual(['plan', 'search', 'read']);
    for (const row of Object.values(rows)) {
      expect(row).toMatchObject({
        serverId: 'research',
        serverName: 'Recherche',
        status: 'done',
        round: 1,
      });
    }
    expect(rows.plan.result).toBe(
      '1. Elektron Masse\n2. Elektron Ladung\n3. Elektron Spin',
    );
    expect(rows.search.arguments).toEqual({ progress: '3/3' });
    expect(rows.search.result).toContain('1. Elektron Masse – 5 Treffer');
    expect(rows.read.arguments).toEqual({ progress: '10/10' });
    expect(rows.read.result!.split('\n')).toHaveLength(10);
    expect(rows.read.result).toContain(
      '✔ Seite https://q0.example/seite1 (q0.example) – 2 Fakten',
    );
  });

  it('die Zeilen melden den Fortschritt schon unterwegs (laufend, mit Stand n/m)', async () => {
    const { provider } = fakeProvider(respond);
    const { deps } = fakeDeps();
    const events = await run(provider, deps);
    const running = events.flatMap((e) =>
      e.type === 'tool-call' && e.call.status === 'running'
        ? [
            `${e.call.toolName}:${(e.call.arguments as { progress?: string }).progress ?? ''}`,
          ]
        : [],
    );
    expect(running).toContain('research_plan:');
    expect(running).toContain('research_search:1/3');
    expect(running).toContain('research_search:3/3');
    expect(running).toContain('research_read:1/10');
    expect(running).toContain('research_read:10/10');
  });

  it('Plan und Notizen laufen kurz (ohne Denken, Temperatur 0, festes Format), der Bericht mit deinen Einstellungen – alles im selben Kontext', async () => {
    const { provider, calls } = fakeProvider(respond);
    const { deps } = fakeDeps();
    await run(provider, deps, {
      think: true,
      temperature: 0.7,
      seed: 42,
      contextLength: 16384,
    });
    const cheap = calls.filter((c) => c.kind !== 'report');
    expect(cheap.length).toBeGreaterThan(2);
    for (const { request } of cheap) {
      expect(request.think).toBe(false);
      expect(request.format).toBeDefined();
      expect(request.options).toEqual({ contextLength: 16384, temperature: 0 });
    }
    const report = calls.at(-1)!.request;
    expect(report.format).toBeUndefined();
    expect(report.think).toBe(true);
    expect(report.options).toEqual({
      contextLength: 16384,
      temperature: 0.7,
      seed: 42,
    });
    expect(report.messages[1].content).toContain('<<<NOTIZEN');
    expect(report.messages[1].content).toContain(
      '[1] Seite https://q0.example/seite1',
    );
  });

  it('gpt-oss kann nicht „aus“ denken: dort läuft es mit „low“; ohne Modell-Info wird nichts gesetzt', async () => {
    const gptoss = fakeProvider(respond, [
      {
        name: 'qwen3:14b',
        sizeBytes: 1,
        modifiedAt: '',
        family: 'gptoss',
        capabilities: ['thinking'],
      },
    ]);
    await run(gptoss.provider, fakeDeps().deps, { depth: 'quick' });
    expect(gptoss.calls[0].request.think).toBe('low');

    const unknown = fakeProvider(respond, 'fail');
    await run(unknown.provider, fakeDeps().deps, { depth: 'quick' });
    expect(unknown.calls[0].request).not.toHaveProperty('think');
  });

  it('Stufen: „schnell“ = höchstens 2 Suchen und 5 Seiten, „gründlich“ = 6 und 16', async () => {
    const six = plan('a', 'b', 'c', 'd', 'e', 'f', 'g');
    const respondMany = (kind: Kind, r: ChatRequest, nth: number): Reply =>
      kind === 'plan' ? six : respond(kind, r, nth);
    const quick = fakeDeps();
    await run(fakeProvider(respondMany).provider, quick.deps, {
      depth: 'quick',
    });
    expect(quick.search).toHaveBeenCalledTimes(2);
    expect(quick.readPage).toHaveBeenCalledTimes(5);

    const deep = fakeDeps();
    await run(fakeProvider(respondMany).provider, deep.deps, {
      depth: 'deep',
      contextLength: 16384,
    });
    expect(deep.search).toHaveBeenCalledTimes(6);
    expect(deep.readPage).toHaveBeenCalledTimes(16);
  });

  it('die Kennzahlen aller Aufrufe werden zusammengezählt', async () => {
    const { provider } = fakeProvider(respond);
    const events = await run(provider, fakeDeps().deps, { depth: 'quick' });
    const done = events.find((e) => e.type === 'done');
    expect(done).toMatchObject({
      stats: { outputTokens: expect.any(Number), totalMs: expect.any(Number) },
    });
    // 1 Plan + 5 Notizen + 1 Bericht
    expect((done as { stats: ChatStats }).stats.outputTokens).toBe(700);
    expect((done as { stats: ChatStats }).stats.totalMs).toBe(7000);
  });

  it('Zitate des Berichts, die es nicht gibt, werden benannt', async () => {
    const { provider } = fakeProvider((kind, r, n) =>
      kind === 'report'
        ? 'Behauptung [1] und Erfindung [42].'
        : respond(kind, r, n),
    );
    const text = content(
      await run(provider, fakeDeps().deps, { depth: 'quick' }),
    );
    expect(text).toContain(
      'Die Zitate [42] im Bericht verweisen auf keine Quelle',
    );
  });
});

describe('runResearch: wenn etwas schiefgeht', () => {
  const respond = (kind: Kind, _r: ChatRequest, nth: number): Reply =>
    kind === 'plan'
      ? plan('eins', 'zwei', 'drei')
      : kind === 'notes'
        ? facts(`Fakt ${nth}`)
        : 'Bericht [1].';

  it('ein unlesbarer Plan: Die Frage selbst wird gesucht', async () => {
    const { provider } = fakeProvider((kind, r, n) =>
      kind === 'plan' ? 'Unsinn' : respond(kind, r, n),
    );
    const { deps, search } = fakeDeps();
    const rows = rowsOf(await run(provider, deps));
    expect(search.mock.calls.map((c) => c[0])).toEqual([QUESTION]);
    expect(rows.plan.result).toBe(`1. ${QUESTION}`);
  });

  it('Zeitlimit beim Plan: ebenfalls die Frage; Zeitlimit bei einer Seite: nur diese Seite fällt weg', async () => {
    const { provider } = fakeProvider((kind, r, n) =>
      kind === 'plan'
        ? 'hang'
        : kind === 'notes' && n === 0
          ? 'hang'
          : respond(kind, r, n),
    );
    const { deps, readPage } = fakeDeps();
    const events = await run(provider, deps, {
      timeouts: { plan: 20, notes: 20 },
    });
    const rows = rowsOf(events);
    expect(rows.plan.result).toBe(`1. ${QUESTION}`);
    expect(rows.read.result!.split('\n')[0]).toMatch(
      /^✘ .* – Zeitlimit beim Notieren$/,
    );
    expect(readPage).toHaveBeenCalledTimes(5);
    expect(types(events).at(-1)).toBe('done');
    expect(content(events)).toContain('## Quellen');
  });

  it('Limit beim zweiten Suchen: weiter mit den Treffern, die da sind – Zeile zeigt den Fehler', async () => {
    const { provider } = fakeProvider(respond);
    const { deps, search } = fakeDeps({
      search: (_q, nth) =>
        nth === 0
          ? { ok: true, value: hitsFor(5, 'a') }
          : { ok: false, error: 'Das Limit der Ollama-Suche ist erreicht.' },
    });
    const events = await run(provider, deps);
    const rows = rowsOf(events);
    expect(search).toHaveBeenCalledTimes(2); // beim ersten Fehler wird nicht weitergesucht
    expect(rows.search.status).toBe('error');
    expect(rows.search.result).toContain(
      '2. zwei – Das Limit der Ollama-Suche ist erreicht.',
    );
    expect(rows.read.status).toBe('done');
    expect(types(events).at(-1)).toBe('done');
  });

  it('gleich die erste Suche scheitert (z. B. falscher Schlüssel): Fehlermeldung, nichts wird gelesen', async () => {
    const { provider, calls } = fakeProvider(respond);
    const { deps, readPage } = fakeDeps({
      search: () => ({ ok: false, error: 'Ollama lehnt den Schlüssel ab.' }),
    });
    const events = await run(provider, deps);
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error: 'Ollama lehnt den Schlüssel ab.',
    });
    expect(readPage).not.toHaveBeenCalled();
    expect(calls.map((c) => c.kind)).toEqual(['plan']);
    expect(rowsOf(events).search.status).toBe('error');
  });

  it('die Suche findet nur PDFs oder gar nichts: „Die Suche hat nichts gefunden“', async () => {
    const { provider } = fakeProvider(respond);
    for (const value of [
      [],
      [{ title: 'x', url: 'https://a.de/b.pdf', snippet: '' }],
    ]) {
      const { deps } = fakeDeps({ search: () => ({ ok: true, value }) });
      const events = await run(provider, deps);
      expect(events.at(-1)).toMatchObject({
        type: 'error',
        error: 'Die Suche hat nichts gefunden.',
      });
    }
  });

  it('Seiten, die nicht gehen, fallen einzeln weg; nur brauchbare werden Quellen', async () => {
    // „schnell“: 2 Suchen, Reihenfolge der Seiten: q0/1, q1/1, q0/2, q1/2, q0/3
    const { provider, calls } = fakeProvider((kind, r, n) => {
      if (kind !== 'notes') return respond(kind, r, n);
      return [
        facts('Gut 1'),
        'kein json',
        JSON.stringify({ relevant: false, facts: ['x'] }),
      ][n];
    });
    const page = (url: string, title: string, text: string) => ({
      ok: true as const,
      value: { url, title, text },
    });
    const pages = new Map<
      string,
      Result<{ url: string; title: string; text: string }>
    >([
      [
        'https://q0.example/seite1',
        page('https://q0.example/seite1', 'Gute Seite', longText('a')),
      ],
      [
        'https://q1.example/seite1',
        { ok: false, error: 'Die Seite gibt es nicht (Fehler 404).' },
      ],
      [
        'https://q0.example/seite2',
        page('https://q0.example/seite2', 'Dünn', 'zu kurz'),
      ],
      [
        'https://q1.example/seite2',
        page('https://q1.example/seite2', 'Kaputt', longText('b')),
      ],
      [
        'https://q0.example/seite3',
        page('https://q0.example/seite3', 'Egal', longText('c')),
      ],
    ]);
    const { deps } = fakeDeps({
      page: (url) => pages.get(url) ?? { ok: false, error: 'weg' },
    });
    const events = await run(provider, deps, { depth: 'quick' as const });
    expect(rowsOf(events).read.result!.split('\n')).toEqual([
      '✔ Gute Seite (q0.example) – 1 Fakten',
      '✘ q1 Treffer 1 (q1.example) – Die Seite gibt es nicht (Fehler 404).',
      '✘ Dünn (q0.example) – zu wenig Text',
      '✘ Kaputt (q1.example) – Notizen nicht lesbar',
      '– Egal (q0.example) – nicht relevant',
    ]);
    // Zu dünne Seiten und Fehler kosten keinen Notiz-Aufruf
    expect(calls.filter((c) => c.kind === 'notes')).toHaveLength(3);
    const report = calls.at(-1)!.request.messages[1].content;
    expect(report).toContain('[1] Gute Seite (q0.example)\n- Gut 1');
    expect(report).not.toContain('[2]');
    expect(content(events)).toContain(
      '1. [Gute Seite](https://q0.example/seite1)',
    );
  });

  it('keine Seite hat etwas Brauchbares: Meldung statt Bericht, kein Berichts-Aufruf', async () => {
    const { provider, calls } = fakeProvider((kind, r, n) =>
      kind === 'notes'
        ? JSON.stringify({ relevant: false, facts: [] })
        : respond(kind, r, n),
    );
    const events = await run(provider, fakeDeps().deps, { depth: 'quick' });
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error:
        'Auf den gelesenen Seiten stand nichts Brauchbares zu dieser Frage.',
    });
    expect(rowsOf(events).read.status).toBe('error');
    expect(calls.some((c) => c.kind === 'report')).toBe(false);
    expect(content(events)).toBe('');
  });

  it('zwei Treffer, die zur selben Seite führen, zählen einmal', async () => {
    const { provider, calls } = fakeProvider(respond);
    const { deps } = fakeDeps({
      page: (url) => ({
        ok: true,
        value: {
          url: 'https://gleich.example/seite',
          title: 'Gleich',
          text: longText(url),
        },
      }),
    });
    const events = await run(provider, deps, { depth: 'quick' });
    expect(calls.filter((c) => c.kind === 'notes')).toHaveLength(1);
    expect(rowsOf(events).read.result!.split('\n')).toHaveLength(1);
  });

  it('in der Quellenliste steht die Adresse aus der Suche, nicht die nach Weiterleitungen', async () => {
    const { provider } = fakeProvider(respond);
    const { deps } = fakeDeps({
      page: (url) => ({
        ok: true,
        value: {
          url: `${url}?error=cookies_not_supported&code=abc`,
          title: 'Weitergeleitet',
          text: longText(url),
        },
      }),
    });
    const text = content(await run(provider, deps, { depth: 'quick' }));
    expect(text).toContain('1. [Weitergeleitet](https://q0.example/seite1)');
    expect(text).not.toContain('cookies_not_supported');
  });

  it('der Bericht bleibt leer: Hinweis statt leerer Blase', async () => {
    const { provider } = fakeProvider((kind, r, n) =>
      kind === 'report' ? '  ' : respond(kind, r, n),
    );
    const events = await run(provider, fakeDeps().deps, { depth: 'quick' });
    expect(events.at(-1)).toMatchObject({ type: 'error' });
    expect(types(events)).not.toContain('done');
  });

  it('Fehler des Servers (nicht Zeitlimit) brechen ab und werden weitergegeben', async () => {
    const { provider } = fakeProvider((kind, r, n) =>
      kind === 'notes' && n === 1
        ? new Error('Ollama ist nicht erreichbar')
        : respond(kind, r, n),
    );
    await expect(
      run(provider, fakeDeps().deps, { depth: 'quick' }),
    ).rejects.toThrow('Ollama ist nicht erreichbar');
  });
});

describe('runResearch: Stopp', () => {
  it('Abbruch mitten in den Seiten: nichts läuft weiter (keine Notizen, kein Bericht, keine Suchen)', async () => {
    const controller = new AbortController();
    const { provider, calls } = fakeProvider((kind, r, n) =>
      kind === 'plan'
        ? plan('a', 'b')
        : kind === 'notes'
          ? facts(`F${n}`)
          : 'Bericht [1]',
    );
    const { deps, readPage, search } = fakeDeps({
      page: (url) => {
        if (url.endsWith('seite2')) controller.abort();
        return { ok: true, value: { url, title: 'S', text: longText(url) } };
      },
    });
    await expect(run(provider, deps, {}, controller.signal)).rejects.toThrow();
    const before = {
      search: search.mock.calls.length,
      read: readPage.mock.calls.length,
      ai: calls.length,
    };
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(search.mock.calls.length).toBe(before.search);
    expect(readPage.mock.calls.length).toBe(before.read);
    expect(calls.length).toBe(before.ai);
    expect(calls.some((c) => c.kind === 'report')).toBe(false);
  });

  it('Stopp während eines Modell-Aufrufs bricht ihn ab', async () => {
    const controller = new AbortController();
    const { provider } = fakeProvider((kind) =>
      kind === 'plan' ? 'hang' : 'x',
    );
    const pending = run(provider, fakeDeps().deps, {}, controller.signal);
    setTimeout(() => controller.abort(), 30);
    await expect(pending).rejects.toThrow();
  });

  it('schon vor dem Start gestoppt: es geschieht nichts', async () => {
    const controller = new AbortController();
    controller.abort();
    const { provider, calls } = fakeProvider(() => plan('a'));
    const { deps, search } = fakeDeps();
    await expect(run(provider, deps, {}, controller.signal)).rejects.toThrow();
    expect(search).not.toHaveBeenCalled();
    expect(calls.length).toBeLessThanOrEqual(1);
  });
});

describe('runResearch: Englisch', () => {
  it('Zeilen und Fußnote folgen der Sprache der App', async () => {
    setMessageLanguage('en');
    const { provider } = fakeProvider((kind, _r, n) =>
      kind === 'plan'
        ? plan('a')
        : kind === 'notes'
          ? facts(`F${n}`)
          : 'Report [1].',
    );
    const events = await run(provider, fakeDeps().deps, { depth: 'quick' });
    const rows = rowsOf(events);
    expect(rows.search.result).toBe('1. a – 5 hits');
    expect(rows.read.result).toContain('– 1 facts');
    expect(rows.plan.serverName).toBe('Research');
    expect(content(events)).toContain('## Sources');
  });
});
