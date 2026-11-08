import { utilityProcess } from 'electron';
import type { SpawnWorker } from './data-client';

/**
 * Startet den Tabellen-Prozess (data-worker.cjs) als Electron-Hilfsprozess. Er ist ein eigener
 * Prozess, weil eine Abfrage mitten in SQLite steckt: Ein Thread ließe sich dort nicht beenden und
 * bliebe hängen (und hielte das Beenden der App auf), ein Prozess lässt sich hart beenden. Stürzt er
 * ab (zu wenig Speicher), bleibt die App heil.
 */
export const processSpawn =
  (modulePath: string): SpawnWorker =>
  () => {
    const child = utilityProcess.fork(modulePath, [], {
      serviceName: 'LocalDesk Tabellen',
      stdio: 'ignore',
    });
    return {
      postMessage: (message) => child.postMessage(message),
      // Fehler meldet der Prozess nur über sein Ende ('exit').
      on: (event, listener) =>
        event === 'error'
          ? child
          : child.on(event as 'exit', listener as never),
      off: (event, listener) =>
        event === 'error'
          ? child
          : child.off(event as 'exit', listener as never),
      terminate: () => child.kill(),
    };
  };
