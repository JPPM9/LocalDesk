import { execFile } from 'node:child_process';
import type { GpuInfo, GpuStatus } from '../../shared/api';

/** Welche Werte nvidia-smi liefern soll – Reihenfolge = Spalten in der Ausgabe. */
const FIELDS = [
  'index',
  'name',
  'utilization.gpu',
  'memory.used',
  'memory.total',
  'temperature.gpu',
  'power.draw',
  'power.limit',
] as const;

const TIMEOUT_MS = 2000;
const MIB = 1024 * 1024;

/** Startet ein Programm mit festen Argumenten und liefert seine Ausgabe (austauschbar für Tests). */
export type RunCommand = (file: string, args: string[]) => Promise<string>;

/**
 * Bewusst `execFile` statt einer Shell: Programm und Argumente stehen fest,
 * es kann nichts anderes ausgeführt werden.
 */
const runCommand: RunCommand = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { timeout: TIMEOUT_MS, windowsHide: true },
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
  });

/** Fragt alle NVIDIA-Grafikkarten ab. */
export async function queryGpus(
  run: RunCommand = runCommand,
): Promise<GpuStatus> {
  try {
    const output = await run('nvidia-smi', [
      `--query-gpu=${FIELDS.join(',')}`,
      '--format=csv,noheader,nounits',
    ]);
    const gpus = parseNvidiaSmi(output);
    if (gpus.length === 0) return { available: false, reason: 'no-nvidia' };
    return { available: true, gpus };
  } catch (error) {
    // ENOENT = Programm nicht gefunden → keine NVIDIA-Karte bzw. kein Treiber
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { available: false, reason: 'no-nvidia' };
    }
    return {
      available: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Liest die CSV-Ausgabe von nvidia-smi (eine Zeile pro Karte). Werte wie
 * „[N/A]“ (Karte meldet das nicht) werden zu „fehlt“ statt zu 0.
 */
export function parseNvidiaSmi(output: string): GpuInfo[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()))
    .filter((cells) => cells.length >= FIELDS.length)
    .map(([index, name, util, memUsed, memTotal, temp, power, powerLimit]) => ({
      index: Number(index) || 0,
      name,
      utilizationPercent: number(util),
      memoryUsedBytes: mibToBytes(number(memUsed)),
      memoryTotalBytes: mibToBytes(number(memTotal)),
      temperatureC: number(temp),
      powerWatts: number(power),
      powerLimitWatts: number(powerLimit),
    }));
}

function number(cell: string): number | undefined {
  const value = Number(cell);
  return cell !== '' && Number.isFinite(value) ? value : undefined;
}

function mibToBytes(mib: number | undefined): number | undefined {
  return mib === undefined ? undefined : mib * MIB;
}
