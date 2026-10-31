import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkUpload,
  inspectUpload,
  SkillImports,
} from '../../src/main/skills/skill-import';
import { isJunkPath, safeSkillPath } from '../../src/main/skills/skill-paths';
import { SkillStore } from '../../src/main/skills/skill-store';
import { setMessageLanguage } from '../../src/shared/messages';
import type { SkillImportFile } from '../../src/shared/skill-import';

const md = (name: string, description = 'Prüft Code') =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# Anleitung\nSei gründlich.`;

/** Eine ZIP aus Pfad → Text oder Bytes. */
const zip = (entries: Record<string, string | Uint8Array>) =>
  zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([name, value]) => [
        name,
        typeof value === 'string' ? strToU8(value) : value,
      ]),
    ),
  );
const upload = (name: string, data: Uint8Array | string): SkillImportFile => ({
  name,
  data: typeof data === 'string' ? strToU8(data) : data,
});

afterEach(() => setMessageLanguage('de'));

describe('safeSkillPath / isJunkPath', () => {
  it('lässt normale Pfade durch und lehnt gefährliche ab', () => {
    expect(safeSkillPath('references/stil.md')).toBe('references/stil.md');
    expect(safeSkillPath('.\\references\\stil.md')).toBe('references/stil.md');
    expect(safeSkillPath('a//b.md')).toBe('a/b.md');
    for (const bad of [
      '../x.md',
      'a/../../x.md',
      '/etc/x.md',
      'C:\\Windows\\x.md',
      'c:x.md',
      'x.md:evil',
      'a/CON.md',
      'nul',
      'COM1.txt',
      'datei.md.',
      'datei.md ',
      'a<b.md',
      'a|b.md',
      'a?b.md',
      'tab\there.md',
      'x'.repeat(101),
      '',
      '.',
    ]) {
      expect(safeSkillPath(bad), bad).toBeNull();
    }
  });

  it('übergeht Mac-Reste und versteckte Dateien, aber nicht „..“', () => {
    expect(isJunkPath('__MACOSX/a/._x.md')).toBe(true);
    expect(isJunkPath('a/.DS_Store')).toBe(true);
    expect(isJunkPath('.git/config')).toBe(true);
    expect(isJunkPath('a/b.md')).toBe(false);
    expect(isJunkPath('../x.md')).toBe(false);
  });
});

describe('checkUpload', () => {
  it('prüft Form und Größen dessen, was die Oberfläche schickt', () => {
    expect(checkUpload([upload('a.md', 'x')])).toHaveLength(1);
    expect(() => checkUpload('nein')).toThrow('Ungültige Dateien');
    expect(() => checkUpload([])).toThrow('Ungültige Dateien');
    expect(() => checkUpload([{ name: 'a.md' }])).toThrow('Ungültige Dateien');
    expect(() => checkUpload([{ name: '', data: new Uint8Array(1) }])).toThrow(
      'Ungültige Dateien',
    );
    expect(() =>
      checkUpload(Array.from({ length: 11 }, () => upload('a.md', 'x'))),
    ).toThrow('Höchstens 10 Dateien');
    expect(() =>
      checkUpload([upload('gross.zip', new Uint8Array(5_000_001))]),
    ).toThrow('zu groß');
    expect(() =>
      checkUpload(
        Array.from({ length: 5 }, () =>
          upload('a.zip', new Uint8Array(4_900_000)),
        ),
      ),
    ).toThrow('Zusammen zu viele Daten');
  });
});

describe('inspectUpload: einzelne .md', () => {
  it('liest Kopf und Anleitung; ohne Kopf gilt der Dateiname', () => {
    const { skills } = inspectUpload([
      upload('review.md', md('Code-Review', 'Prüft Code: gründlich')),
      upload('Mein Skill.md', 'Nur Text, kein Kopf.'),
    ]);
    expect(skills[0]).toMatchObject({
      source: 'review.md',
      name: 'Code-Review',
      description: 'Prüft Code: gründlich',
      body: '# Anleitung\nSei gründlich.',
      files: [],
    });
    expect(skills[1]).toMatchObject({
      name: 'mein-skill',
      body: 'Nur Text, kein Kopf.',
    });
  });

  it('meldet leere, zu lange und nicht lesbare Dateien als Fehler des Skills', () => {
    const { skills } = inspectUpload([
      upload('leer.md', '---\nname: Leer\n---\n'),
      upload('lang.md', `---\nname: Lang\n---\n${'x'.repeat(60_001)}`),
      upload('bytes.md', new Uint8Array([0xff, 0xfe, 0x00, 0x41])),
    ]);
    expect(skills[0].error).toContain('leer');
    expect(skills[1].error).toContain('60.000');
    expect(skills[2].error).toContain('keine gültige Textdatei');
    expect(skills.every((s) => s.findings.length === 0)).toBe(true);
  });

  it('weist andere Dateitypen mit einem Hinweis ab, liest aber die übrigen', () => {
    const { skills, notices } = inspectUpload([
      upload('notizen.txt', 'x'),
      upload('programm.exe', 'MZ'),
      upload('gut.md', md('Gut')),
    ]);
    expect(skills.map((s) => s.name)).toEqual(['Gut']);
    expect(notices).toHaveLength(2);
    expect(notices[0]).toContain('notizen.txt');
  });

  it('nimmt nur den Dateinamen, nie einen Pfad', () => {
    const { skills } = inspectUpload([
      upload('C:\\Users\\x\\Downloads\\mein-skill.md', md('Pfad')),
    ]);
    expect(skills[0].source).toBe('mein-skill.md');
  });
});

