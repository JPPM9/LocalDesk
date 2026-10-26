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
