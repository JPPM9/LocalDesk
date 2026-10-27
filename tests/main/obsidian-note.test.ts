import { describe, expect, it } from 'vitest';
import { prepareObsidianNote } from '../../src/main/rag/obsidian-note';

describe('prepareObsidianNote', () => {
  it('nimmt den Datei-Kopf aus dem Text, behält seine Tags', () => {
    const note = prepareObsidianNote(
      '---\ntags: [statistik, "uni"]\nerstellt: 2026-10-27\n---\n# Median\nDer mittlere Wert.',
    );
    expect(note.text).toBe('# Median\nDer mittlere Wert.');
    expect(note.tags).toEqual(['statistik', 'uni']);
    expect(note.isMemory).toBe(false);
  });

  it('liest Tags als Liste und aus dem Text, ohne Überschriften und Zahlen', () => {
    const note = prepareObsidianNote(
      '---\ntags:\n  - lernen\n  - "#klausur"\n---\n## Abschnitt\nWichtig #prüfung/statistik, Aufgabe #3, Link https://x.de/#anker',
    );
    expect(note.tags).toEqual(['lernen', 'klausur', 'prüfung/statistik']);
  });

  it('macht Wiki-Links lesbar und entfernt Kommentare und Bilder', () => {
    const note = prepareObsidianNote(
      'Siehe [[Studium/Mittelwert]], [[Median#Definition]], [[Varianz|die Streuung]] ' +
        'und [[Notiz#^a1b2]].%% privat %%\n![[diagramm.png]]\n![[Kartoffelsuppe]]',
    );
    expect(note.text).toBe(
      'Siehe Mittelwert, Median › Definition, die Streuung und Notiz.\n\nKartoffelsuppe',
    );
  });

  it('erkennt LocalDesk-Erinnerungen', () => {
    expect(
      prepareObsidianNote(
        '---\ntags: [localdesk/erinnerung]\n---\nIch mag Tee.',
      ).isMemory,
    ).toBe(true);
  });

  it('lässt Notizen ohne Kopf unverändert', () => {
    expect(prepareObsidianNote('Nur Text.').text).toBe('Nur Text.');
  });
});
