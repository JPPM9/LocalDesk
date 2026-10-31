import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db/database';
import { AppSettingsRepository } from '../../src/main/db/app-settings-repository';
import {
  createExampleSkills,
  EXAMPLE_SKILLS,
  EXAMPLE_SKILLS_EN,
} from '../../src/main/skills/skill-examples';
import { setMessageLanguage } from '../../src/shared/messages';
import { SkillStore } from '../../src/main/skills/skill-store';

let root: string;
let outside: string;
let store: SkillStore;

beforeEach(() => {
  const base = mkdtempSync(path.join(tmpdir(), 'localdesk-skills-'));
  root = path.join(base, 'skills');
  outside = path.join(base, 'draussen');
  mkdirSync(outside);
  store = new SkillStore(root);
});
afterEach(() => rmSync(path.dirname(root), { recursive: true, force: true }));

const input = { name: 'Code-Review', description: 'Prüft Code', body: '# Los' };

describe('SkillStore', () => {
  it('legt an, findet wieder und vergibt eindeutige Ordnernamen', async () => {
    const first = await store.save(input);
    const second = await store.save(input);
    expect(first.id).toBe('code-review');
    expect(second.id).toBe('code-review-2');
    expect(
      readFileSync(path.join(root, 'code-review', 'SKILL.md'), 'utf8'),
    ).toContain('name: "Code-Review"');
    expect((await store.list()).map((s) => s.id)).toEqual([
      'code-review',
      'code-review-2',
    ]);
    expect(await store.get('code-review')).toMatchObject(input);
  });

  it('ändert einen Skill, ohne den Ordner umzubenennen', async () => {
    const { id } = await store.save(input);
    const changed = await store.save({ ...input, id, name: 'Code prüfen' });
    expect(changed).toMatchObject({ id: 'code-review', name: 'Code prüfen' });
    await expect(
      store.save({ ...input, id: 'gibt-es-nicht' }),
    ).rejects.toThrow();
  });

  it('liest auch von außen geänderte Dateien und zeigt kaputte mit Fehler', async () => {
    mkdirSync(path.join(root, 'handgemacht'), { recursive: true });
    writeFileSync(
      path.join(root, 'handgemacht', 'SKILL.md'),
      'Ohne Kopf, nur Anleitung.',
    );
    mkdirSync(path.join(root, 'zu-gross'));
    writeFileSync(path.join(root, 'zu-gross', 'SKILL.md'), 'x'.repeat(100_000));
    mkdirSync(path.join(root, 'ohne-datei'));
    const list = await store.list();
    expect(list.find((s) => s.id === 'handgemacht')).toMatchObject({
      name: 'handgemacht',
      body: 'Ohne Kopf, nur Anleitung.',
    });
    expect(list.find((s) => s.id === 'zu-gross')?.error).toBeTruthy();
    expect(list.some((s) => s.id === 'ohne-datei')).toBe(false);
  });

  it('löscht nur die eigene Datei und lässt fremde Dateien stehen', async () => {
    const { id } = await store.save(input);
    await store.remove(id);
    expect(existsSync(path.join(root, id))).toBe(false);

    const other = await store.save(input);
    writeFileSync(path.join(root, other.id, 'skript.py'), 'print(1)');
    await store.remove(other.id);
    expect(existsSync(path.join(root, other.id, 'SKILL.md'))).toBe(false);
    expect(existsSync(path.join(root, other.id, 'skript.py'))).toBe(true);
  });

  it('folgt keinen Verknüpfungen nach draußen und nimmt keine fremden Kennungen', async () => {
    writeFileSync(
      path.join(outside, 'SKILL.md'),
      '---\nname: Fremd\n---\nText',
    );
    mkdirSync(root, { recursive: true });
    symlinkSync(outside, path.join(root, 'fremd'), 'junction');
    expect((await store.list()).some((s) => s.id === 'fremd')).toBe(false);
    expect(await store.get('fremd')).toBeNull();
    expect(await store.get('../draussen')).toBeNull();
    await expect(store.remove('..')).rejects.toThrow();
    expect(existsSync(path.join(outside, 'SKILL.md'))).toBe(true);
  });
});

describe('Beispiel-Skills', () => {
  it('kommen genau einmal – gelöschte nicht wieder', async () => {
    const settings = new AppSettingsRepository(openDatabase(':memory:'));
    expect(await createExampleSkills(store, settings)).toBe(
      EXAMPLE_SKILLS.length,
    );
    const list = await store.list();
    expect(list.map((s) => s.name).sort()).toEqual(
      EXAMPLE_SKILLS.map((s) => s.name).sort(),
    );
    expect(list.every((s) => !s.error && s.description && s.body)).toBe(true);

    await store.remove(list[0].id);
    expect(await createExampleSkills(store, settings)).toBe(0);
    expect(await store.list()).toHaveLength(EXAMPLE_SKILLS.length - 1);
  });
});

describe('Beispiel-Skills auf Englisch', () => {
  afterEach(() => setMessageLanguage('de'));

  it('kommen in der gewählten Sprache (und genauso viele wie auf Deutsch)', async () => {
    setMessageLanguage('en');
    const settings = new AppSettingsRepository(openDatabase(':memory:'));
    expect(await createExampleSkills(store, settings)).toBe(
      EXAMPLE_SKILLS_EN.length,
    );
    expect(EXAMPLE_SKILLS_EN).toHaveLength(EXAMPLE_SKILLS.length);
    const list = await store.list();
    expect(list.map((s) => s.name).sort()).toEqual([
      'Code review',
      'Create flashcards',
      'Reply to an e-mail',
      'Summarize briefly',
    ]);
    expect(list.every((s) => !s.error && s.description && s.body)).toBe(true);
    // Kein deutscher Text in den englischen Anleitungen.
    for (const skill of list) {
      expect(`${skill.description} ${skill.body}`, skill.name).not.toMatch(
        /[äöüß]|(und|nicht|der|die|das|Nutzer)/,
      );
    }
  });
});
