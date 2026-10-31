import { statSync } from 'node:fs';
import path from 'node:path';

/**
 * Programme immer mit vollem Pfad starten. Ein bloßer Name wie „git“ sucht
 * unter Windows zuerst im Arbeitsordner – dort könnte ein Projekt eine eigene
 * git.exe mitbringen, die dann ohne Rückfrage liefe.
 */

function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

function isInside(dir: string, parent: string): boolean {
  const rel = path.relative(parent, dir);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Sucht ein Programm NUR in den Ordnern der Umgebungsvariable PATH.
 * Leere oder relative Einträge und Ordner im Projekt (`avoidInside`) zählen nicht.
 */
export function findProgram(name: string, avoidInside?: string): string | null {
  const file = process.platform === 'win32' ? `${name}.exe` : name;
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!dir || !path.isAbsolute(dir)) continue;
    if (avoidInside && isInside(dir, avoidInside)) continue;
    const candidate = path.join(dir, file);
    if (isFile(candidate)) return candidate;
  }
  return null;
}

/** Eingebaute Windows-Programme: fester Ort im Systemordner, nie aus dem Projekt. */
export function systemProgram(...parts: string[]): string {
  return path.join(process.env.SystemRoot ?? 'C:\\Windows', ...parts);
}

export const powershellPath = () =>
  systemProgram('System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
export const taskkillPath = () => systemProgram('System32', 'taskkill.exe');
