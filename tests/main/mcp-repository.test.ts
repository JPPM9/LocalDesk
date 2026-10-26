import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db/database';
import { McpRepository } from '../../src/main/db/mcp-repository';

let repo: McpRepository;

beforeEach(() => {
  repo = new McpRepository(openDatabase(':memory:'), () => 1_000);
});

const input = (overrides: Record<string, unknown> = {}) => ({
  id: 's1',
  name: 'Dateien',
  kind: 'filesystem',
  folders: ['D:\\AI_Workspace\\Notizen'],
  ...overrides,
});

describe('McpRepository', () => {
  it('legt einen Dateisystem-Server an (eingeschaltet)', () => {
    expect(repo.saveServer(input())).toEqual({
      ok: true,
      value: {
        id: 's1',
        name: 'Dateien',
        kind: 'filesystem',
        folders: ['D:\\AI_Workspace\\Notizen'],
        enabled: true,
      },
    });
  });

  it('ändert Name und Ordner, behält aber den Ein/Aus-Zustand', () => {
    repo.saveServer(input());
    repo.setEnabled('s1', false);
    repo.saveServer(
      input({ name: 'Neu', folders: ['D:\\A', 'D:\\B', 'D:\\A'] }),
    );
    expect(repo.getServer('s1')).toMatchObject({
      name: 'Neu',
      folders: ['D:\\A', 'D:\\B'], // doppelte entfernt
      enabled: false,
    });
  });

  it('lehnt fehlende Ordner, relative Pfade und ganze Laufwerke ab', () => {
    for (const folders of [[], ['Notizen'], ['C:\\'], ['D:'], ['C:/']]) {
      expect(
        repo.saveServer(input({ folders })),
        JSON.stringify(folders),
      ).toMatchObject({
        ok: false,
      });
    }
    expect(repo.listServers()).toEqual([]);
  });

  it('lehnt unbekannte Server-Arten ab – es lässt sich kein beliebiger Befehl speichern', () => {
    expect(
      repo.saveServer(input({ kind: 'command', command: 'cmd.exe' })),
    ).toEqual({ ok: false, error: 'Unbekannte Server-Art' });
  });

  it('lehnt fehlenden Namen ab und löscht Server', () => {
    expect(repo.saveServer(input({ name: '  ' }))).toMatchObject({ ok: false });
    repo.saveServer(input());
    repo.deleteServer('s1');
    expect(repo.getServer('s1')).toBeNull();
  });
});

describe('Tool-Freigaben speichern', () => {
  beforeEach(() => {
    repo.saveServer(input());
  });

  it('speichert, ändert und setzt Freigaben zurück', () => {
    expect(repo.listPermissions('s1')).toEqual({});

    repo.setPermission('s1', 'write_file', 'always');
    repo.setPermission('s1', 'read_text_file', 'off');
    repo.setPermission('s1', 'write_file', 'off');
    expect(repo.listPermissions('s1')).toEqual({
      write_file: 'off',
      read_text_file: 'off',
    });

    repo.setPermission('s1', 'write_file', null); // zurück auf Standard
    expect(repo.listPermissions('s1')).toEqual({ read_text_file: 'off' });
  });

  it('lehnt ungültige Werte und unbekannte Server ab', () => {
    expect(repo.setPermission('s1', 'write_file', 'yes' as never)).toBe(false);
    expect(repo.setPermission('fremd', 'write_file', 'always')).toBe(false);
    expect(repo.listPermissions('s1')).toEqual({});
  });

  it('löscht die Freigaben mit dem Server', () => {
    repo.setPermission('s1', 'write_file', 'always');
    repo.deleteServer('s1');
    repo.saveServer(input()); // gleicher Name/ID neu angelegt
    expect(repo.listPermissions('s1')).toEqual({});
  });
});
