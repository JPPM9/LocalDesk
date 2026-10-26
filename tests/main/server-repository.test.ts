import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db/database';
import { ServerRepository } from '../../src/main/db/server-repository';

let clock: number;
let repo: ServerRepository;

beforeEach(() => {
  clock = 1_000;
  repo = new ServerRepository(openDatabase(':memory:'), () => clock++);
});

describe('ServerRepository', () => {
  it('startet mit „Dieser PC“ als aktivem Server', () => {
    expect(repo.listProfiles()).toEqual([
      {
        id: 'local',
        name: 'Dieser PC',
        baseUrl: 'http://localhost:11434',
        active: true,
      },
    ]);
  });

  it('legt einen LAN-Server an und vervollständigt die Adresse', () => {
    const result = repo.saveProfile({
      id: 'lan',
      name: ' Wohnzimmer ',
      address: '192.168.1.20',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        id: 'lan',
        name: 'Wohnzimmer',
        baseUrl: 'http://192.168.1.20:11434',
        active: false,
      },
    });
    expect(repo.listProfiles().map((p) => p.id)).toEqual(['local', 'lan']);
  });

  it('lehnt fehlenden Namen oder ungültige Adresse ab', () => {
    expect(
      repo.saveProfile({ id: 'x', name: '', address: 'pc' }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      repo.saveProfile({ id: 'x', name: 'X', address: 'ftp://pc' }),
    ).toMatchObject({ ok: false });
    expect(repo.listProfiles()).toHaveLength(1);
  });

  it('schaltet den aktiven Server um und merkt sich das', () => {
    repo.saveProfile({ id: 'lan', name: 'LAN', address: 'pc:11434' });
    repo.setActive('lan');
    expect(repo.getActive().id).toBe('lan');
    expect(repo.listProfiles().filter((p) => p.active)).toHaveLength(1);
    expect(repo.setActive('gibtsnicht')).toMatchObject({ ok: false });
    expect(repo.getActive().id).toBe('lan');
  });

  it('ändert Name und Adresse eines bestehenden Profils', () => {
    repo.saveProfile({ id: 'local', name: 'Mein PC', address: '127.0.0.1' });
    expect(repo.getActive()).toMatchObject({
      name: 'Mein PC',
      baseUrl: 'http://127.0.0.1:11434',
    });
  });

  it('nimmt nach dem Löschen des aktiven Servers den ersten verbleibenden', () => {
    repo.saveProfile({ id: 'lan', name: 'LAN', address: 'pc' });
    repo.setActive('lan');
    expect(repo.deleteProfile('lan')).toEqual({ ok: true, value: undefined });
    expect(repo.getActive().id).toBe('local');
  });

  it('verhindert, dass der letzte Server gelöscht wird', () => {
    expect(repo.deleteProfile('local')).toMatchObject({ ok: false });
    expect(repo.listProfiles()).toHaveLength(1);
  });
});
