import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
  checkFolderName,
  inspectVault,
  sanitizeFileName,
  VaultWriter,
} from '../../src/main/obsidian/vault';

let vault: string;
beforeEach(() => {
  vault = mkdtempSync(path.join(tmpdir(), 'localdesk-vault-'));
});
afterEach(() => rmSync(vault, { recursive: true, force: true }));

describe('AppSettingsRepository', () => {
  it('speichert, liest und löscht Werte', () => {
    const settings = new AppSettingsRepository(openDatabase(':memory:'));
    expect(settings.get('obsidian.vault')).toBeNull();
    settings.set('obsidian.vault', 'C:\\Vault');
    settings.set('obsidian.vault', 'D:\\Vault');
    expect(settings.get('obsidian.vault')).toBe('D:\\Vault');
    settings.delete('obsidian.vault');
    expect(settings.get('obsidian.vault')).toBeNull();
  });
});

describe('checkFolderName', () => {
  it('erlaubt nur einen einfachen Ordnernamen', () => {
    expect(checkFolderName(' LocalDesk ')).toEqual({
      ok: true,
      value: 'LocalDesk',
    });
    for (const bad of [
      '',
      '..',
      '.versteckt',
      'a/b',
      'a\\b',
      'C:',
      'x'.repeat(61),
    ]) {
      expect(checkFolderName(bad).ok).toBe(false);
    }
  });
});

describe('inspectVault', () => {
  it('erkennt einen Obsidian-Vault am Ordner .obsidian', async () => {
    expect(await inspectVault(vault, 'LocalDesk')).toMatchObject({
      ok: true,
      looksLikeVault: false,
    });
    mkdirSync(path.join(vault, '.obsidian'));
    expect(await inspectVault(vault, 'LocalDesk')).toMatchObject({
      ok: true,
      looksLikeVault: true,
    });
  });

  it('lehnt fehlende Ordner, Dateien und ganze Laufwerke ab', async () => {
    expect((await inspectVault(path.join(vault, 'gibtsnicht'), 'L')).ok).toBe(
      false,
    );
    writeFileSync(path.join(vault, 'datei.md'), 'x');
    expect((await inspectVault(path.join(vault, 'datei.md'), 'L')).ok).toBe(
      false,
    );
    expect((await inspectVault('C:\\', 'L')).error).toContain('Laufwerk');
    expect((await inspectVault('relativ', 'L')).ok).toBe(false);
  });
});

describe('sanitizeFileName', () => {
  it('entfernt Zeichen, die Windows oder Obsidian stören', () => {
    expect(sanitizeFileName('Frage: Was ist [[Median]]? #statistik')).toBe(
      'Frage Was ist Median statistik',
    );
    expect(sanitizeFileName('  Ende mit Punkt...  ')).toBe('Ende mit Punkt');
    expect(sanitizeFileName('CON')).toBe('CON_');
    expect(sanitizeFileName('.versteckt')).toBe('versteckt');
    expect(sanitizeFileName('???')).toBe('Notiz');
    expect(sanitizeFileName('x'.repeat(300))).toHaveLength(100);
  });
});

