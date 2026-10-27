import { describe, expect, it } from 'vitest';
import {
  extractDocx,
  extractPdf,
  htmlToMarkdown,
  joinTextItems,
} from '../../src/main/rag/extract';
import { makeDocx, makePdf } from './fixtures/documents';

describe('extractPdf', () => {
  it('liest Text Seite für Seite, mit Umlauten', async () => {
    const pages = await extractPdf(
      makePdf([
        ['Mietvertrag', 'Die Kündigungsfrist beträgt drei Monate.'],
        ['Seite zwei: Nebenkosten (jährlich).'],
      ]),
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('Mietvertrag');
    expect(pages[0]).toContain('Die Kündigungsfrist beträgt drei Monate.');
    expect(pages[1]).toBe('Seite zwei: Nebenkosten (jährlich).');
  });

  it('liefert leere Seiten bei einer PDF ohne Text (z. B. Scan)', async () => {
    expect(await extractPdf(makePdf([[]]))).toEqual(['']);
  });

  it('meldet kaputte Dateien als Fehler', async () => {
    await expect(
      extractPdf(new TextEncoder().encode('kein PDF')),
    ).rejects.toThrow();
  });
});

describe('joinTextItems', () => {
  it('setzt Zeilenenden und fügt getrennte Wörter wieder zusammen', () => {
    expect(
      joinTextItems([
        { str: 'Die Kündi-', hasEOL: true },
        { str: 'gung ist ', hasEOL: false },
        { str: 'schriftlich.', hasEOL: true },
        { str: 'Nord-', hasEOL: true },
        { str: 'Süd-Achse', hasEOL: true },
        { str: 42 },
      ]),
    ).toBe('Die Kündigung ist schriftlich.\nNord-\nSüd-Achse');
  });
});

describe('extractDocx', () => {
  it('macht aus Word-Überschriften Markdown-Überschriften', async () => {
    const markdown = await extractDocx(
      await makeDocx([
        { text: 'Arbeitsvertrag', style: 'Heading1' },
        { text: 'Urlaub', style: 'Heading2' },
        { text: 'Es gibt 30 Tage Urlaub & Sonderurlaub.' },
      ]),
    );
    expect(markdown).toBe(
      '# Arbeitsvertrag\n\n## Urlaub\n\nEs gibt 30 Tage Urlaub & Sonderurlaub.',
    );
  });

  it('meldet kaputte Dateien als Fehler', async () => {
    await expect(
      extractDocx(new TextEncoder().encode('kein Word')),
    ).rejects.toThrow();
  });
});

describe('htmlToMarkdown', () => {
  it('übersetzt Listen, Tabellen und Sonderzeichen', () => {
    expect(
      htmlToMarkdown(
        '<p>A &lt;b&gt; &amp; &#8364;</p><ul><li>eins</li><li></li><li>zwei</li></ul><table><tr><td>x</td><td>y</td></tr></table><p><img src="" />Bild</p>',
      ),
    ).toBe('A <b> & €\n\n- eins\n- zwei\n\nx | y |\n\nBild');
  });
});
