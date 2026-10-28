import { describe, expect, it } from 'vitest';
import {
  checkSkillInput,
  formatSkill,
  isSkillId,
  parseSkill,
  skillIdFromName,
} from '../../src/shared/skills';

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
