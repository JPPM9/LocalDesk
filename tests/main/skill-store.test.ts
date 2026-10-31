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

  it('löscht den ganzen Skill-Ordner mit Zusatzdateien', async () => {
    const { id } = await store.save(input);
    await store.remove(id);
    expect(existsSync(path.join(root, id))).toBe(false);

    const other = await store.save(input);
    mkdirSync(path.join(root, other.id, 'references'));
    writeFileSync(path.join(root, other.id, 'references', 'a.md'), 'Text');
    writeFileSync(path.join(root, other.id, 'skript.py'), 'print(1)');
    await store.remove(other.id);
    expect(existsSync(path.join(root, other.id))).toBe(false);
    expect(existsSync(root)).toBe(true);
  });

  it('löscht nichts, wenn im Skill-Ordner eine Verknüpfung liegt', async () => {
    const { id } = await store.save(input);
    writeFileSync(path.join(outside, 'wichtig.md'), 'Bleibt');
    symlinkSync(outside, path.join(root, id, 'link'), 'junction');
    await expect(store.remove(id)).rejects.toThrow('Verknüpfungen');
    expect(existsSync(path.join(root, id, 'SKILL.md'))).toBe(true);
    expect(existsSync(path.join(outside, 'wichtig.md'))).toBe(true);
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

describe('SkillStore: Zusatzdateien', () => {
  /** Skill mit Zusatzdateien, wie ihn eine ZIP oder ein GitHub-Ordner liefert. */
  async function skillWithFiles() {
    const { id } = await store.save(input);
    const dir = path.join(root, id);
    mkdirSync(path.join(dir, 'references', 'tief'), { recursive: true });
    mkdirSync(path.join(dir, 'scripts'));
    writeFileSync(path.join(dir, 'references', 'stil.md'), '# Stil\nKurz.');
    writeFileSync(path.join(dir, 'references', 'tief', 'liste.txt'), 'a\nb');
    writeFileSync(path.join(dir, 'scripts', 'lauf.ps1'), 'Write-Host x');
    writeFileSync(path.join(dir, 'programm.exe'), 'MZ');
    writeFileSync(path.join(dir, '.versteckt.md'), 'versteckt');
    writeFileSync(path.join(dir, 'binaer.md'), 'a\0b');
    return id;
  }

  it('listet nur echte Textdateien und keine Skripte, Programme oder versteckten Namen', async () => {
    const id = await skillWithFiles();
    const skill = (await store.get(id))!;
    expect(skill.files?.map((f) => f.path)).toEqual([
      'binaer.md',
      'references/stil.md',
      'references/tief/liste.txt',
    ]);
    expect(
      skill.files?.find((f) => f.path === 'references/stil.md')?.size,
    ).toBe(12);
    // Auch die Liste aller Skills enthält sie.
    expect((await store.list())[0].files).toHaveLength(3);
  });

  it('liest eine Zusatzdatei – nur aus der Liste, egal wie der Pfad geschrieben ist', async () => {
    const id = await skillWithFiles();
    expect(await store.readFile(id, 'references/stil.md')).toBe(
      '# Stil\nKurz.',
    );
    expect(await store.readFile(id, 'references\\stil.md')).toBe(
      '# Stil\nKurz.',
    );
    expect(await store.readFile(id, './References/Stil.MD')).toBe(
      '# Stil\nKurz.',
    );
    expect(await store.readFile(id, ' references/tief/liste.txt ')).toBe(
      'a\nb',
    );
  });

  it('lehnt alles andere ab: Pfade nach draußen, SKILL.md, Skripte, Binärdateien', async () => {
    const id = await skillWithFiles();
    writeFileSync(path.join(outside, 'geheim.md'), 'geheim');
    for (const file of [
      '../draussen/geheim.md',
      '..\\..\\draussen\\geheim.md',
      '../../skills/' + id + '/SKILL.md',
      'SKILL.md',
      'scripts/lauf.ps1',
      'programm.exe',
      '.versteckt.md',
      'C:\\Windows\\win.ini',
      'references',
      '',
      'gibt-es-nicht.md',
    ]) {
      await expect(store.readFile(id, file), file).rejects.toThrow(
        /gibt es in dem Skill nicht/,
      );
    }
    await expect(store.readFile(id, 'binaer.md')).rejects.toThrow(
      'keine Textdatei',
    );
    await expect(store.readFile('..', 'a.md')).rejects.toThrow();
    await expect(store.readFile('gibt-es-nicht', 'a.md')).rejects.toThrow();
  });

  it('kürzt sehr lange Dateien und lehnt riesige ab', async () => {
    const id = await skillWithFiles();
    const dir = path.join(root, id);
    writeFileSync(path.join(dir, 'lang.md'), 'x'.repeat(40_000));
    writeFileSync(path.join(dir, 'riesig.md'), 'x'.repeat(300_000));
    const text = await store.readFile(id, 'lang.md');
    expect(text.length).toBeLessThan(31_000);
    expect(text).toContain('Rest der Datei weggelassen');
    await expect(store.readFile(id, 'riesig.md')).rejects.toThrow('zu groß');
  });

  it('folgt Verknüpfungen im Skill-Ordner nicht', async () => {
    const id = await skillWithFiles();
    writeFileSync(path.join(outside, 'fremd.md'), 'fremd');
    symlinkSync(outside, path.join(root, id, 'link'), 'junction');
    const skill = (await store.get(id))!;
    expect(skill.files?.some((f) => f.path.startsWith('link'))).toBe(false);
    await expect(store.readFile(id, 'link/fremd.md')).rejects.toThrow();
  });

  it('zählt höchstens 50 Dateien und geht höchstens 3 Ordner tief', async () => {
    const { id } = await store.save(input);
    const dir = path.join(root, id);
    mkdirSync(path.join(dir, 'a', 'b', 'c', 'd'), { recursive: true });
    writeFileSync(path.join(dir, 'a', 'b', 'c', 'ok.md'), 'x');
    writeFileSync(path.join(dir, 'a', 'b', 'c', 'd', 'zu-tief.md'), 'x');
    for (let i = 0; i < 60; i++) writeFileSync(path.join(dir, `n${i}.md`), 'x');
    const files = (await store.get(id))!.files!;
    expect(files).toHaveLength(50);
    expect(files.some((f) => f.path.includes('zu-tief'))).toBe(false);
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
