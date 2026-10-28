import { describe, expect, it } from 'vitest';
import {
  checkSkillInput,
  skillToolName,
  skillTools,
  formatSkill,
  isSkillId,
  parseSkill,
  skillIdFromName,
  skillsPrompt,
  withSkills,
} from '../../src/shared/skills';
import { withMemories } from '../../src/shared/memory';
import { normalizeSettings } from '../../src/shared/settings';

describe('parseSkill / formatSkill', () => {
  it('liest den Kopf im Claude-Format', () => {
    const skill = parseSkill(
      '---\nname: Code-Review\ndescription: Prüft Code: Fehler, Sicherheit\n---\n\n# Anleitung\nText',
      'code-review',
    );
    expect(skill).toEqual({
      name: 'Code-Review',
      description: 'Prüft Code: Fehler, Sicherheit',
      body: '# Anleitung\nText',
    });
  });

  it('nimmt ohne Kopf den Ordnernamen', () => {
    expect(parseSkill('Nur Text', 'mein-skill')).toEqual({
      name: 'mein-skill',
      description: '',
      body: 'Nur Text',
    });
  });

  it('übersteht Hin und Zurück, auch mit Anführungszeichen und Doppelpunkten', () => {
    const skill = {
      name: 'Zitat "genau"',
      description: 'Wenn: der Nutzer \\ fragt',
      body: '- Punkt',
    };
    expect(parseSkill(formatSkill(skill), 'x')).toEqual(skill);
  });
});

describe('checkSkillInput', () => {
  it('bereinigt und prüft', () => {
    expect(
      checkSkillInput({
        name: '  Kurz  zusammenfassen ',
        description: 'a\nb',
        body: ' Text ',
      }),
    ).toEqual({
      ok: true,
      value: { name: 'Kurz zusammenfassen', description: 'a b', body: 'Text' },
    });
  });

  it('lehnt Leeres, zu Langes und fremde Kennungen ab', () => {
    expect(checkSkillInput({ name: '', body: 'x' }).ok).toBe(false);
    expect(checkSkillInput({ name: 'a', body: '' }).ok).toBe(false);
    expect(checkSkillInput({ name: 'a'.repeat(81), body: 'x' }).ok).toBe(false);
    expect(checkSkillInput({ name: 'a', body: 'x'.repeat(20_001) }).ok).toBe(
      false,
    );
    expect(checkSkillInput({ id: '../windows', name: 'a', body: 'x' }).ok).toBe(
      false,
    );
    expect(checkSkillInput(null).ok).toBe(false);
  });
});

describe('Kennungen', () => {
  it('macht aus Namen sichere Ordnernamen', () => {
    expect(skillIdFromName('Code-Review (Python)')).toBe('code-review-python');
    expect(skillIdFromName('Lernkarten für Prüfungen')).toBe(
      'lernkarten-fuer-pruefungen',
    );
    expect(skillIdFromName('Café Größe')).toBe('cafe-groesse');
    expect(skillIdFromName('!!!')).toBe('skill');
  });

  it('erkennt nur harmlose Kennungen', () => {
    expect(isSkillId('code-review')).toBe(true);
    expect(isSkillId('..')).toBe(false);
    expect(isSkillId('a/b')).toBe(false);
    expect(isSkillId('C:')).toBe(false);
    expect(isSkillId('-x')).toBe(false);
  });
});

describe('Skills in der System-Nachricht', () => {
  const skill = { name: 'Kurz', body: '# Kurz\nHöchstens 3 Sätze.' };

  it('stellt Skills vor die Anweisungen, Erinnerungen davor', () => {
    const request = withMemories(
      withSkills(
        {
          model: 'm',
          messages: [
            { role: 'system', content: 'Du bist ein Tutor.' },
            { role: 'user', content: 'Hallo' },
          ],
        },
        [skill],
      ),
      ['Ich studiere Statistik.'],
    );
    const system = request.messages[0].content;
    const order = [
      'Ich studiere Statistik.',
      '## Skill: Kurz',
      'Du bist ein Tutor.',
    ].map((part) => system.indexOf(part));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(request.messages).toHaveLength(2);
  });

  it('legt eine System-Nachricht an, wenn es keine gibt – und ändert ohne Skills nichts', () => {
    const plain = {
      model: 'm',
      messages: [{ role: 'user' as const, content: 'Hi' }],
    };
    expect(withSkills(plain, [skill]).messages[0]).toMatchObject({
      role: 'system',
    });
    expect(withSkills(plain, [])).toBe(plain);
    expect(skillsPrompt([])).toBe('');
  });

  it('wird in den Chat-Einstellungen geprüft gespeichert', () => {
    expect(
      normalizeSettings({ skills: ['code-review', 'code-review', '', 7] }),
    ).toEqual({
      skills: ['code-review'],
    });
    expect(normalizeSettings({ skills: [] })).toEqual({});
  });
});

describe('Skills als Werkzeuge', () => {
  const skills = [
    { id: 'code-review', name: 'Code-Review', description: 'Prüft Code.' },
    {
      id: 'lernkarten-erstellen',
      name: 'Lernkarten erstellen',
      description: '',
    },
  ];

  it('macht aus jedem Skill ein Werkzeug ohne Eingaben', () => {
    const tools = skillTools(skills);
    expect(tools.map((t) => t.name)).toEqual([
      'skill_code_review',
      'skill_lernkarten_erstellen',
    ]);
    expect(tools[0]).toMatchObject({ skillId: 'code-review' });
    expect(tools[0].description).toContain('„Code-Review“');
    expect(tools[0].description).toContain('Prüft Code.');
    expect(tools[0].inputSchema).toEqual({ type: 'object', properties: {} });
  });

  it('begrenzt die Zahl, damit die Liste den Kontext nicht sprengt', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `s-${i}`,
      name: `Skill ${i}`,
      description: '',
    }));
    expect(skillTools(many)).toHaveLength(40);
  });

  it('hält Werkzeug-Namen kurz genug', () => {
    expect(skillToolName('a'.repeat(60)).length).toBeLessThanOrEqual(64);
  });
});
