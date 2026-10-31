import { afterEach, describe, expect, it } from 'vitest';
import { callSkill } from '../../src/main/skills/skill-call';
import { setMessageLanguage } from '../../src/shared/messages';
import type { SkillView } from '../../src/shared/skills';

const skill = (extra: Partial<SkillView> = {}): SkillView => ({
  id: 'humanizer',
  name: 'humanizer',
  description: 'Schreibt Texte um.',
  body: '# Anleitung\nKurz halten.',
  ...extra,
});

const readOk = async (_id: string, file: string) => `Inhalt von ${file}`;
const readFail = async () => {
  throw new Error('Diese Datei gibt es in dem Skill nicht: x.md');
};

afterEach(() => setMessageLanguage('de'));

describe('callSkill', () => {
  it('liefert die Anleitung samt Liste der Zusatzdateien', async () => {
    const result = await callSkill(
      skill({ files: [{ path: 'references/stil.md', size: 120 }] }),
      {},
      readOk,
      4096,
    );
    expect(result.isError).toBe(false);
    expect(result.text).toContain('befolge diese Anleitung');
    expect(result.text).toContain('Kurz halten.');
    expect(result.text).toContain('- references/stil.md (120 bytes)');
  });

  it('liest mit „file“ eine Zusatzdatei', async () => {
    const result = await callSkill(
      skill(),
      { file: ' references/stil.md ' },
      readOk,
      4096,
    );
    expect(result).toEqual({
      text: 'Datei „references/stil.md“ des Skills „humanizer“:\n\nInhalt von references/stil.md',
      isError: false,
    });
  });

  it('meldet Fehler beim Lesen als Fehler an das Modell', async () => {
    expect(await callSkill(skill(), { file: 'x.md' }, readFail, 4096)).toEqual({
      text: 'Diese Datei gibt es in dem Skill nicht: x.md',
      isError: true,
    });
  });

  it('lädt einen zu großen Skill nicht, sondern sagt, was einzustellen ist', async () => {
    // ≈ 8.000 Tokens passen nicht in 4.096.
    const big = skill({ body: 'x'.repeat(32_000) });
    const result = await callSkill(big, {}, readOk, 4096);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('„humanizer“ braucht etwa 8.');
    expect(result.text).toContain('4.096 Tokens Kontext');
    expect(result.text).toContain('mindestens 16.384');
    expect(result.text).not.toContain('xxxx');
    // Mit genug Kontext wird er normal geladen.
    const fine = await callSkill(big, {}, readOk, 16_384);
    expect(fine.isError).toBe(false);
    expect(fine.text).toContain('xxxx');
  });

  it('prüft auch große Zusatzdateien gegen den Kontext', async () => {
    const result = await callSkill(
      skill(),
      { file: 'riesig.md' },
      async () => 'y'.repeat(30_000),
      4096,
    );
    expect(result.isError).toBe(true);
    expect(result.text).toContain('humanizer (riesig.md)');
  });

  it('antwortet auf Englisch, wenn die Sprache Englisch ist', async () => {
    setMessageLanguage('en');
    const result = await callSkill(
      skill({ body: 'x'.repeat(32_000) }),
      {},
      readOk,
      4096,
    );
    expect(result.text).toContain('needs about 8,');
    expect(result.text).toContain('to at least 16,384');
    expect(
      (await callSkill(skill(), { file: 'a.md' }, readOk, 4096)).text,
    ).toContain('File “a.md” of the skill “humanizer”:');
    expect((await callSkill(skill(), {}, readOk, 4096)).text).toContain(
      'follow these instructions',
    );
  });
});
