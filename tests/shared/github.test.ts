import { describe, expect, it } from 'vitest';
import { parseGithubSkillUrl } from '../../src/shared/github';

const raw = (path: string) => `https://raw.githubusercontent.com/${path}`;

function ok(link: string) {
  const result = parseGithubSkillUrl(link);
  if (!result.ok)
    throw new Error(`Erwartet: gültig – ${link}: ${result.error}`);
  return result.value;
}

describe('parseGithubSkillUrl', () => {
  it('Link auf eine Datei (blob)', () => {
    expect(
      ok('https://github.com/anthropics/skills/blob/main/pdf/SKILL.md'),
    ).toEqual({
      rawUrl: raw('anthropics/skills/main/pdf/SKILL.md'),
      fallbackName: 'pdf',
      label: 'anthropics/skills/pdf/SKILL.md',
    });
  });

  it('Link auf einen Ordner (tree) → SKILL.md darin', () => {
    expect(ok('https://github.com/o/r/tree/main/mein-skill/').rawUrl).toBe(
      raw('o/r/main/mein-skill/SKILL.md'),
    );
    expect(ok('https://github.com/o/r/tree/v1.2/a/b').fallbackName).toBe('b');
  });

  it('Link auf das ganze Projekt → SKILL.md oben, Name = Projekt', () => {
    expect(ok('https://github.com/o/mein-projekt')).toEqual({
      rawUrl: raw('o/mein-projekt/HEAD/SKILL.md'),
      fallbackName: 'mein-projekt',
      label: 'o/mein-projekt',
    });
    expect(ok('https://github.com/o/r.git').rawUrl).toBe(
      raw('o/r/HEAD/SKILL.md'),
    );
    expect(ok('https://github.com/o/r/tree/dev').rawUrl).toBe(
      raw('o/r/dev/SKILL.md'),
    );
  });

  it('Rohlink und andere .md-Dateien', () => {
    expect(ok(raw('o/r/main/x/notes.md')).rawUrl).toBe(
      raw('o/r/main/x/notes.md'),
    );
    expect(ok(raw('o/r/main/x/notes.md')).fallbackName).toBe('notes');
    expect(
      ok('https://www.github.com/o/r/blob/main/SKILL.md').fallbackName,
    ).toBe('r');
  });

  it('Anfrage-Teil und Anker spielen keine Rolle', () => {
    expect(
      ok('https://github.com/o/r/blob/main/a/SKILL.md?plain=1#L3').rawUrl,
    ).toBe(raw('o/r/main/a/SKILL.md'));
  });

  it('Leerzeichen im Pfad werden kodiert', () => {
    expect(ok('https://github.com/o/r/tree/main/mein%20skill').rawUrl).toBe(
      raw('o/r/main/mein%20skill/SKILL.md'),
    );
  });

  it('alles andere wird abgelehnt – es geht nie an einen fremden Host', () => {
    const bad = [
      '',
      'nonsense',
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
      'javascript:alert(1)',
      'file:///C:/geheim/SKILL.md',
    ];
    for (const link of bad) {
      expect(parseGithubSkillUrl(link).ok, link).toBe(false);
    }
  });

  it('jede erlaubte Adresse zeigt auf raw.githubusercontent.com über https', () => {
    for (const link of [
      'https://github.com/o/r',
      'https://github.com/o/r/tree/main/x',
      'https://github.com/o/r/blob/main/x/SKILL.md',
      raw('o/r/main/SKILL.md'),
    ]) {
      const url = new URL(ok(link).rawUrl);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('raw.githubusercontent.com');
      expect(url.search + url.hash + url.username).toBe('');
    }
  });
});