describe('VaultWriter', () => {
  it('schreibt Notizen in den eigenen Unterordner und legt Ordner an', async () => {
    const writer = new VaultWriter(vault, 'LocalDesk');
    const file = await writer.writeNote(
      'Erinnerungen',
      'Ich studiere Statistik',
      'Inhalt äöü',
    );
    expect(file).toBe(
      path.join('LocalDesk', 'Erinnerungen', 'Ich studiere Statistik.md'),
    );
    expect(readFileSync(path.join(vault, file), 'utf8')).toBe('Inhalt äöü');
  });

  it('überschreibt nie, sondern hängt (2), (3) an', async () => {
    const writer = new VaultWriter(vault, 'LocalDesk');
    await writer.writeNote('Chats', 'Gleich', 'eins');
    await writer.writeNote('Chats', 'Gleich', 'zwei');
    const third = await writer.writeNote('Chats', 'Gleich', 'drei');
    expect(path.basename(third)).toBe('Gleich (3).md');
    expect(
      readFileSync(path.join(vault, 'LocalDesk', 'Chats', 'Gleich.md'), 'utf8'),
    ).toBe('eins');
  });

  it('lässt keine Zwischendateien liegen', async () => {
    const writer = new VaultWriter(vault, 'LocalDesk');
    await writer.writeNote('Chats', 'A', 'x');
    expect(readdirSync(path.join(vault, 'LocalDesk', 'Chats'))).toEqual([
      'A.md',
    ]);
  });

  it('weigert sich, außerhalb des Unterordners zu schreiben oder zu löschen', async () => {
    writeFileSync(path.join(vault, 'Meine Notiz.md'), 'privat');
    const writer = new VaultWriter(vault, 'LocalDesk');
    await expect(writer.writeNote('..', 'Böse', 'x')).rejects.toThrow(
      'innerhalb',
    );
    await expect(writer.writeNote('../..', 'Böse', 'x')).rejects.toThrow(
      'innerhalb',
    );
    await expect(writer.deleteNote('../Meine Notiz.md')).rejects.toThrow(
      'innerhalb',
    );
    await expect(writer.updateNote('../Meine Notiz.md', 'weg')).rejects.toThrow(
      'innerhalb',
    );
    await expect(writer.writeNote(vault, 'Absolut', 'x')).rejects.toThrow(
      'innerhalb',
    );
    expect(readFileSync(path.join(vault, 'Meine Notiz.md'), 'utf8')).toBe(
      'privat',
    );
  });

  it('folgt keiner Verknüpfung aus dem Unterordner hinaus', async () => {
    const outside = mkdtempSync(path.join(tmpdir(), 'localdesk-outside-'));
    try {
      symlinkSync(outside, path.join(vault, 'LocalDesk'), 'junction');
    } catch {
      rmSync(outside, { recursive: true, force: true });
      return; // Verknüpfungen nicht erlaubt (Rechte) – nichts zu prüfen
    }
    const writer = new VaultWriter(vault, 'LocalDesk');
    await expect(writer.writeNote('Chats', 'A', 'x')).rejects.toThrow(
      'Verknüpfung',
    );
    expect(existsSync(path.join(outside, 'Chats'))).toBe(false);
    rmSync(outside, { recursive: true, force: true });
  });

  it('löscht und ändert nur eigene Markdown-Notizen', async () => {
    const writer = new VaultWriter(vault, 'LocalDesk');
    const file = await writer.writeNote('Erinnerungen', 'Fakt', 'alt');
    const relative = path.relative(writer.root, path.join(vault, file));
    await writer.updateNote(relative, 'neu');
    expect(readFileSync(path.join(vault, file), 'utf8')).toBe('neu');
    writeFileSync(path.join(writer.root, 'Erinnerungen', 'bild.png'), 'x');
    await expect(
      writer.deleteNote(path.join('Erinnerungen', 'bild.png')),
    ).rejects.toThrow('Markdown');
    await writer.deleteNote(relative);
    expect(existsSync(path.join(vault, file))).toBe(false);
  });

  it('liest die Notizen eines Ordners, fehlender Ordner = leer', async () => {
    const writer = new VaultWriter(vault, 'LocalDesk');
    expect(await writer.readNotes('Erinnerungen')).toEqual([]);
    await writer.writeNote('Erinnerungen', 'B', 'zwei');
    await writer.writeNote('Erinnerungen', 'A', 'eins');
    expect(await writer.readNotes('Erinnerungen')).toEqual([
      { file: path.join('Erinnerungen', 'A.md'), content: 'eins' },
      { file: path.join('Erinnerungen', 'B.md'), content: 'zwei' },
    ]);
  });
});
