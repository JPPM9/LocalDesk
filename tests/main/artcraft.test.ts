import { describe, expect, it } from 'vitest';
import {
  artcraftArgs,
  artcraftCandidates,
  findArtcraftCli,
} from '../../src/main/mcp/artcraft';
import { buildCommand } from '../../src/main/mcp/server-kinds';
import { openDatabase } from '../../src/main/db/database';
import { McpRepository } from '../../src/main/db/mcp-repository';
import { isArtcraftApp } from '../../src/shared/artcraft';

const env = {
  ProgramFiles: 'C:\\Program Files',
  LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local',
} as NodeJS.ProcessEnv;

describe('ArtCraft-Apps', () => {
  it('kennt nur die geschlossene Liste', () => {
    expect(isArtcraftApp('pdfcraft')).toBe(true);
    expect(isArtcraftApp('photocraft')).toBe(true);
    expect(isArtcraftApp('evil')).toBe(false);
    expect(isArtcraftApp('__proto__')).toBe(false);
    expect(isArtcraftApp('toString')).toBe(false);
  });

  it('sucht nur an festen Orten und findet die installierte App', () => {
    expect(artcraftCandidates('pdfcraft', env)[0]).toBe(
      'C:\\Program Files\\PdfCraft\\pdfcraft-cli.exe',
    );
    expect(
      findArtcraftCli(
        'photocraft',
        (f) => f === 'C:\\Program Files\\PhotoCraft\\photocraft-cli.exe',
        env,
      ),
    ).toBe('C:\\Program Files\\PhotoCraft\\photocraft-cli.exe');
    expect(findArtcraftCli('pdfcraft', () => false, env)).toBeNull();
  });

  it('Lesen nur in den Ordnern, Schreiben nur mit Erlaubnis', () => {
    expect(artcraftArgs('photocraft', ['D:\\a', 'D:\\b'], false)).toEqual([
      'mcp',
      '--automation-read-root',
      'D:\\a',
      '--automation-read-root',
      'D:\\b',
    ]);
    expect(artcraftArgs('photocraft', ['D:\\a'], true)).toEqual([
      'mcp',
      '--automation-read-root',
      'D:\\a',
      '--automation-write-root',
      'D:\\a',
    ]);
  });

  it('Craft Anything startet nur im eingeschränkten Modus und ohne Ordner-Argumente', () => {
    expect(artcraftArgs('craftanything', ['D:\\a'], true)).toEqual([
      'mcp',
      '--restricted',
    ]);
    expect(artcraftArgs('craftanything', [], false)).not.toContain(
      '--allow-run',
    );
  });

  it('meldet eine fehlende App mit Namen statt zu starten', () => {
    const config = {
      id: 'x',
      name: 'x',
      kind: 'artcraft' as const,
      app: 'pdfcraft' as const,
      folders: ['D:\\a'],
      enabled: true,
    };
    expect(() => buildCommand(config, () => null)).toThrow(/PdfCraft/);
    expect(buildCommand(config, () => 'C:\\x\\pdfcraft-cli.exe')).toEqual({
      command: 'C:\\x\\pdfcraft-cli.exe',
      args: ['mcp', '--compact', '--automation-read-root', 'D:\\a'],
    });
  });
});

describe('Speichern als MCP-Server', () => {
  it('speichert die App und lässt Schreiben standardmäßig aus', () => {
    const repo = new McpRepository(openDatabase(':memory:'));
    const result = repo.saveServer({
      id: 'p',
      name: 'PdfCraft',
      kind: 'artcraft',
      app: 'pdfcraft',
      folders: ['D:\\Dokumente'],
    });
    expect(result).toMatchObject({
      ok: true,
      value: { kind: 'artcraft', app: 'pdfcraft', allowWrite: false },
    });
  });

  it('Craft Anything braucht keinen Ordner, PdfCraft schon', () => {
    const repo = new McpRepository(openDatabase(':memory:'));
    expect(
      repo.saveServer({
        id: 'c',
        name: 'Craft Anything',
        kind: 'artcraft',
        app: 'craftanything',
        folders: [],
      }).ok,
    ).toBe(true);
    expect(
      repo.saveServer({
        id: 'p',
        name: 'PdfCraft',
        kind: 'artcraft',
        app: 'pdfcraft',
        folders: [],
      }).ok,
    ).toBe(false);
  });

  it('lehnt unbekannte Apps und ein ganzes Laufwerk ab', () => {
    const repo = new McpRepository(openDatabase(':memory:'));
    expect(
      repo.saveServer({
        id: 'x',
        name: 'x',
        kind: 'artcraft',
        app: 'evil',
        folders: ['D:\\a'],
      }).ok,
    ).toBe(false);
    expect(
      repo.saveServer({
        id: 'y',
        name: 'y',
        kind: 'artcraft',
        app: 'pdfcraft',
        folders: ['D:\\'],
      }).ok,
    ).toBe(false);
  });
});