describe('inspectUpload: ZIP', () => {
  it('liest einen Skill mit Zusatzdateien und übergeht Skripte, Programme und Reste', () => {
    const { skills, notices } = inspectUpload([
      upload(
        'humanizer.zip',
        zip({
          'humanizer/SKILL.md': md('Humanizer'),
          'humanizer/references/stil.md': '# Stil',
          'humanizer/references/daten.json': '{"a":1}',
          'humanizer/scripts/lauf.ps1': 'Write-Host x',
          'humanizer/tool.exe': 'MZ',
          'humanizer/bild.png': 'PNG',
          'humanizer/.hidden.md': 'versteckt',
          '__MACOSX/humanizer/._SKILL.md': 'junk',
        }),
      ),
    ]);
    expect(notices).toEqual([]);
    expect(skills).toHaveLength(1);
    const skill = skills[0];
    expect(skill.name).toBe('Humanizer');
    expect(skill.source).toBe('humanizer.zip: humanizer');
    expect(skill.files.map((f) => f.path)).toEqual([
      'references/daten.json',
      'references/stil.md',
    ]);
    expect(skill.skipped.map((s) => [s.path, s.reason.slice(0, 20)])).toEqual(
      expect.arrayContaining([
        ['scripts/lauf.ps1', 'Skript oder Programm'],
        ['tool.exe', 'Skript oder Programm'],
        ['bild.png', 'kein unterstütztes T'],
      ]),
    );
    expect(skill.skipped.some((s) => s.path.includes('hidden'))).toBe(false);
    // Skripte erscheinen als Hinweis der Prüfung.
    expect(skill.findings.some((f) => f.message.includes('lauf.ps1'))).toBe(
      true,
    );
  });

  it('findet mehrere Skills; Dateien gehören zum nächsten Skill-Ordner darüber', () => {
    const { skills, notices } = inspectUpload([
      upload(
        'sammlung.zip',
        zip({
          'a/SKILL.md': md('Alpha'),
          'a/notiz.md': 'gehört zu Alpha',
          'b/SKILL.md': md('Beta'),
          'b/innen/SKILL.md': md('Beta innen'),
          'b/innen/regeln.md': 'gehört zu Beta innen',
          'b/aussen.md': 'gehört zu Beta',
          'lose.md': 'gehört zu keinem Skill',
        }),
      ),
    ]);
    const by = Object.fromEntries(skills.map((s) => [s.name, s]));
    expect(Object.keys(by).sort()).toEqual(['Alpha', 'Beta', 'Beta innen']);
    expect(by.Alpha.files.map((f) => f.path)).toEqual(['notiz.md']);
    expect(by.Beta.files.map((f) => f.path)).toEqual(['aussen.md']);
    expect(by['Beta innen'].files.map((f) => f.path)).toEqual(['regeln.md']);
    expect(notices).toEqual([
      expect.stringContaining(
        '1 Datei(en) in sammlung.zip gehören zu keinem Skill',
      ),
    ]);
  });

  it('versteht eine SKILL.md im Wurzelordner und .skill-Dateien', () => {
    const { skills } = inspectUpload([
      upload(
        'mein-ding.skill',
        zip({ 'SKILL.md': md('Wurzel'), 'references/x.md': 'x' }),
      ),
    ]);
    expect(skills[0]).toMatchObject({
      name: 'Wurzel',
      source: 'mein-ding.skill',
    });
    expect(skills[0].files.map((f) => f.path)).toEqual(['references/x.md']);
  });

  it('nimmt für einen Kopf ohne Namen den Ordnernamen', () => {
    const { skills } = inspectUpload([
      upload('x.zip', zip({ 'lernkarten-erstellen/SKILL.md': 'Nur Text.' })),
    ]);
    expect(skills[0].name).toBe('lernkarten-erstellen');
  });

  it('überspringt unzulässige Pfade, statt sie zu schreiben', () => {
    const { skills } = inspectUpload([
      upload(
        'boese.zip',
        zip({
          'skill/SKILL.md': md('Böse'),
          'skill/../../draussen.md': 'raus',
          'skill/C:/Windows/x.md': 'laufwerk',
          'skill/ads.md:strom': 'strom',
          'skill/CON.md': 'gerät',
          'skill/ok.md': 'ok',
        }),
      ),
    ]);
    expect(skills[0].files.map((f) => f.path)).toEqual(['ok.md']);
    const reasons = skills[0].skipped.map((s) => s.reason);
    // Eintrag unterhalb des Skill-Ordners, der unzulässig ist, wird genannt …
    expect(
      reasons.filter((r) => r === 'unzulässiger Pfad').length,
    ).toBeGreaterThan(0);
    // … und keiner davon taucht bei den Dateien auf.
    expect(
      skills[0].files.some((f) => /draussen|Windows|ads|CON/.test(f.path)),
    ).toBe(false);
  });

  it('meldet eine ZIP ohne SKILL.md und eine kaputte Datei als Hinweis', () => {
    const result = inspectUpload([
      upload('leer.zip', zip({ 'readme.md': 'x' })),
      upload('kaputt.zip', 'das ist keine zip'),
      upload('gut.md', md('Gut')),
    ]);
    expect(result.skills.map((s) => s.name)).toEqual(['Gut']);
    expect(result.notices[0]).toContain('keine SKILL.md');
    expect(result.notices[1]).toContain('kaputt.zip');
    expect(result.notices[1]).toContain('nicht als ZIP');
  });

  it('lehnt eine ZIP mit gefälschter Größenangabe ab', () => {
    const data = zipSync({ 'SKILL.md': [strToU8(md('Fake')), { level: 0 }] });
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    // Größe (unkomprimiert) im Kopf der Datei und im Verzeichnis kleiner schreiben.
    for (let i = 0; i + 30 < data.length; i++) {
      if (view.getUint32(i, true) === 0x04034b50)
        view.setUint32(i + 22, 5, true);
      if (view.getUint32(i, true) === 0x02014b50)
        view.setUint32(i + 24, 5, true);
    }
    const { skills, notices } = inspectUpload([upload('fake.zip', data)]);
    expect(skills).toEqual([]);
    expect(notices[0]).toContain('nicht als ZIP');
  });

  it('bricht bei zu vielen Einträgen oder zu viel entpacktem Inhalt ab, ohne zu entpacken', () => {
    const many = zip(
      Object.fromEntries(
        Array.from({ length: 201 }, (_, i) => [`s/f${i}.md`, 'x']),
      ),
    );
    expect(inspectUpload([upload('viele.zip', many)]).notices[0]).toContain(
      'zu viele Dateien',
    );
    const big = zip({
      's/SKILL.md': md('Gross'),
      ...Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [
          `s/teil${i}.md`,
          'a'.repeat(190_000),
        ]),
      ),
    });
    expect(inspectUpload([upload('gross.zip', big)]).notices[0]).toContain(
      'entpackt zu groß',
    );
  });

  it('überspringt zu große Einzeldateien und begrenzt Zusatzdateien je Skill', () => {
    const { skills } = inspectUpload([
      upload(
        'x.zip',
        zip({
          's/SKILL.md': md('Grenzen'),
          's/riesig.md': 'a'.repeat(200_001),
          's/a/b/c/ok.md': 'x',
          's/a/b/c/d/zu-tief.md': 'x',
          ...Object.fromEntries(
            Array.from({ length: 55 }, (_, i) => [`s/n${i}.md`, 'x']),
          ),
        }),
      ),
    ]);
    const skill = skills[0];
    expect(skill.files).toHaveLength(50);
    const reasons = Object.fromEntries(
      skill.skipped.map((s) => [s.path, s.reason]),
    );
    expect(reasons['riesig.md']).toBe('zu groß');
    expect(reasons['a/b/c/d/zu-tief.md']).toBe('zu tief verschachtelt');
    expect(Object.values(reasons)).toContain('zu viele Zusatzdateien');
  });

  it('überspringt Zusatzdateien, die kein gültiger Text sind', () => {
    const { skills } = inspectUpload([
      upload(
        'x.zip',
        zip({
          's/SKILL.md': md('Text'),
          's/binaer.md': new Uint8Array([0x61, 0x00, 0x62]),
          's/latin1.md': new Uint8Array([0xe4, 0xf6, 0xfc]),
          's/gut.md': 'ä',
        }),
      ),
    ]);
    expect(skills[0].files.map((f) => f.path)).toEqual(['gut.md']);
    expect(skills[0].skipped.map((s) => s.reason)).toEqual([
      'kein gültiger Text (UTF-8)',
      'kein gültiger Text (UTF-8)',
    ]);
  });

  it('meldet auf Englisch, wenn die Sprache Englisch ist', () => {
    setMessageLanguage('en');
    const { notices } = inspectUpload([
      upload('leer.zip', zip({ 'readme.md': 'x' })),
      upload('notes.txt', 'x'),
    ]);
    expect(notices).toEqual([
      'There is no SKILL.md in leer.zip.',
      'File type not supported: notes.txt (allowed are .md, .zip and .skill).',
    ]);
  });
});

