import { afterEach, describe, expect, it } from 'vitest';
import { setMessageLanguage } from '../../src/shared/messages';
import {
  GITHUB_API_HOST,
  GITHUB_QUERY_MAX,
  GITHUB_RAW_HOST,
  githubRawUrl,
  githubSearchUrl,
  githubTreeUrl,
  isGithubRepoName,
  parseGithubInput,
} from '../../src/shared/github';

afterEach(() => setMessageLanguage('de'));

const raw = (path: string) => `https://raw.githubusercontent.com/${path}`;

function ok(input: string) {
  const result = parseGithubInput(input);
  if (!result.ok) {
    throw new Error(`Erwartet: gültig – ${input}: ${result.error}`);
  }
  return result.value;
}

describe('parseGithubInput: Links und Projekte', () => {
  it('Projekt: Link, Kurzform und „.git“', () => {
    const expected = {
      kind: 'repo',
      ref: { owner: 'o', repo: 'mein-projekt', ref: 'HEAD' },
      path: '',
    };
    expect(ok('https://github.com/o/mein-projekt')).toEqual(expected);
    expect(ok('o/mein-projekt')).toEqual(expected);
    expect(ok('github.com/o/mein-projekt')).toEqual(expected);
    expect(ok('www.github.com/o/mein-projekt/')).toEqual(expected);
    expect(ok('https://github.com/o/mein-projekt.git')).toEqual(expected);
  });

  it('Ordner (tree): Zweig und Pfad', () => {
    expect(ok('https://github.com/o/r/tree/main/skills/pdf/')).toEqual({
      kind: 'repo',
      ref: { owner: 'o', repo: 'r', ref: 'main' },
      path: 'skills/pdf',
    });
    expect(ok('https://github.com/o/r/tree/v1.2')).toEqual({
      kind: 'repo',
      ref: { owner: 'o', repo: 'r', ref: 'v1.2' },
      path: '',
    });
  });

  it('eine SKILL.md steht für ihren Ordner, auch als Rohlink', () => {
    const folder = {
      kind: 'repo',
      ref: { owner: 'o', repo: 'r', ref: 'main' },
      path: 'x/y',
    };
    expect(ok('https://github.com/o/r/blob/main/x/y/SKILL.md')).toEqual(folder);
    expect(ok(raw('o/r/main/x/y/skill.md'))).toEqual(folder);
    expect(ok('https://github.com/o/r/blob/main/SKILL.md')).toMatchObject({
      kind: 'repo',
      path: '',
    });
  });

  it('jede andere .md-Datei ist ein Skill für sich', () => {
    expect(ok(raw('o/r/main/x/notes.md'))).toEqual({
      kind: 'file',
      ref: { owner: 'o', repo: 'r', ref: 'main' },
      path: 'x/notes.md',
    });
    expect(ok('https://github.com/o/r/blob/dev/a/b.MD')).toMatchObject({
      kind: 'file',
      path: 'a/b.MD',
    });
  });

  it('Anfrage-Teil und Anker spielen keine Rolle, Leerzeichen werden dekodiert', () => {
    expect(
      ok('https://github.com/o/r/blob/main/a/SKILL.md?plain=1#L3'),
    ).toMatchObject({ kind: 'repo', path: 'a' });
    expect(ok('https://github.com/o/r/tree/main/mein%20skill')).toMatchObject({
      path: 'mein skill',
    });
  });

  it('ungültige Links werden abgelehnt – es geht nie an einen fremden Host', () => {
    const bad = [
      'http://github.com/o/r',
      'https://evil.example/o/r/blob/main/SKILL.md',
      'https://github.com.evil.example/o/r',
      'https://user:pw@github.com/o/r',
      'https://github.com:8443/o/r',
      'https://github.com/o',
      'https://github.com/o/r/issues/1',
      'https://github.com/o/r/blob/main/skript.py',
      'https://github.com/o/r/blob/main',
      'https://github.com/o/r/tree/main/../../x',
      'https://github.com/o/r/tree/main/a%2F..%2Fb',
      'https://github.com/../r/blob/main/SKILL.md',
      'https://github.com/o/../blob/main/SKILL.md',
      'https://github.com/o/r/blob/../x/SKILL.md',
      'https://raw.githubusercontent.com/o/r',
      'https://api.github.com/repos/o/r',
    ];
    for (const link of bad) {
      expect(parseGithubInput(link).ok, link).toBe(false);
    }
  });
});

