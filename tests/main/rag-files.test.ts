import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decodeText,
  fileKind,
  readTextFile,
  scanSources,
} from '../../src/main/rag/files';

let root: string;
const write = (relative: string, content: string | Uint8Array = 'Text') => {
  const full = path.join(root, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
  return full;
};
const names = (files: { path: string }[]) =>
  files.map((f) => path.relative(root, f.path).replaceAll('\\', '/')).sort();

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'localdesk-rag-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('fileKind', () => {
  it('erkennt Markdown, Text und Code', () => {
    expect(fileKind('C:\\a\\Notiz.MD')).toBe('markdown');
    expect(fileKind('liste.txt')).toBe('text');
    expect(fileKind('app.tsx')).toBe('code');
    expect(fileKind('bild.png')).toBeNull();
    expect(fileKind('skript.pdf')).toBeNull(); // kommt in Schritt 3
  });
});

describe('scanSources', () => {
  it('findet passende Dateien in Unterordnern und lässt Unpassendes aus', () => {
    write('notizen/a.md');
    write('notizen/tief/b.txt');
    write('code/app.ts');
    write('bild.png');
    write('node_modules/x/index.js');
    write('.git/config.json');
    write('code/dist/bundle.js');
    write('code/package-lock.json', '{}');
    write('code/vendor.min.js');
    return scanSources([{ kind: 'folder', path: root }]).then((result) => {
      expect(names(result.files)).toEqual([
        'code/app.ts',
        'notizen/a.md',
        'notizen/tief/b.txt',
      ]);
      expect(result.missing).toEqual([]);
      expect(result.truncated).toBe(false);
    });
  });

  it('nimmt einzeln gewählte Dateien auf und meldet fehlende Quellen', async () => {
    const file = write('extra/liste.md');
    const result = await scanSources([
      { kind: 'file', path: file },
      { kind: 'folder', path: path.join(root, 'gibtsnicht') },
    ]);
    expect(names(result.files)).toEqual(['extra/liste.md']);
    expect(result.missing).toEqual([path.join(root, 'gibtsnicht')]);
  });

  it('zählt eine Datei aus überlappenden Quellen nur einmal', async () => {
    const file = write('a.md');
    const result = await scanSources([
      { kind: 'folder', path: root },
      { kind: 'file', path: file },
    ]);
    expect(result.files).toHaveLength(1);
  });

  it('folgt keinen Verknüpfungen aus dem Ordner hinaus', async () => {
    const outside = mkdtempSync(path.join(tmpdir(), 'localdesk-outside-'));
    writeFileSync(path.join(outside, 'geheim.md'), 'nicht einlesen');
    try {
      symlinkSync(outside, path.join(root, 'link'), 'junction');
    } catch {
      rmSync(outside, { recursive: true, force: true });
      return; // Verknüpfungen nicht erlaubt (Rechte) – dann gibt es nichts zu prüfen
    }
    write('eigen.md');
    const result = await scanSources([{ kind: 'folder', path: root }]);
    expect(names(result.files)).toEqual(['eigen.md']);
    rmSync(outside, { recursive: true, force: true });
  });
});

describe('Lesen', () => {
  it('liest UTF-8 und entfernt die Byte-Order-Mark', async () => {
    const file = write('a.md', '\uFEFFGrüße');
    const result = await readTextFile({ path: file, size: 10, mtime: 0 });
    expect(result).toMatchObject({ ok: true, text: 'Grüße', kind: 'markdown' });
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('liest alte Windows-Dateien (Windows-1252) mit Umlauten', () => {
    const bytes = new Uint8Array([0x47, 0x72, 0xfc, 0xdf, 0x65]); // „Grüße“
    expect(decodeText(bytes, 'text')).toEqual({
      ok: true,
      text: 'Grüße',
      kind: 'text',
    });
  });

  it('erkennt Binärdaten trotz Text-Endung', () => {
    expect(
      decodeText(new Uint8Array([0x50, 0x4b, 0x03, 0x00]), 'text'),
    ).toEqual({
      ok: false,
      reason: 'Keine Textdatei (Binärdaten)',
    });
  });

  it('überspringt zu große und unbekannte Dateien mit Grund', async () => {
    expect(
      await readTextFile({ path: 'C:\\a.md', size: 3 * 1024 * 1024, mtime: 0 }),
    ).toEqual({ ok: false, reason: 'Größer als 2 MB', hash: '' });
    expect(
      await readTextFile({ path: 'C:\\a.exe', size: 1, mtime: 0 }),
    ).toEqual({
      ok: false,
      reason: 'Dateiart wird nicht unterstützt',
      hash: '',
    });
  });
});
