import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commandArgs,
  commandTool,
  runCommand,
} from '../../src/main/code/command-tool';

let dir: string;
const never = new AbortController().signal;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'localdesk-cmd-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('commandTool', () => {
  it('fragt immer und zeigt den genauen Befehl', async () => {
    const tool = commandTool();
    expect(tool).toMatchObject({
      permission: 'ask',
      alwaysAsk: true,
      destructive: true,
    });
    expect(await tool.describe?.({ command: ' python -m pytest ' })).toBe(
      'python -m pytest\n\nOrdner: Projektordner · Zeitlimit: 120 s',
    );
  });

  it('prüft die Eingaben', () => {
    expect(() => commandArgs({ command: '  ' })).toThrow('fehlt');
    expect(commandArgs({ command: 'x', timeout_seconds: 9999 }).timeoutS).toBe(
      600,
    );
    expect(commandArgs({ command: 'x', timeout_seconds: 0 }).timeoutS).toBe(1);
  });
});

describe('runCommand (echte PowerShell)', () => {
  it('liefert Ausgabe mit Umlauten und den Exit-Code, im Projektordner', async () => {
    const result = await runCommand(
      dir,
      {
        command:
          "Write-Output 'Grüße aus dem Ordner'; (Get-Location).Path; exit 3",
      },
      never,
    );
    expect(result).toMatch(/^Exit-Code: 3 \(\d+\.\d s\)\n/);
    expect(result).toContain('Grüße aus dem Ordner');
    expect(result).toContain(path.basename(dir));
  }, 30_000);

  it('startet nie eine PowerShell aus dem Projektordner', async () => {
    // Eine Fälschung im Projekt: Würde sie gestartet, käme keine Ausgabe an.
    await writeFile(path.join(dir, 'powershell.exe'), 'kein Programm');
    const result = await runCommand(dir, { command: "'echt'" }, never);
    expect(result).toContain('echt');
  }, 30_000);

  it('beendet Befehle nach dem Zeitlimit', async () => {
    const result = await runCommand(
      dir,
      { command: 'Start-Sleep -Seconds 20', timeout_seconds: 1 },
      never,
    );
    expect(result).toMatch(/^Abgebrochen nach 1 s/);
  }, 30_000);

  it('lässt sich stoppen', async () => {
    const controller = new AbortController();
    const running = runCommand(
      dir,
      { command: 'Start-Sleep -Seconds 20' },
      controller.signal,
    );
    setTimeout(() => controller.abort(), 1500);
    expect(await running).toMatch(/^Vom Nutzer gestoppt/);
  }, 30_000);

  it('wartet nicht auf Eingaben', async () => {
    const result = await runCommand(
      dir,
      { command: 'Read-Host "Name"' },
      never,
    );
    expect(result).not.toMatch(/^Abgebrochen/);
  }, 30_000);
});