describe('parseGithubInput: Suchbegriff', () => {
  it('alles, was kein Link und keine Kurzform ist, wird gesucht', () => {
    expect(ok('humanizer')).toEqual({ kind: 'search', query: 'humanizer' });
    expect(ok('  schreibstil   prüfen \n')).toEqual({
      kind: 'search',
      query: 'schreibstil prüfen',
    });
  });

  it('Steuerzeichen fallen weg', () => {
    expect(ok('pdf\u0000\u0007 lesen')).toEqual({
      kind: 'search',
      query: 'pdf lesen',
    });
  });

  it('leer, zu kurz oder zu lang geht nicht', () => {
    expect(parseGithubInput('   ')).toEqual({
      ok: false,
      error: 'Gib einen Suchbegriff oder einen GitHub-Link ein.',
    });
    expect(parseGithubInput('a')).toEqual({
      ok: false,
      error: `Der Suchbegriff muss 2 bis ${GITHUB_QUERY_MAX} Zeichen lang sein.`,
    });
    expect(parseGithubInput('x'.repeat(GITHUB_QUERY_MAX + 1)).ok).toBe(false);
    expect(parseGithubInput('x'.repeat(GITHUB_QUERY_MAX)).ok).toBe(true);
  });

  it('Fehlertexte folgen der Sprache', () => {
    setMessageLanguage('en');
    expect(parseGithubInput('https://evil.example/o/r')).toEqual({
      ok: false,
      error: expect.stringContaining('not a suitable GitHub link'),
    });
    expect(parseGithubInput('')).toEqual({
      ok: false,
      error: 'Enter a search term or a GitHub link.',
    });
  });
});

describe('Adressen', () => {
  it('die Suche ergänzt „skill“ und sucht in Name, Beschreibung und Themen', () => {
    const url = new URL(githubSearchUrl('humanizer'));
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe(GITHUB_API_HOST);
    expect(url.pathname).toBe('/search/repositories');
    expect(url.searchParams.get('q')).toBe(
      'humanizer skill in:name,description,topics',
    );
    expect(url.searchParams.get('sort')).toBe('stars');
    expect(url.searchParams.get('per_page')).toBe('15');
  });

  it('ein Suchbegriff kann die Adresse nicht verändern', () => {
    const url = new URL(githubSearchUrl('a&per_page=100#x /../?q=z'));
    expect(url.hostname).toBe(GITHUB_API_HOST);
    expect(url.pathname).toBe('/search/repositories');
    expect(url.searchParams.get('per_page')).toBe('15');
    expect(url.hash).toBe('');
    expect(url.searchParams.get('q')).toContain('a&per_page=100#x');
  });

  it('der Dateibaum und die Dateien liegen auf den vorgesehenen Hosts', () => {
    const ref = { owner: 'o', repo: 'r', ref: 'main' };
    const tree = new URL(githubTreeUrl(ref));
    expect(tree.hostname).toBe(GITHUB_API_HOST);
    expect(tree.pathname).toBe('/repos/o/r/git/trees/main');
    expect(tree.search).toBe('?recursive=1');
    const file = new URL(githubRawUrl(ref, 'mein skill/SKILL.md'));
    expect(file.hostname).toBe(GITHUB_RAW_HOST);
    expect(file.pathname).toBe('/o/r/main/mein%20skill/SKILL.md');
    expect(file.search + file.hash).toBe('');
  });
});

describe('isGithubRepoName', () => {
  it('prüft „besitzer/projekt“', () => {
    expect(isGithubRepoName('blader/humanizer')).toBe(true);
    expect(isGithubRepoName('Humanizr/Humanizer')).toBe(true);
    for (const bad of ['', 'nur', 'a/b/c', 'a/ b', '../x', 'a/b?x=1']) {
      expect(isGithubRepoName(bad), bad).toBe(false);
    }
  });
});
