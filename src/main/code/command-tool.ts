import { spawn } from 'node:child_process';
import { CODE_TOOL_SERVER } from '../../shared/code';
import type { OfferedTool } from '../../shared/tools';

export const COMMAND_TOOL = 'run_command';
const TIMEOUT_DEFAULT_S = 120;
const TIMEOUT_MAX_S = 600;
/** So viel Ausgabe bekommt das Modell: Anfang und (wichtiger) Ende. */
const OUTPUT_HEAD = 4_000;
const OUTPUT_TAIL = 12_000;

/** Befehl im Projektordner – IMMER mit Rückfrage, die den genauen Befehl zeigt. */
export function commandTool(): OfferedTool {
  return {
    serverId: CODE_TOOL_SERVER,
    serverName: 'Code',
    toolName: COMMAND_TOOL,
    description:
      'Führt einen PowerShell-Befehl im Projektordner aus (z. B. „python -m pytest“, ' +
      '„npm test“) und liefert Exit-Code und Ausgabe. Keine Eingaben möglich – nur Befehle, ' +
      'die von selbst enden. Der Nutzer bestätigt jeden Befehl vorher.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Der Befehl (PowerShell).' },
        timeout_seconds: {
          type: 'integer',
          description: `Zeitlimit in Sekunden (Standard ${TIMEOUT_DEFAULT_S}, höchstens ${TIMEOUT_MAX_S}).`,
        },
      },
      required: ['command'],
    },
    destructive: true,
    permission: 'ask',
    alwaysAsk: true,
    describe: async (args) => {
      const { command, timeoutS } = commandArgs(args);
      return `${command}\n\nOrdner: Projektordner · Zeitlimit: ${timeoutS} s`;
    },
  };
}

export function commandArgs(args: Record<string, unknown>) {
  const command = typeof args.command === 'string' ? args.command.trim() : '';
  if (!command) throw new Error('Befehl fehlt.');
  if (command.length > 2000) throw new Error('Der Befehl ist zu lang.');
  const wanted =
    typeof args.timeout_seconds === 'number' &&
    Number.isFinite(args.timeout_seconds)
      ? Math.round(args.timeout_seconds)
      : TIMEOUT_DEFAULT_S;
  return { command, timeoutS: Math.min(Math.max(wanted, 1), TIMEOUT_MAX_S) };
}

/**
 * Führt den bestätigten Befehl aus: PowerShell ohne Profil, ohne Eingabe, im
 * Projektordner. Bei Zeitablauf oder „Stopp“ wird der ganze Prozessbaum beendet.
 */
export function runCommand(
  cwd: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  const { command, timeoutS } = commandArgs(args);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    // Ausgabe als UTF-8, damit Umlaute ankommen (Windows PowerShell 5.1 nutzt sonst die Codepage).
    const script =
      '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); ' +
      '$OutputEncoding = [Console]::OutputEncoding; ' +
      command;
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      },
    );
    let output = '';
    let ended: 'timeout' | 'aborted' | null = null;
    const collect = (chunk: Buffer) => {
      output += chunk.toString('utf8');
      // Nicht unbegrenzt wachsen lassen – der Anfang wird ohnehin gekürzt.
      if (output.length > 4 * (OUTPUT_HEAD + OUTPUT_TAIL)) {
        output = output.slice(0, OUTPUT_HEAD) + output.slice(-2 * OUTPUT_TAIL);
      }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    const stop = (reason: 'timeout' | 'aborted') => {
      if (ended || child.pid === undefined) return;
      ended = reason;
      // /T: mit allen Kindprozessen (z. B. python, node), /F: erzwingen.
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    };
    const timer = setTimeout(() => stop('timeout'), timeoutS * 1000);
    const onAbort = () => stop('aborted');
    signal.addEventListener('abort', onAbort, { once: true });

    child.on('error', (error) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const head =
        ended === 'timeout'
          ? `Abgebrochen nach ${timeoutS} s (Zeitlimit).`
          : ended === 'aborted'
            ? 'Vom Nutzer gestoppt.'
            : `Exit-Code: ${code ?? '–'} (${seconds} s)`;
      resolve(`${head}\n${shorten(output.trim()) || '(keine Ausgabe)'}`);
    });
  });
}

function shorten(text: string): string {
  if (text.length <= OUTPUT_HEAD + OUTPUT_TAIL) return text;
  return `${text.slice(0, OUTPUT_HEAD)}\n[… ${text.length - OUTPUT_HEAD - OUTPUT_TAIL} Zeichen ausgelassen …]\n${text.slice(-OUTPUT_TAIL)}`;
}
