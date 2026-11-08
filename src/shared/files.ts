import type { MessageRecord, Result } from './api';
import type { FileKind } from './file-kinds';
import { imageMarker } from './images';
import { messageLocale, tr } from './messages';
import { tableMarker } from './tables';

/**
 * Dateien im Chat: Die Oberfläche schickt eine Datei an den Hauptprozess, der den Text
 * herausliest (PDF, Word, Text, Code). Mit der Nachricht geht dieser Text mit; gespeichert
 * wird der gelesene Text bei der Nachricht, nie die Originaldatei.
 */

/** Dateien pro Nachricht. */
export const FILES_MAX_PER_MESSAGE = 3;
/** Text einer Datei (≈ 25 000 Tokens ≈ 30 Seiten) – mehr ist ein Fall für „Wissen“. */
export const FILE_TEXT_MAX_CHARS = 100_000;
export const FILES_TEXT_MAX_TOTAL = 200_000;
/** Von den Dateien des Chats gehen die letzten so viele mit jeder Anfrage mit. */
export const FILES_SENT_MAX = 3;
/** PDF und Word enthalten mehr als Text (Bilder, Schriften) – daher mehr Platz als bei Text. */
export const FILE_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const FILE_TEXT_MAX_BYTES = 2 * 1024 * 1024;
export const FILE_NAME_MAX = 100;

const CHARS_PER_TOKEN = 4;
const KINDS: readonly FileKind[] = ['pdf', 'docx', 'markdown', 'text', 'code'];

/** Eine Datei einer gespeicherten Nachricht – ohne Text (den holt `getChatFile` bei Bedarf). */
export interface MessageFile {
  id: string;
  name: string;
  kind: FileKind;
  /** Zeichen des gelesenen Textes. */
  chars: number;
  /** Nur PDF. */
  pages?: number;
}

/** Eine Datei, wie die Oberfläche sie mit der Nachricht schickt (Text schon gelesen). */
export interface ChatFileInput {
  id: string;
  name: string;
  kind: FileKind;
  text: string;
  pages?: number;
}

/** Was das Lesen einer Datei ergibt. */
export interface ReadChatFile {
  name: string;
  kind: FileKind;
  text: string;
  chars: number;
  pages?: number;
}

const ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Geschätzte Tokens für so viele Zeichen (wie bei der Kontext-Anzeige). */
export const fileTokens = (chars: number): number =>
  Math.ceil(chars / CHARS_PER_TOKEN);

/** Nur der Dateiname, ohne Pfad und Steuerzeichen, höchstens 100 Zeichen. */
export function cleanFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '')
    .split('')
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join('')
    .trim();
  return base.slice(0, FILE_NAME_MAX) || 'file';
}

/**
 * Prüft die Dateien einer Nachricht (alles aus der Oberfläche ist nur eine Behauptung):
 * Anzahl, Art, Länge des Textes. Fehlt die Angabe, gibt es keine Dateien.
 */
export function checkFileInputs(input: unknown): Result<ChatFileInput[]> {
  if (input === undefined) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: tr('files.badInput') };
  }
  if (input.length > FILES_MAX_PER_MESSAGE) {
    return {
      ok: false,
      error: tr('files.tooMany', { max: FILES_MAX_PER_MESSAGE }),
    };
  }
  const files: ChatFileInput[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const item of input) {
    const raw = (item ?? {}) as Partial<Record<keyof ChatFileInput, unknown>>;
    if (
      typeof raw.id !== 'string' ||
      !ID.test(raw.id) ||
      seen.has(raw.id) ||
      typeof raw.name !== 'string' ||
      typeof raw.text !== 'string' ||
      !KINDS.includes(raw.kind as FileKind) ||
      raw.text.trim() === '' ||
      raw.text.includes('\0') ||
      (raw.pages !== undefined &&
        !(Number.isInteger(raw.pages) && (raw.pages as number) > 0))
    ) {
      return { ok: false, error: tr('files.badInput') };
    }
    seen.add(raw.id);
    const name = cleanFileName(raw.name);
    if (raw.text.length > FILE_TEXT_MAX_CHARS) {
      return {
        ok: false,
        error: tr('files.tooLong', {
          name,
          max: FILE_TEXT_MAX_CHARS.toLocaleString(messageLocale()),
        }),
      };
    }
    total += raw.text.length;
    files.push({
      id: raw.id,
      name,
      kind: raw.kind as FileKind,
      text: raw.text,
      ...(raw.pages !== undefined && { pages: raw.pages as number }),
    });
  }
  if (total > FILES_TEXT_MAX_TOTAL) {
    return {
      ok: false,
      error: tr('files.totalTooLong', {
        max: FILES_TEXT_MAX_TOTAL.toLocaleString(messageLocale()),
      }),
    };
  }
  return { ok: true, value: files };
}

/** Der Text-Hinweis für eine Datei, deren Text nicht mitgeht (z. B. beim Verdichten). */
export function fileMarker(name: string): string {
  return tr('prompt.fileMarker', { name });
}

/** Die Datei als Block in der Nachricht ans Modell – klar abgegrenzt von deiner Frage. */
export function fileBlock(name: string, text: string): string {
  return tr('prompt.fileBlock', { name, text });
}

/** Statt des Textes einer älteren Datei: Sie ist nicht mehr im Kontext. */
export function fileOutOfContext(name: string): string {
  return tr('prompt.fileOld', { name });
}

/**
 * Welche Dateien gehen wirklich mit? Die letzten `FILES_SENT_MAX` des Verlaufs
 * (ältere stehen nur noch als Hinweis, sonst füllen sie den Kontext).
 */
export function filesToSend(
  messages: Pick<MessageRecord, 'files'>[],
): Set<string> {
  const ids = messages.flatMap((m) => (m.files ?? []).map((f) => f.id));
  return new Set(ids.slice(-FILES_SENT_MAX));
}

/**
 * Der Text einer Nachricht samt Hinweisen „[Datei: …]“ und „[Bild: …]“ für ihre Anhänge
 * (für Zusammenfassungen und Notizen – ohne den Inhalt der Dateien).
 */
export function textWithAttachmentMarkers(
  message: Pick<MessageRecord, 'content' | 'images' | 'files' | 'tables'>,
): string {
  return [
    ...(message.files ?? []).map((file) => fileMarker(file.name)),
    ...(message.tables ?? []).map((table) => tableMarker(table.name)),
    ...(message.images ?? []).map((image) => imageMarker(image.name)),
    message.content.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}
