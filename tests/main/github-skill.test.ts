import { afterEach, describe, expect, it } from 'vitest';
import { setMessageLanguage } from '../../src/shared/messages';
import { checkSkillInput } from '../../src/shared/skills';
import {
  fetchGithubSkill,
  GITHUB_SKILL_MAX_BYTES,
  type SkillFetch,
} from '../../src/main/skills/github-skill';

afterEach(() => setMessageLanguage('de'));

const SKILL = `---
name: Code-Review
description: Prüft Code auf Fehler
---

# Anleitung
1. Lies den Code.
`;

function fakeFetch(respond: (url: string) => Response | Promise<Response>) {
  const urls: string[] = [];
  const inits: unknown[] = [];
  const fetch: SkillFetch = async (url, init) => {
    urls.push(url);
    inits.push(init);
    return respond(url);
  };
  return { fetch, urls, inits };
}

describe('fetchGithubSkill', () => {
  it('lädt die SKILL.md und liest Name, Beschreibung und Anleitung', async () => {
    const f = fakeFetch(() => new Response(SKILL));
    const result = await fetchGithubSkill(
      'https://github.com/o/r/tree/main/review',
      f.fetch,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Code-Review',
        description: 'Prüft Code auf Fehler',
        body: '# Anleitung\n1. Lies den Code.',
        source: 'o/r/review',
      },
    });
    // Nur dieser eine Aufruf, nur zu diesem Host, ohne Weiterleitung.
    expect(f.urls).toEqual([
      'https://raw.githubusercontent.com/o/r/main/review/SKILL.md',
    ]);
    expect(f.inits[0]).toMatchObject({ redirect: 'error' });
  });

  it('der Entwurf lässt sich mit der normalen Prüfung speichern', async () => {
    const f = fakeFetch(() => new Response(SKILL));
    const result = await fetchGithubSkill('https://github.com/o/r', f.fetch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { source: _source, ...draft } = result.value;
    expect(checkSkillInput(draft).ok).toBe(true);
  });

  it('ohne Kopf: der Ordnername wird zum Namen; zu lange Köpfe werden gekürzt', async () => {
    const plain = fakeFetch(() => new Response('Nur Text'));
    const a = await fetchGithubSkill(
      'https://github.com/o/r/tree/main/mein-skill',
      plain.fetch,
    );
    expect(a).toMatchObject({
      ok: true,
      value: { name: 'mein-skill', description: '', body: 'Nur Text' },
    });
    const long = fakeFetch(
      () =>
        new Response(
          `---\nname: ${'N'.repeat(300)}\ndescription: ${'D'.repeat(1_500)}\n---\nText`,
        ),
    );
    const b = await fetchGithubSkill('https://github.com/o/r', long.fetch);
    expect(b.ok && b.value.name.length).toBe(80);
    expect(b.ok && b.value.description.length).toBe(1_024);
  });

  it('ein ungültiger Link geht gar nicht erst ins Netz', async () => {
    const f = fakeFetch(() => new Response('x'));
    const result = await fetchGithubSkill('https://evil.example/o/r', f.fetch);
    expect(result.ok).toBe(false);
    expect(f.urls).toEqual([]);
  });

  it('meldet 404, andere Fehler, Netzfehler und Weiterleitungen verständlich', async () => {
    const notFound = fakeFetch(() => new Response('', { status: 404 }));
    expect(
      await fetchGithubSkill('https://github.com/o/r', notFound.fetch),
    ).toEqual({
      ok: false,
      error: expect.stringContaining('keine SKILL.md'),
    });
    const server = fakeFetch(() => new Response('', { status: 503 }));
    expect(
      await fetchGithubSkill('https://github.com/o/r', server.fetch),
    ).toEqual({ ok: false, error: 'GitHub antwortet mit Fehler 503.' });
    const offline = fakeFetch(() => {
      throw new TypeError('fetch failed');
    });
    expect(
      await fetchGithubSkill('https://github.com/o/r', offline.fetch),
    ).toEqual({
      ok: false,
      error: 'Keine Verbindung zu GitHub – bist du online?',
    });
    const redirected = fakeFetch(() => {
      throw new Error('redirect mode is set to error');
    });
    expect(
      await fetchGithubSkill('https://github.com/o/r', redirected.fetch),
    ).toEqual({ ok: false, error: expect.stringContaining('weitergeleitet') });
  });

  it('lehnt zu große und binäre Dateien ab, ohne alles zu lesen', async () => {
    const big = fakeFetch(
      () =>
        new Response('x'.repeat(GITHUB_SKILL_MAX_BYTES + 1), {
          headers: {},
        }),
    );
    expect(await fetchGithubSkill('https://github.com/o/r', big.fetch)).toEqual(
      { ok: false, error: expect.stringContaining('zu groß') },
    );
    const declared = fakeFetch(
      () =>
        new Response('klein', {
          headers: { 'content-length': String(GITHUB_SKILL_MAX_BYTES + 1) },
        }),
    );
    expect(
      (await fetchGithubSkill('https://github.com/o/r', declared.fetch)).ok,
    ).toBe(false);
    const binary = fakeFetch(
      () => new Response(new Uint8Array([80, 75, 0, 3])),
    );
    expect(
      await fetchGithubSkill('https://github.com/o/r', binary.fetch),
    ).toEqual({ ok: false, error: 'Das ist keine Textdatei.' });
  });

  it('Fehlertexte folgen der Sprache', async () => {
    setMessageLanguage('en');
    const f = fakeFetch(() => new Response('', { status: 404 }));
    expect(await fetchGithubSkill('nonsense', f.fetch)).toEqual({
      ok: false,
      error: expect.stringContaining('not a suitable GitHub link'),
    });
    expect(await fetchGithubSkill('https://github.com/o/r', f.fetch)).toEqual({
      ok: false,
      error: expect.stringContaining('no SKILL.md'),
    });
  });
});
