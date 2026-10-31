import { describe, expect, it } from 'vitest';
import {
  checkSkillInput,
  skillToolName,
  skillTools,
  formatSkill,
  isSkillId,
  isSkillTextFile,
  parseSkill,
  skillContextAdvice,
  skillIdFromName,
  skillLoadedText,
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

  // Kopf wie bei vielen Skills von GitHub (Aufbau des humanizer-Kopfes, eigener Text).
  const fromGithub = (front: string) =>
    parseSkill(`---\n${front}\n---\n\n# Anleitung\nText`, 'ordner');

  it('liest mehrzeilige Beschreibungen mit „|“ (der Fehler: früher kam nur „|“ an)', () => {
    const skill = fromGithub(
      [
        'name: humanizer',
        'description: |',
        '  Rewrite AI-sounding text so it reads like the writer.',
        '  Use when editing prose: staged openers, forced triads, filler.',
        '',
        '  Based on a public style guide.',
        'license: MIT',
        'metadata:',
        '  version: "3.1.0"',
      ].join('\n'),
    );
    expect(skill.name).toBe('humanizer');
    expect(skill.description).toBe(
      'Rewrite AI-sounding text so it reads like the writer. Use when editing prose: staged openers, forced triads, filler. Based on a public style guide.',
    );
    expect(skill.body).toBe('# Anleitung\nText');
  });

  it('liest „>“, „>-“ und „|-“ sowie Fortsetzungszeilen', () => {
    expect(
      fromGithub(
        'description: >-\n  Erste Zeile\n  zweite Zeile\n\n  Neuer Absatz',
      ).description,
    ).toBe('Erste Zeile zweite Zeile Neuer Absatz');
    expect(
      fromGithub('description: |-\n    Eingerückt\n    stärker').description,
    ).toBe('Eingerückt stärker');
    expect(
      fromGithub('description: Wenn der Nutzer\n  Code zeigt\nname: x')
        .description,
    ).toBe('Wenn der Nutzer Code zeigt');
    expect(
      fromGithub('description: "Wenn: der Nutzer\n  Code zeigt"').description,
    ).toBe('Wenn: der Nutzer Code zeigt');
    expect(
      fromGithub('description:\n  Beschreibung in der nächsten Zeile')
        .description,
    ).toBe('Beschreibung in der nächsten Zeile');
  });

  it('ignoriert Listen, verschachtelte Werte und eingerückte Schlüssel gleichen Namens', () => {
    expect(fromGithub('description:\n  - eins\n  - zwei').description).toBe('');
    expect(
      fromGithub('description:\n  de: Deutsch\n  en: English').description,
    ).toBe('');
    const nested = fromGithub('metadata:\n  description: nur verschachtelt');
    expect(nested.description).toBe('');
    expect(nested.name).toBe('ordner');
  });

  it('kommt mit Windows-Zeilenenden zurecht', () => {
    const skill = parseSkill(
      '---\r\nname: Kurz\r\ndescription: |\r\n  Zeile eins\r\n  Zeile zwei\r\n---\r\nText',
      'x',
    );
    expect(skill).toEqual({
      name: 'Kurz',
      description: 'Zeile eins Zeile zwei',
      body: 'Text',
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
    expect(checkSkillInput({ name: 'a', body: 'x'.repeat(60_001) }).ok).toBe(
      false,
    );
    // Auch große Skills wie der humanizer (≈ 32.000 Zeichen) gehen jetzt.
    expect(checkSkillInput({ name: 'a', body: 'x'.repeat(32_000) }).ok).toBe(
      true,
    );
    expect(
      checkSkillInput({ name: 'a', body: 'x', description: 'd'.repeat(1_025) })
        .ok,
    ).toBe(false);
    expect(
      checkSkillInput({ name: 'a', body: 'x', description: 'd'.repeat(1_024) })
        .ok,
    ).toBe(true);
    expect(checkSkillInput({ id: '../windows', name: 'a', body: 'x' }).ok).toBe(
      false,
    );
    expect(checkSkillInput(null).ok).toBe(false);
  });
});

describe('isSkillTextFile', () => {
  it('erlaubt Textdateien, aber keine Skripte oder Programme', () => {
    for (const ok of ['a.md', 'references/Stil.MD', 'daten.json', 'x.csv']) {
      expect(isSkillTextFile(ok), ok).toBe(true);
    }
    for (const bad of [
      'run.ps1',
      'tool.py',
      'setup.exe',
      'a.bat',
      'x.js',
      'lib.dll',
      'noext',
      '.md',
      'archiv.zip',
      'bild.png',
    ]) {
      expect(isSkillTextFile(bad), bad).toBe(false);
    }
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

describe('skillContextAdvice', () => {
  it('kleine Skills passen in den Standard-Kontext von Ollama', () => {
    expect(skillContextAdvice('x'.repeat(4_000))).toEqual({
      tokens: 1_000,
      fits: true,
      suggested: null,
    });
  });

  it('große Skills brauchen mehr Kontext – mit Vorschlag', () => {
    // 32.000 Zeichen ≈ 8.000 Tokens: weder 4.096 noch 8.192 reichen mit Platz für die Antwort.
    expect(skillContextAdvice('x'.repeat(32_000))).toEqual({
      tokens: 8_000,
      fits: false,
      suggested: 16_384,
    });
    expect(skillContextAdvice('x'.repeat(32_000), 16_384).fits).toBe(true);
    // Auch ein Skill an der alten Grenze (20.000 Zeichen) passte nie in 4.096 Tokens.
    expect(skillContextAdvice('x'.repeat(20_000)).fits).toBe(false);
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

  it('Skills mit Zusatzdateien nehmen „file“ an, die anderen nicht', () => {
    const [plain, withFiles] = skillTools([
      skills[0],
      { ...skills[1], files: [{ path: 'references/stil.md', size: 120 }] },
    ]);
    expect(plain.inputSchema).toEqual({ type: 'object', properties: {} });
    expect(withFiles.inputSchema).toMatchObject({
      type: 'object',
      properties: { file: { type: 'string' } },
    });
    expect(withFiles.description).toContain('Zusatzdateien');
    expect(plain.description).not.toContain('Zusatzdateien');
  });

  it('hängt die Liste der Zusatzdateien an die Anleitung', () => {
    expect(skillLoadedText({ name: 'A', body: 'Text' })).toBe(
      'Skill „A“ – befolge diese Anleitung:\n\nText',
    );
    const text = skillLoadedText({
      name: 'A',
      body: 'Text',
      files: [{ path: 'references/stil.md', size: 120 }],
    });
    expect(text).toContain('Text\n\nZusatzdateien dieses Skills');
    expect(text).toContain('- references/stil.md (120 bytes)');
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
