import { useEffect, useState } from 'react';
import {
  fitWithin,
  IMAGE_JPEG_QUALITY,
  IMAGE_MAX_BYTES,
  IMAGE_SOURCE_MAX_BYTES,
} from '../../shared/images';

/** Ein verkleinertes Bild, bereit zum Senden (und mit Adresse für die Vorschau). */
export interface PreparedImage {
  id: string;
  name: string;
  data: Uint8Array;
  mime: string;
  /** Vorschau-Adresse (blob:) – gilt, solange die Seite offen ist. */
  url: string;
}

export type ImageProblemCode = 'notImage' | 'tooLarge' | 'unreadable';

/** Ein Bild, das nicht angehängt werden kann – mit Grund und Dateiname für die Meldung. */
export class ImageProblem extends Error {
  constructor(
    readonly code: ImageProblemCode,
    readonly fileName: string,
  ) {
    super(code);
  }
}

const HEIC = /\.(heic|heif)$/i;

/**
 * Liest ein Foto und rechnet es kleiner: längste Kante höchstens 1280 Pixel, als JPEG.
 * Das Original bleibt unberührt; nur diese Kopie wird gespeichert und gesendet.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const name = file.name || 'image';
  if (!file.type.startsWith('image/') && !HEIC.test(name)) {
    throw new ImageProblem('notImage', name);
  }
  if (file.size > IMAGE_SOURCE_MAX_BYTES) {
    throw new ImageProblem('tooLarge', name);
  }
  let bitmap: ImageBitmap;
  try {
    // Der Browser kennt JPG, PNG, WebP, GIF (erstes Bild) und BMP – HEIC nicht.
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageProblem('unreadable', name);
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new ImageProblem('unreadable', name);
    // JPEG kennt keine Transparenz – auf Weiß zeichnen.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    let blob = await toJpeg(canvas, IMAGE_JPEG_QUALITY, name);
    if (blob.size > IMAGE_MAX_BYTES) blob = await toJpeg(canvas, 0.6, name);
    if (blob.size > IMAGE_MAX_BYTES) throw new ImageProblem('tooLarge', name);
    return {
      id: crypto.randomUUID(),
      name,
      data: new Uint8Array(await blob.arrayBuffer()),
      mime: 'image/jpeg',
      url: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}

function toJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
  name: string,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ImageProblem('unreadable', name)),
      'image/jpeg',
      quality,
    ),
  );
}

// Adressen der Bilder, die diese Sitzung schon hat: frisch angehängte (sofort sichtbar,
// ohne Umweg) und aus der Datenbank geholte.
const urls = new Map<string, string>();
const loading = new Map<string, Promise<string | null>>();

/** Merkt sich die Vorschau-Adresse eines Bildes (z. B. beim Senden). */
export function rememberImageUrl(id: string, url: string) {
  urls.set(id, url);
}

/** Macht aus gelesenen Bytes eine Adresse und merkt sie sich. */
export function rememberImageBytes(
  id: string,
  data: Uint8Array,
  mime: string,
): string {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  urls.set(id, url);
  return url;
}

/** Die Adresse eines Bildes – aus dem Gedächtnis, sonst aus der Datenbank geholt (null = nicht vorhanden). */
export function loadImageUrl(id: string): Promise<string | null> {
  const known = urls.get(id);
  if (known) return Promise.resolve(known);
  let pending = loading.get(id);
  if (!pending) {
    pending = window.api
      .getChatImage(id)
      .then((result) =>
        result.ok
          ? rememberImageBytes(id, result.value.data, result.value.mime)
          : null,
      )
      .catch(() => null)
      .finally(() => loading.delete(id));
    loading.set(id, pending);
  }
  return pending;
}

/** Adresse zum Anzeigen: sofort, wenn schon bekannt, sonst nach dem Laden. */
export function useImageUrl(id: string): {
  url: string | null;
  failed: boolean;
} {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>(
    () => ({ url: urls.get(id) ?? null, failed: false }),
  );
  useEffect(() => {
    let alive = true;
    void loadImageUrl(id).then((url) => {
      if (alive) setState({ url, failed: url === null });
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return state;
}
