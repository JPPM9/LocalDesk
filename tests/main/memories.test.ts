import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatMemory,
  isMemoryPath,
  MemoryStore,
  parseMemory,
} from '../../src/main/obsidian/memories';
import { VaultWriter } from '../../src/main/obsidian/vault';

let vault: string;
let store: MemoryStore;
const studium = { id: 'p1', name: 'Studium' };

beforeEach(() => {
  vault = mkdtempSync(path.join(tmpdir(), 'localdesk-memory-'));
  store = new MemoryStore(
    new VaultWriter(vault, 'LocalDesk'),
    () => new Date('2026-10-27T10:00:00Z'),
  );
});
afterEach(() => rmSync(vault, { recursive: true, force: true }));

describe('Format', () => {
  it('schreibt Kopf mit Tag, Datum und Projekt – und liest ihn wieder', () => {
    const note = formatMemory(
      'Ich studiere Statistik.',
      new Date('2026-10-27'),
      studium,
    );
    expect(note).toBe(
      '---\ntags: [localdesk/erinnerung]\nerstellt: 2026-10-27\nprojekt: "Studium"\nprojekt-id: p1\n---\n\nIch studiere Statistik.\n',
    );
    expect(parseMemory(note)).toEqual({
      text: 'Ich studiere Statistik.',
      projectId: 'p1',
      created: '2026-10-27',
    });
  });

  it('liest auch Notizen ohne Kopf (z. B. in Obsidian angelegt)', () => {
    expect(parseMemory('  Antworte bitte immer kurz.  ')).toEqual({
      text: 'Antworte bitte immer kurz.',
    });
  });
});

describe('MemoryStore', () => {
  it('legt globale und Projekt-Erinnerungen in eigenen Ordnern an', async () => {
    await store.add('Ich mag Beispiele mit Code.');
    await store.add('Klausur am 12. Februar.', studium);
    expect(
      readFileSync(
        path.join(
          vault,
          'LocalDesk',
          'Erinnerungen',
          'Ich mag Beispiele mit Code.md',
        ),
        'utf8',
      ),
    ).toContain('Ich mag Beispiele mit Code.');
    const list = await store.list([studium]);
    expect(list.map((m) => [m.id, m.text, m.projectName])).toEqual([
      [
        path.join('Erinnerungen', 'Ich mag Beispiele mit Code.md'),
        'Ich mag Beispiele mit Code.',
        undefined,
      ],
      [
        path.join(
          'Projekte',
          'Studium',
          'Erinnerungen',
          'Klausur am 12. Februar.md',
        ),
        'Klausur am 12. Februar.',
        'Studium',
      ],
    ]);
  });

  it('gibt einem Chat die globalen und nur die seines Projekts', async () => {
    await store.add('Global.');
    await store.add('Nur Studium.', studium);
    await store.add('Nur Wohnung.', { id: 'p2', name: 'Wohnung' });
    const texts = async (projectId?: string) =>
      (await store.forChat(projectId, [studium])).map((m) => m.text);
    expect(await texts(undefined)).toEqual(['Global.']);
    expect(await texts('p1')).toEqual(['Global.', 'Nur Studium.']);
  });

  it('findet Projekt-Erinnerungen auch nach Umbenennen des Projekts (über die ID)', async () => {
    await store.add('Fakt.', studium);
    const list = await store.list([{ id: 'p1', name: 'Uni' }]);
    expect(list[0]).toMatchObject({ projectId: 'p1', projectName: 'Uni' });
  });

  it('übernimmt Änderungen aus Obsidian sofort', async () => {
    const created = await store.add('Alt.');
    writeFileSync(
      path.join(vault, 'LocalDesk', created.id),
      '---\ntags: [x]\n---\nNeu aus Obsidian.\n',
    );
    expect((await store.list([]))[0].text).toBe('Neu aus Obsidian.');
  });

  it('kürzt zu lange Fakten und lehnt leere ab', async () => {
    const long = await store.add('x'.repeat(800));
    expect(long.text).toHaveLength(500);
    await expect(store.add('   ')).rejects.toThrow('leer');
  });

  it('löscht nur Notizen in Erinnerungs-Ordnern', async () => {
    const created = await store.add('Weg damit.');
    mkdirSync(path.join(vault, 'LocalDesk', 'Chats'), { recursive: true });
    writeFileSync(path.join(vault, 'LocalDesk', 'Chats', 'Chat.md'), 'x');
    await expect(store.remove(path.join('Chats', 'Chat.md'))).rejects.toThrow(
      'Keine Erinnerung',
    );
    await expect(store.remove('../Meine.md')).rejects.toThrow();
    await store.remove(created.id);
    expect(await store.list([])).toEqual([]);
  });

  it('säubert Projektnamen, damit sie nie zum Pfad werden', async () => {
    const created = await store.add('Fakt.', {
      id: 'p3',
      name: '..\\..\\Ausbruch',
    });
    // Auch ohne Punkt am Anfang – Obsidian würde den Ordner sonst ausblenden.
    expect(created.id).toBe(
      path.join('Projekte', 'Ausbruch', 'Erinnerungen', 'Fakt.md'),
    );
  });
});

describe('isMemoryPath', () => {
  it('erkennt nur Pfade in Erinnerungs-Ordnern', () => {
    expect(isMemoryPath('Erinnerungen\\a.md')).toBe(true);
    expect(isMemoryPath('Projekte/Uni/Erinnerungen/a.md')).toBe(true);
    expect(isMemoryPath('Chats/a.md')).toBe(false);
    expect(isMemoryPath('Erinnerungen/../../a.md')).toBe(false);
    expect(isMemoryPath('Erinnerungen/a.png')).toBe(false);
  });
});

describe('Datum der Erinnerung', () => {
  it('nutzt die Ortszeit, nicht UTC (kurz nach Mitternacht)', () => {
    const justAfterMidnight = new Date(2026, 10, 1, 0, 30);
    expect(formatMemory('x', justAfterMidnight)).toContain(
      'erstellt: 2026-11-01',
    );
  });
});
