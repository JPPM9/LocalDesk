import { describe, expect, it } from 'vitest';
import {
  CODEGRAPH_ENV,
  codegraphArgs,
  codegraphCandidates,
  findCodegraphCli,
  hasCodegraphIndex,
  sameFolder,
} from '../../src/main/mcp/codegraph';
import { buildCommand } from '../../src/main/mcp/server-kinds';
import { openDatabase } from '../../src/main/db/database';
import { McpRepository } from '../../src/main/db/mcp-repository';

const env = {
  LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local',
  PATH: 'C:\\Tools;C:\\Other',
} as NodeJS.ProcessEnv;

describe('CodeGraph', () => {
  it('sucht erst am Installationsort, dann auf dem PATH', () => {
    const list = codegraphCandidates(env);
    expect(list[0]).toBe(
      'C:\\Users\\u\\AppData\\Local\\codegraph\\current\\bin\\codegraph.cmd',
    );
    expect(list).toContain('C:\\Tools\\codegraph.cmd');
    expect(findCodegraphCli(() => false, env)).toBeNull();
    expect(findCodegraphCli((f) => f === 'C:\\Other\\codegraph.exe', env)).toBe(
      'C:\\Other\\codegraph.exe',
    );
  });

  it('startet für genau einen Ordner und schaltet die Statistik ab', () => {
    expect(codegraphArgs('D:\\Projekt')).toEqual([
      'serve',
      '--mcp',
      '--path',
      'D:\\Projekt',
    ]);
    expect(CODEGRAPH_ENV).toEqual({
      CODEGRAPH_TELEMETRY: '0',
      DO_NOT_TRACK: '1',
    });
    const config = {
      id: 'c',
      name: 'c',
      kind: 'codegraph' as const,
      folders: ['D:\\Projekt'],
      enabled: true,
    };
    const built = buildCommand(
      config,
      undefined,
      () => 'C:\\cg\\codegraph.cmd',
    );
    expect(built.command).toBe('C:\\cg\\codegraph.cmd');
    expect(built.env).toEqual(CODEGRAPH_ENV);
    expect(() => buildCommand(config, undefined, () => null)).toThrow(
      /CodeGraph/,
    );
  });

  it('erkennt den Index und gleiche Ordner (Groß-/Kleinschreibung, Schrägstriche)', () => {
    expect(hasCodegraphIndex('D:\\p', (f) => f === 'D:\\p\\.codegraph')).toBe(
      true,
    );
    expect(hasCodegraphIndex('D:\\p', () => false)).toBe(false);
    expect(sameFolder('D:\\Projekt\\', 'd:/projekt')).toBe(true);
    expect(sameFolder('D:\\Projekt', 'D:\\Projekt2')).toBe(false);
  });

  it('speichert einen CodeGraph-Server nur mit genau einem Ordner', () => {
    const repo = new McpRepository(openDatabase(':memory:'));
    const base = { id: 'c', name: 'CodeGraph', kind: 'codegraph' };
    expect(repo.saveServer({ ...base, folders: ['D:\\Projekt'] }).ok).toBe(
      true,
    );
    expect(repo.saveServer({ ...base, folders: [] }).ok).toBe(false);
    expect(repo.saveServer({ ...base, folders: ['D:\\a', 'D:\\b'] }).ok).toBe(
      false,
    );
    expect(repo.saveServer({ ...base, folders: ['D:\\'] }).ok).toBe(false);
  });
});
