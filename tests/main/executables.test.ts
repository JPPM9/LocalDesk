import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  findProgram,
  powershellPath,
  taskkillPath,
} from '../../src/main/code/executables';

let base: string;
const savedPath = process.env.PATH;
const exe = process.platform === 'win32' ? 'fake-prog.exe' : 'fake-prog';

beforeEach(async () => {
  base = await mkdtemp(path.join(os.tmpdir(), 'localdesk-exe-'));
});

afterEach(async () => {
  process.env.PATH = savedPath;
  await rm(base, { recursive: true, force: true });
});

describe('findProgram', () => {
  it('findet Programme nur in absoluten PATH-Ordnern', async () => {
    const bin = path.join(base, 'bin');
    await mkdir(bin);
    await writeFile(path.join(bin, exe), 'x');
    process.env.PATH = ['', 'relativ', bin].join(path.delimiter);
    expect(findProgram('fake-prog')).toBe(path.join(bin, exe));
    expect(findProgram('gibt-es-nicht-xyz')).toBeNull();
  });

  it('überspringt PATH-Ordner im Projekt', async () => {
    const project = path.join(base, 'projekt');
    const inside = path.join(project, 'bin');
    const outside = path.join(base, 'system');
    await mkdir(inside, { recursive: true });
    await mkdir(outside);
    await writeFile(path.join(inside, exe), 'falsch');
    await writeFile(path.join(outside, exe), 'richtig');
    process.env.PATH = [inside, outside].join(path.delimiter);
    expect(findProgram('fake-prog', project)).toBe(path.join(outside, exe));
    expect(findProgram('fake-prog')).toBe(path.join(inside, exe));
  });
});

describe('Systemprogramme', () => {
  it('liegen im Windows-Ordner, nicht im Arbeitsordner', () => {
    if (process.platform !== 'win32') return;
    expect(path.isAbsolute(powershellPath())).toBe(true);
    expect(path.isAbsolute(taskkillPath())).toBe(true);
    expect(powershellPath().toLowerCase()).toContain('system32');
  });
});
