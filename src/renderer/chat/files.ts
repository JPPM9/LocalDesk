import type { FileKind } from '../../shared/file-kinds';
import { FILE_DOCUMENT_MAX_BYTES } from '../../shared/files';
import { TABLE_MAX_BYTES, type ReadChatTable } from '../../shared/tables';
import type { PreparedImage } from './images';

/** Was mit einer Nachricht angehängt wird. */
export interface Attachments {
  images: PreparedImage[];
  files: PreparedFile[];
  /** Gelesene Tabellen (CSV, TSV, Excel): nur Nummer und Größe – die Daten liegen im Hauptprozess. */
  tables: PreparedTable[];
}

export type PreparedTable = ReadChatTable;

/** Eine gelesene Datei, bereit zum Senden (der Text steht schon fest). */
export interface PreparedFile {
  id: string;
  name: string;
  kind: FileKind;
  text: string;
  chars: number;
  pages?: number;
}

/** Eine Datei, die nicht angehängt werden kann – `message` ist der fertige Text für dich. */
export class FileProblem extends Error {
  constructor(
    message: string,
    /** Zu groß, noch bevor sie gelesen wird (Text für die Oberfläche kommt aus den Übersetzungen). */
    readonly tooBig = false,
    readonly fileName = '',
  ) {
    super(message);
  }
}

/**
 * Schickt die Datei zum Lesen an den Hauptprozess (PDF, Word, Text, Code) und gibt den Text
 * zurück. Gespeichert wird noch nichts – das passiert erst mit dem Senden der Nachricht.
 */
export async function prepareFile(file: File): Promise<PreparedFile> {
  const name = file.name || 'file';
  // Riesige Dateien gar nicht erst einlesen (der Hauptprozess prüft die genaue Grenze je Art).
  if (file.size > FILE_DOCUMENT_MAX_BYTES) {
    throw new FileProblem('', true, name);
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const result = await window.api.readChatFile(name, data);
  if (!result.ok) throw new FileProblem(result.error);
  return { id: crypto.randomUUID(), ...result.value };
}

/**
 * Schickt eine Tabellendatei (CSV, TSV, Excel) zum Lesen an den Hauptprozess. Die Daten bleiben
 * dort; zurück kommen Name, Größe und eine Nummer. Gesendet wird sie erst mit der Nachricht.
 */
export async function prepareTable(file: File): Promise<PreparedTable> {
  const name = file.name || 'file';
  if (file.size > TABLE_MAX_BYTES) throw new FileProblem('', true, name);
  const data = new Uint8Array(await file.arrayBuffer());
  const result = await window.api.readChatTable(name, data);
  if (!result.ok) throw new FileProblem(result.error);
  return result.value;
}
