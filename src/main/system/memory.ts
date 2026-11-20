import * as os from 'node:os';
import type { SystemMemory } from '../../shared/api';

/** Arbeitsspeicher und Prozessorkerne dieses PCs (austauschbar für Tests). */
export function querySystemMemory(
  source: Pick<typeof os, 'totalmem' | 'freemem' | 'cpus'> = os,
): SystemMemory {
  return {
    totalBytes: source.totalmem(),
    freeBytes: source.freemem(),
    cpuCount: source.cpus().length,
  };
}
