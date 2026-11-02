import type { MessageRecord, Result } from './api';
import { tr } from './messages';

/**
 * Bilder im Chat: Die Oberfläche verkleinert ein Foto und schickt die Bytes mit der
 * Nachricht; der Hauptprozess prüft sie, speichert sie bei der Nachricht und schickt
 * sie (nur an Modelle mit Bild-Fähigkeit) an Ollama.
 */

/** Bilder pro Nachricht. */
export const IMAGE_MAX_PER_MESSAGE = 4;
/** Ein verkleinertes Bild darf höchstens so groß sein (Hauptprozess prüft das). */
export const IMAGE_MAX_BYTES = 4_000_000;
export const IMAGES_MAX_TOTAL_BYTES = 12_000_000;
/** So groß darf die Datei sein, die du auswählst (vor dem Verkleinern). */
export const IMAGE_SOURCE_MAX_BYTES = 25_000_000;
/** Längste Kante nach dem Verkleinern, in Pixeln – größere Fotos werden kleiner gerechnet. */
export const IMAGE_MAX_EDGE = 1280;
export const IMAGE_JPEG_QUALITY = 0.88;
/** Von den Bildern des Chats gehen die letzten so viele mit jeder Anfrage mit. */
export const IMAGES_SENT_MAX = 4;
/** Schätzung für die Kontext-Anzeige (gemessen mit gemma4:12b: 392 Tokens je Bild). */
export const IMAGE_TOKENS_ESTIMATE = 400;
export const IMAGE_NAME_MAX = 100;

/** Ein Bild einer gespeicherten Nachricht – ohne die Bytes (die holt die Oberfläche einzeln). */
export interface MessageImage {
  id: string;
  /** Dateiname, nur zur Anzeige und für den Text-Hinweis „[Bild: …]“. */
  name: string;
  size: number;
}

/** Ein Bild, wie die Oberfläche es mit der Nachricht schickt. */
export interface ChatImageInput {
  id: string;
  name: string;
  data: Uint8Array;
}

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Erkennt das Format an den ersten Bytes (der Dateiname sagt nichts). */
export function sniffImage(bytes: Uint8Array): ImageMime | null {
  const is = (offset: number, ...values: number[]) =>
    values.every((value, i) => bytes[offset + i] === value);
  if (is(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (is(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  // „RIFF“ + 4 Bytes Länge + „WEBP“
  if (is(0, 0x52, 0x49, 0x46, 0x46) && is(8, 0x57, 0x45, 0x42, 0x50)) {
    return 'image/webp';
  }
  return null;
}

/** Größe nach dem Verkleinern: längste Kante höchstens `maxEdge`, nie größer als das Original. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = IMAGE_MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Nur der Dateiname, ohne Pfad und Steuerzeichen, höchstens 100 Zeichen. */
export function cleanImageName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '')
    .split('')
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join('')
    .trim();
  return base.slice(0, IMAGE_NAME_MAX) || 'image';
}

const mb = (bytes: number) => bytes / 1_000_000;

/**
 * Prüft die Bilder einer Nachricht (alles aus der Oberfläche ist nur eine Behauptung):
 * Anzahl, Größe, Format an den ersten Bytes. Fehlt die Angabe, gibt es keine Bilder.
 */
export function checkImageInputs(input: unknown): Result<ChatImageInput[]> {
  if (input === undefined) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: tr('images.badInput') };
  }
  if (input.length > IMAGE_MAX_PER_MESSAGE) {
    return {
      ok: false,
      error: tr('images.tooMany', { max: IMAGE_MAX_PER_MESSAGE }),
    };
  }
  const images: ChatImageInput[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const item of input) {
    const raw = (item ?? {}) as {
      id?: unknown;
      name?: unknown;
      data?: unknown;
    };
    const data =
      raw.data instanceof Uint8Array
        ? raw.data
        : raw.data instanceof ArrayBuffer
          ? new Uint8Array(raw.data)
          : null;
    if (
      typeof raw.id !== 'string' ||
      !ID.test(raw.id) ||
      seen.has(raw.id) ||
      typeof raw.name !== 'string' ||
      !data
    ) {
      return { ok: false, error: tr('images.badInput') };
    }
    seen.add(raw.id);
    const name = cleanImageName(raw.name);
    if (data.byteLength === 0 || sniffImage(data) === null) {
      return { ok: false, error: tr('images.badFormat', { name }) };
    }
    if (data.byteLength > IMAGE_MAX_BYTES) {
      return {
        ok: false,
        error: tr('images.tooBig', { name, max: mb(IMAGE_MAX_BYTES) }),
      };
    }
    total += data.byteLength;
    images.push({ id: raw.id, name, data });
  }
  if (total > IMAGES_MAX_TOTAL_BYTES) {
    return {
      ok: false,
      error: tr('images.totalTooBig', { max: mb(IMAGES_MAX_TOTAL_BYTES) }),
    };
  }
  return { ok: true, value: images };
}

/** Der Text-Hinweis, der für ein Bild steht, das nicht mitgeschickt wird. */
export function imageMarker(name: string): string {
  return tr('prompt.imageMarker', { name });
}

/** Der Text einer Nachricht samt Hinweisen „[Bild: …]“ für ihre Bilder (für Zusammenfassungen und Notizen). */
export function textWithImageMarkers(
  message: Pick<MessageRecord, 'content' | 'images'>,
): string {
  return [
    ...(message.images ?? []).map((image) => imageMarker(image.name)),
    message.content.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Welche Bilder gehen wirklich mit? Die letzten `IMAGES_SENT_MAX` des Verlaufs, wenn das
 * Modell Bilder kann – sonst keins (dann steht an ihrer Stelle nur der Text-Hinweis).
 */
export function imagesToSend(
  messages: Pick<MessageRecord, 'images'>[],
  vision: boolean,
): Set<string> {
  if (!vision) return new Set();
  const ids = messages.flatMap((m) => (m.images ?? []).map((i) => i.id));
  return new Set(ids.slice(-IMAGES_SENT_MAX));
}
