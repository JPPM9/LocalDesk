import { afterEach, describe, expect, it } from 'vitest';
import { setMessageLanguage } from '../../src/shared/messages';
import {
  checkImageInputs,
  cleanImageName,
  fitWithin,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_PER_MESSAGE,
  IMAGES_MAX_TOTAL_BYTES,
  IMAGES_SENT_MAX,
  imageMarker,
  imagesToSend,
  sniffImage,
  textWithImageMarkers,
} from '../../src/shared/images';

afterEach(() => setMessageLanguage('de'));

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

/** Ein „Bild“ mit den richtigen ersten Bytes und beliebiger Länge. */
const bytes = (head: number[], length = head.length) => {
  const data = new Uint8Array(length);
  data.set(head);
  return data;
};
const input = (id: string, data = bytes(JPEG, 100), name = 'foto.jpg') => ({
  id,
  name,
  data,
});

describe('sniffImage', () => {
  it('erkennt JPEG, PNG und WebP an den ersten Bytes', () => {
    expect(sniffImage(bytes(JPEG))).toBe('image/jpeg');
    expect(sniffImage(bytes(PNG))).toBe('image/png');
    expect(sniffImage(bytes(WEBP))).toBe('image/webp');
  });

  it('alles andere ist kein erlaubtes Bild', () => {
    expect(sniffImage(new Uint8Array())).toBeNull();
    expect(sniffImage(bytes([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF
    expect(sniffImage(bytes([0x50, 0x4b, 0x03, 0x04]))).toBeNull(); // ZIP
    expect(sniffImage(new TextEncoder().encode('<svg></svg>'))).toBeNull();
    // RIFF, aber kein WebP (z. B. WAV)
    expect(
      sniffImage(
        bytes([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]),
      ),
    ).toBeNull();
  });
});

describe('fitWithin', () => {
  it('verkleinert auf die längste Kante und behält das Seitenverhältnis', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(6000, 100)).toEqual({ width: 1280, height: 21 });
  });

  it('vergrößert nie', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it('eine Seite wird nie 0 Pixel breit', () => {
    expect(fitWithin(100_000, 10)).toEqual({ width: 1280, height: 1 });
  });
});

describe('cleanImageName', () => {
  it('nimmt nur den Dateinamen, ohne Pfad und Steuerzeichen', () => {
    expect(cleanImageName('C:\\Users\\ich\\Bilder\\urlaub.jpg')).toBe(
      'urlaub.jpg',
    );
    expect(cleanImageName('../../etc/passwd')).toBe('passwd');
    expect(cleanImageName('a\u0000b\u0007.png')).toBe('ab.png');
    expect(cleanImageName('x'.repeat(300))).toHaveLength(100);
    expect(cleanImageName('')).toBe('image');
    expect(cleanImageName('  ')).toBe('image');
  });
});

describe('checkImageInputs', () => {
  it('ohne Angabe oder leer gibt es keine Bilder', () => {
    expect(checkImageInputs(undefined)).toEqual({ ok: true, value: [] });
    expect(checkImageInputs([])).toEqual({ ok: true, value: [] });
  });

  it('nimmt gültige Bilder mit bereinigtem Namen', () => {
    const result = checkImageInputs([
      input('bild-0001', bytes(JPEG, 10), 'C:\\x\\a.jpg'),
      input('bild-0002', bytes(PNG, 10)),
      input('bild-0003', bytes(WEBP, 20)),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((i) => i.name)).toEqual([
      'a.jpg',
      'foto.jpg',
      'foto.jpg',
    ]);
  });

  it('nimmt auch ArrayBuffer (so kommt es teils über die Brücke)', () => {
    const buffer = bytes(JPEG, 10).buffer;
    const result = checkImageInputs([
      { id: 'bild-0001', name: 'a.jpg', data: buffer },
    ]);
    expect(result.ok).toBe(true);
  });

  it('höchstens 4 Bilder', () => {
    const many = Array.from({ length: IMAGE_MAX_PER_MESSAGE + 1 }, (_, i) =>
      input(`bild-000${i}`),
    );
    expect(checkImageInputs(many)).toEqual({
      ok: false,
      error: 'Höchstens 4 Bilder pro Nachricht.',
    });
    expect(checkImageInputs(many.slice(0, IMAGE_MAX_PER_MESSAGE)).ok).toBe(
      true,
    );
  });

  it('prüft das Format an den Bytes, nicht am Namen', () => {
    expect(
      checkImageInputs([
        input('bild-0001', bytes([1, 2, 3, 4]), 'tarnung.jpg'),
      ]),
    ).toEqual({
      ok: false,
      error: 'Das Bild „tarnung.jpg“ ist kein JPEG, PNG oder WebP.',
    });
    expect(checkImageInputs([input('bild-0001', new Uint8Array())]).ok).toBe(
      false,
    );
  });

  it('lehnt zu große Bilder ab – einzeln und zusammen', () => {
    expect(
      checkImageInputs([input('bild-0001', bytes(JPEG, IMAGE_MAX_BYTES + 1))]),
    ).toEqual({
      ok: false,
      error: 'Das Bild „foto.jpg“ ist zu groß (höchstens 4 MB).',
    });
    expect(
      checkImageInputs([input('bild-0001', bytes(JPEG, IMAGE_MAX_BYTES))]).ok,
    ).toBe(true);
    // 3 × 4 MB = 12 MB passt, ein Byte mehr nicht – dafür reicht ein viertes Bild.
    const big = (id: string, extra = 0) =>
      input(id, bytes(JPEG, IMAGES_MAX_TOTAL_BYTES / 3 + extra));
    expect(
      checkImageInputs([big('a-1234567'), big('b-1234567'), big('c-1234567')])
        .ok,
    ).toBe(true);
    expect(
      checkImageInputs([
        big('a-1234567'),
        big('b-1234567'),
        big('c-1234567'),
        input('d-1234567', bytes(JPEG, 10)),
      ]),
    ).toEqual({
      ok: false,
      error: 'Die Bilder sind zusammen zu groß (höchstens 12 MB).',
    });
  });

  it('lehnt kaputte Angaben ab: Form, Kennung, Doppelte', () => {
    for (const bad of [
      'bild',
      42,
      [null],
      ['text'],
      [{ id: 'bild-0001', name: 'a.jpg' }],
      [{ id: 'bild-0001', name: 'a.jpg', data: 'text' }],
      [{ id: 'bild-0001', name: 5, data: bytes(JPEG) }],
      [input('kurz')],
      [input('../../etc/passwd/xxxx')],
      [input('bild-0001'), input('bild-0001')],
    ]) {
      expect(checkImageInputs(bad), JSON.stringify(bad)).toEqual({
        ok: false,
        error: expect.any(String),
      });
    }
  });

  it('Fehlertexte folgen der Sprache', () => {
    setMessageLanguage('en');
    expect(checkImageInputs([input('bild-0001', bytes([1, 2, 3]))])).toEqual({
      ok: false,
      error: 'The image “foto.jpg” is not a JPEG, PNG or WebP.',
    });
  });
});

describe('Text-Hinweise', () => {
  it('imageMarker folgt der Sprache', () => {
    expect(imageMarker('urlaub.jpg')).toBe('[Bild: urlaub.jpg]');
    setMessageLanguage('en');
    expect(imageMarker('urlaub.jpg')).toBe('[Image: urlaub.jpg]');
  });

  it('textWithImageMarkers: Hinweise zuerst, dann der Text', () => {
    expect(
      textWithImageMarkers({
        content: '  Was ist das?  ',
        images: [
          { id: 'a', name: 'a.jpg', size: 1 },
          { id: 'b', name: 'b.jpg', size: 1 },
        ],
      }),
    ).toBe('[Bild: a.jpg]\n[Bild: b.jpg]\nWas ist das?');
    expect(textWithImageMarkers({ content: 'Nur Text' })).toBe('Nur Text');
    expect(
      textWithImageMarkers({
        content: '',
        images: [{ id: 'a', name: 'a.jpg', size: 1 }],
      }),
    ).toBe('[Bild: a.jpg]');
  });
});

describe('imagesToSend', () => {
  const msgs = (counts: number[]) =>
    counts.map((n, m) => ({
      images: Array.from({ length: n }, (_, i) => ({
        id: `m${m}-${i}`,
        name: 'x',
        size: 1,
      })),
    }));

  it('schickt die letzten 4 Bilder des Verlaufs mit', () => {
    expect(IMAGES_SENT_MAX).toBe(4);
    const sent = imagesToSend(msgs([2, 0, 2, 3]), true);
    expect([...sent]).toEqual(['m2-1', 'm3-0', 'm3-1', 'm3-2']);
    expect(imagesToSend(msgs([1, 1]), true).size).toBe(2);
  });

  it('ohne Bild-Fähigkeit geht keins mit', () => {
    expect(imagesToSend(msgs([2, 2]), false).size).toBe(0);
  });

  it('Nachrichten ohne Bilder stören nicht', () => {
    expect(imagesToSend([{}, { images: undefined }], true).size).toBe(0);
  });
});
