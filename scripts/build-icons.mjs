// Erzeugt aus assets/icon.svg die PNGs und die Windows-Datei icon.ico.
// Ohne zusätzliche Pakete: Gezeichnet wird mit Microsoft Edge (headless, transparenter
// Hintergrund); die .ico ist nur ein Container, der die PNGs enthält.
// Aufruf: node scripts/build-icons.mjs
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const assets = path.join(root, 'assets');
const svg = readFileSync(path.join(assets, 'icon.svg'), 'utf8');

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
if (!EDGE)
  throw new Error(
    'Microsoft Edge nicht gefunden – wird zum Zeichnen gebraucht.',
  );

/** Größen in der .ico (Windows wählt je nach Stelle: Taskleiste, Explorer, Verknüpfung). */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

const work = mkdtempSync(path.join(tmpdir(), 'localdesk-icon-'));
try {
  const render = (size) => {
    const page = path.join(work, `${size}.html`);
    writeFileSync(
      page,
      `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>` +
        svg.replace('<svg ', `<svg width="${size}" height="${size}" `),
    );
    const out = path.join(work, `${size}.png`);
    execFileSync(
      EDGE,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--default-background-color=00000000',
        `--window-size=${size},${size}`,
        `--screenshot=${out}`,
        pathToFileURL(page).href,
      ],
      { stdio: 'ignore' },
    );
    return readFileSync(out);
  };

  const pngs = new Map(ICO_SIZES.map((size) => [size, render(size)]));
  writeFileSync(path.join(assets, 'icon.png'), render(512));
  writeFileSync(path.join(assets, 'icon.ico'), toIco(pngs));
  console.log(
    `assets/icon.png (512 px) und assets/icon.ico (${ICO_SIZES.join(', ')} px) geschrieben.`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}

/** ICO-Datei: 6 Byte Kopf, je Bild 16 Byte Verzeichnis-Eintrag, dann die PNG-Daten. */
function toIco(images) {
  const entries = [...images.entries()];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserviert
  header.writeUInt16LE(1, 2); // Typ 1 = Symbol
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = entries.map(([size, png]) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 bedeutet 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // keine Farbpalette
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // Farbebenen
    e.writeUInt16LE(32, 6); // Bit pro Pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...entries.map(([, png]) => png)]);
}