describe('SkillImports', () => {
  let root: string;
  let store: SkillStore;
  let time: number;
  let counter: number;
  let imports: SkillImports;

  beforeEach(() => {
    root = path.join(
      mkdtempSync(path.join(tmpdir(), 'localdesk-import-')),
      'skills',
    );
    store = new SkillStore(root);
    time = 1_000_000;
    counter = 0;
    imports = new SkillImports(
      store,
      () => time,
      () => `imp-${++counter}`,
    );
  });
  afterEach(() => rmSync(path.dirname(root), { recursive: true, force: true }));

  const sample = () =>
    upload(
      'paket.zip',
      zip({
        'humanizer/SKILL.md': md('Humanizer'),
        'humanizer/references/stil.md': '# Stil',
        'humanizer/scripts/lauf.ps1': 'Write-Host x',
        'humanizer/leer/SKILL.md': '---\nname: Leer\n---\n',
      }),
    );

  it('zeigt eine Vorschau – ohne Dateiinhalte und ohne etwas zu speichern', async () => {
    const result = await imports.inspect([sample()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.importId).toBe('imp-1');
    const view = result.value.candidates.find((c) => c.name === 'Humanizer')!;
    expect(view).toMatchObject({
      source: 'paket.zip: humanizer',
      description: 'Prüft Code',
      files: [{ path: 'references/stil.md', size: 6 }],
      duplicate: false,
    });
    expect(view.tokens).toBeGreaterThan(0);
    expect(view.bodyPreview).toContain('# Anleitung');
    expect(JSON.stringify(view)).not.toContain('# Stil');
    expect(
      result.value.candidates.find((c) => c.name === 'Leer')?.error,
    ).toBeTruthy();
    // Auch das Anlegen des Skill-Ordners ist kein Speichern: Es steht nichts darin.
    expect(existsSync(root) ? readdirSync(root) : []).toEqual([]);
  });

  it('kürzt lange Anleitungen in der Vorschau', async () => {
    const result = await imports.inspect([
      upload('lang.md', `---\nname: Lang\n---\n${'x'.repeat(10_000)}`),
    ]);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.candidates[0].bodyPreview).toHaveLength(4_000);
    expect(result.value.candidates[0].bodyLength).toBe(10_000);
  });

  it('legt nur die gewählten Skills an – mit Zusatzdateien, ohne Skripte', async () => {
    const preview = await imports.inspect([sample()]);
    if (!preview.ok) throw new Error(preview.error);
    const humanizer = preview.value.candidates.find(
      (c) => c.name === 'Humanizer',
    )!;
    const result = await imports.install(preview.value.importId, [
      humanizer.index,
    ]);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.failed).toEqual([]);
    expect(result.value.installed.map((s) => s.id)).toEqual(['humanizer']);
    expect(result.value.installed[0].files).toEqual([
      { path: 'references/stil.md', size: 6 },
    ]);
    expect(
      readFileSync(path.join(root, 'humanizer', 'SKILL.md'), 'utf8'),
    ).toContain('name: "Humanizer"');
    expect(
      readFileSync(
        path.join(root, 'humanizer', 'references', 'stil.md'),
        'utf8',
      ),
    ).toBe('# Stil');
    expect(existsSync(path.join(root, 'humanizer', 'scripts'))).toBe(false);
    expect(existsSync(path.join(root, 'leer'))).toBe(false);
  });

  it('überschreibt nichts: ein zweites Mal bekommt der Skill eine Nummer', async () => {
    for (let round = 0; round < 2; round++) {
      const preview = await imports.inspect([upload('a.md', md('Doppelt'))]);
      if (!preview.ok) throw new Error(preview.error);
      expect(preview.value.candidates[0].duplicate).toBe(round === 1);
      const result = await imports.install(preview.value.importId, [0]);
      if (!result.ok) throw new Error(result.error);
    }
    expect((await store.list()).map((s) => s.id)).toEqual([
      'doppelt',
      'doppelt-2',
    ]);
  });

  it('erkennt doppelte Namen schon innerhalb einer Ablage', async () => {
    const preview = await imports.inspect([
      upload('a.md', md('Gleich')),
      upload('b.md', md('gleich')),
    ]);
    if (!preview.ok) throw new Error(preview.error);
    expect(preview.value.candidates.map((c) => c.duplicate)).toEqual([
      false,
      true,
    ]);
  });

  it('lehnt falsche Auswahl, Skills mit Fehler und abgelaufene Vorschauen ab', async () => {
    const preview = await imports.inspect([sample()]);
    if (!preview.ok) throw new Error(preview.error);
    const id = preview.value.importId;
    const broken = preview.value.candidates.find((c) => c.error)!.index;
    for (const picks of [[], [99], [-1], [0, 0], ['0'], 'alle', null]) {
      expect(await imports.install(id, picks), JSON.stringify(picks)).toEqual({
        ok: false,
        error: 'Ungültige Auswahl.',
      });
    }
    const withError = await imports.install(id, [broken]);
    if (!withError.ok) throw new Error(withError.error);
    expect(withError.value.installed).toEqual([]);
    expect(withError.value.failed[0]).toContain('Leer');

    // Nach dem Hinzufügen ist die Vorschau verbraucht.
    expect((await imports.install(id, [0])).ok).toBe(false);
    expect(await imports.install('gibt-es-nicht', [0])).toEqual({
      ok: false,
      error: expect.stringContaining('abgelaufen'),
    });
    expect(await imports.install(undefined, [0])).toMatchObject({ ok: false });
  });

  it('lässt Vorschauen nach 15 Minuten verfallen und behält höchstens 5', async () => {
    const first = await imports.inspect([upload('a.md', md('Eins'))]);
    if (!first.ok) throw new Error(first.error);
    time += 15 * 60_000 + 1;
    expect((await imports.install(first.value.importId, [0])).ok).toBe(false);

    const ids: string[] = [];
    for (let i = 0; i < 6; i++) {
      const preview = await imports.inspect([upload('a.md', md(`Skill ${i}`))]);
      if (!preview.ok) throw new Error(preview.error);
      ids.push(preview.value.importId);
    }
    expect((await imports.install(ids[0], [0])).ok).toBe(false);
    expect((await imports.install(ids[5], [0])).ok).toBe(true);
  });

  it('gibt Fehler der Prüfung als Fehler zurück', async () => {
    expect(await imports.inspect('nein')).toEqual({
      ok: false,
      error: 'Ungültige Dateien.',
    });
  });
});

