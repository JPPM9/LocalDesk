import { describe, expect, it } from 'vitest';
import {
  chunkMarkdown,
  chunkText,
  embeddingText,
} from '../../src/main/rag/chunk';

const paragraph = (n: number) =>
  `Absatz ${n}: ` + 'Das ist ein Satz über Statistik. '.repeat(8).trim();

describe('chunkText', () => {
  it('lässt kurze Texte als einen Abschnitt', () => {
    expect(chunkText('  Hallo Welt.  ')).toEqual([
      { text: 'Hallo Welt.', start: 2, end: 15 },
    ]);
  });

  it('liefert für leeren Text nichts', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText(' \n\n ')).toEqual([]);
  });

  it('schneidet an Absätzen, wenn möglich', () => {
    const text = [1, 2, 3, 4, 5, 6].map(paragraph).join('\n\n');
    const chunks = chunkText(text, { size: 600, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.startsWith('Absatz')).toBe(true);
      expect(chunk.text.endsWith('Statistik.')).toBe(true);
    }
  });

  it('schneidet ohne Absätze am Satzende', () => {
    const text = 'Erster Satz hier. '.repeat(100);
    const chunks = chunkText(text, { size: 200, overlap: 0 });
    for (const chunk of chunks) expect(chunk.text.endsWith('.')).toBe(true);
  });

  it('überlappt benachbarte Abschnitte', () => {
    const words = Array.from({ length: 400 }, (_, i) => `wort${i}`).join(' ');
    const chunks = chunkText(words, { size: 300, overlap: 60 });
    for (let i = 1; i < chunks.length; i++) {
      const firstWord = chunks[i].text.split(' ')[0];
      // Das erste Wort eines Abschnitts steht auch im vorherigen.
      expect(chunks[i - 1].text).toContain(firstWord);
      expect(chunks[i].start).toBeLessThan(chunks[i - 1].end);
    }
  });

  it('deckt den ganzen Text ab und stimmt mit den Positionen überein', () => {
    const text = [1, 2, 3, 4, 5, 6, 7, 8].map(paragraph).join('\n\n');
    const chunks = chunkText(text, { size: 500, overlap: 100 });
    expect(chunks.at(-1)?.end).toBe(text.length);
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toContain(chunk.text);
      expect(chunk.text.length).toBeLessThanOrEqual(500);
    }
  });

  it('schneidet notfalls mitten im Wort (ohne Leerzeichen)', () => {
    const chunks = chunkText('x'.repeat(1000), { size: 300, overlap: 0 });
    expect(chunks.map((c) => c.text.length)).toEqual([300, 300, 300, 100]);
  });

  it('kommt immer voran, auch mit großem Überlapp', () => {
    const chunks = chunkText('a '.repeat(500), { size: 50, overlap: 49 });
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.at(-1)?.end).toBe(1000);
  });
});

const markdown = `# LocalDesk

Einleitung zur App.

## Ollama im Netzwerk

OLLAMA_HOST setzen.

## Wo liegen meine Daten?

Alles liegt in localdesk.db.

### Sichern

App schließen und Ordner kopieren.

## Code

\`\`\`bash
# kein Titel, nur ein Kommentar
npm start
\`\`\`
`;

describe('chunkMarkdown', () => {
  it('trennt an Überschriften, damit jeder Abschnitt ein Thema hat', () => {
    const chunks = chunkMarkdown(markdown);
    expect(chunks.map((c) => c.heading)).toEqual([
      'LocalDesk',
      'LocalDesk › Ollama im Netzwerk',
      'LocalDesk › Wo liegen meine Daten?',
      'LocalDesk › Wo liegen meine Daten? › Sichern',
      'LocalDesk › Code',
    ]);
    expect(chunks[2].text).toBe(
      '## Wo liegen meine Daten?\n\nAlles liegt in localdesk.db.',
    );
  });

  it('hält Positionen im Originaltext richtig', () => {
    for (const chunk of chunkMarkdown(markdown)) {
      expect(markdown.slice(chunk.start, chunk.end)).toContain(chunk.text);
    }
  });

  it('sieht # in Code-Blöcken nicht als Überschrift', () => {
    const code = chunkMarkdown(markdown).at(-1);
    expect(code?.text).toContain('# kein Titel');
    expect(code?.heading).toBe('LocalDesk › Code');
  });

  it('lässt reine Überschriften ohne Text weg', () => {
    const chunks = chunkMarkdown('# Teil 1\n## Kapitel\nText');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('Teil 1 › Kapitel');
  });

  it('zerlegt lange Kapitel weiter, jeder Teil behält die Überschrift', () => {
    const long = `## Lang\n\n${'Ein Satz über Mieten. '.repeat(200)}`;
    const chunks = chunkMarkdown(long, { size: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.heading === 'Lang')).toBe(true);
  });

  it('Text ohne Überschriften wird wie normaler Text zerlegt', () => {
    expect(chunkMarkdown('Nur Text.')).toEqual([
      { text: 'Nur Text.', start: 0, end: 9 },
    ]);
  });

  it('stellt beim Einbetten die Überschrift voran', () => {
    expect(
      embeddingText({ text: 'A', start: 0, end: 1, heading: 'X › Y' }),
    ).toBe('X › Y\n\nA');
    expect(embeddingText({ text: 'A', start: 0, end: 1 })).toBe('A');
  });
});
