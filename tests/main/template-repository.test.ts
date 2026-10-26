import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db/database';
import { TemplateRepository } from '../../src/main/db/template-repository';

let clock: number;
let repo: TemplateRepository;

beforeEach(() => {
  clock = 1_000;
  repo = new TemplateRepository(openDatabase(':memory:'), () => clock);
});

describe('TemplateRepository', () => {
  it('legt eine Vorlage an und liest sie wieder', () => {
    const result = repo.saveTemplate({
      id: 't1',
      name: '  Python-Tutor ',
      model: 'qwen3:14b',
      settings: {
        systemPrompt: 'Erkläre Schritt für Schritt.',
        contextLength: 16384,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        id: 't1',
        name: 'Python-Tutor',
        model: 'qwen3:14b',
        settings: {
          systemPrompt: 'Erkläre Schritt für Schritt.',
          contextLength: 16384,
        },
        updatedAt: 1_000,
      },
    });
    expect(repo.listTemplates()).toHaveLength(1);
  });

  it('überschreibt bei gleicher ID statt doppelt anzulegen', () => {
    repo.saveTemplate({ id: 't1', name: 'Alt', settings: {} });
    clock = 2_000;
    repo.saveTemplate({
      id: 't1',
      name: 'Neu',
      model: 'gemma4:12b',
      settings: { temperature: 0 },
    });

    const all = repo.listTemplates();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      name: 'Neu',
      model: 'gemma4:12b',
      updatedAt: 2_000,
    });
    expect(all[0].settings).toEqual({ temperature: 0 });
  });

  it('sortiert alphabetisch nach deutschen Regeln (Ü bei U, Groß/Klein egal)', () => {
    repo.saveTemplate({ id: 'a', name: 'zusammenfassen', settings: {} });
    repo.saveTemplate({ id: 'b', name: 'Coding', settings: {} });
    repo.saveTemplate({ id: 'c', name: 'Übersetzer', settings: {} });
    repo.saveTemplate({ id: 'd', name: 'Tutor', settings: {} });
    expect(repo.listTemplates().map((t) => t.name)).toEqual([
      'Coding',
      'Tutor',
      'Übersetzer',
      'zusammenfassen',
    ]);
  });

  it('lehnt Vorlagen ohne Namen ab', () => {
    expect(repo.saveTemplate({ id: 't1', name: '   ', settings: {} })).toEqual({
      ok: false,
      error: 'Bitte gib der Vorlage einen Namen.',
    });
    expect(repo.saveTemplate(null)).toMatchObject({ ok: false });
    expect(repo.listTemplates()).toHaveLength(0);
  });

  it('prüft die Einstellungen und speichert ohne Modell', () => {
    const result = repo.saveTemplate({
      id: 't1',
      name: 'Kreativ',
      model: '',
      settings: { temperature: 9, unbekannt: true },
    });
    expect(result.ok && result.value.model).toBeUndefined();
    expect(result.ok && result.value.settings).toEqual({ temperature: 2 });
  });

  it('löscht Vorlagen', () => {
    repo.saveTemplate({ id: 't1', name: 'Weg damit', settings: {} });
    repo.deleteTemplate('t1');
    expect(repo.getTemplate('t1')).toBeNull();
  });
});