describe('SkillStore.install', () => {
  let root: string;
  let store: SkillStore;
  beforeEach(() => {
    root = path.join(
      mkdtempSync(path.join(tmpdir(), 'localdesk-install-')),
      'skills',
    );
    store = new SkillStore(root);
  });
  afterEach(() => rmSync(path.dirname(root), { recursive: true, force: true }));

  const skill = (files: { path: string; text: string }[]) => ({
    name: 'Prüfer',
    description: 'Prüft',
    body: '# Los',
    files,
  });

  it('legt Ordner, SKILL.md und Zusatzdateien an', async () => {
    const view = await store.install(
      skill([{ path: 'references/tief/a.md', text: 'ä' }]),
    );
    expect(view.id).toBe('pruefer');
    expect(view.files).toEqual([{ path: 'references/tief/a.md', size: 2 }]);
  });

  it('weist Pfade ab, die hinausführen, und räumt den halb angelegten Ordner auf', async () => {
    mkdirSync(root, { recursive: true });
    for (const bad of [
      '../x.md',
      'a/../../x.md',
      'C:\\x.md',
      'skript.ps1',
      'a:b.md',
    ]) {
      await expect(
        store.install(
          skill([
            { path: 'ok.md', text: 'x' },
            { path: bad, text: 'böse' },
          ]),
        ),
        bad,
      ).rejects.toThrow();
      expect(existsSync(path.join(root, 'pruefer'))).toBe(false);
    }
    expect(existsSync(path.join(path.dirname(root), 'x.md'))).toBe(false);
  });
});
