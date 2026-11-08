import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_HOSTS } from '../../src/main/mail/mail-fetch';
import { GITHUB_API_HOST, GITHUB_RAW_HOST } from '../../src/shared/github';
import { WEB_SEARCH_HOST } from '../../src/shared/web';

const privacy = readFileSync('docs/privacy.md', 'utf8');

describe('Datenschutzerklärung', () => {
  it('nennt jede Adresse, die LocalDesk für Mail erreichen darf', () => {
    for (const host of MAIL_HOSTS) {
      expect(privacy, host).toContain(host);
    }
  });

  it('nennt die Hosts, über die Skills gesucht und geladen werden', () => {
    expect(privacy).toContain(GITHUB_RAW_HOST);
    expect(privacy).toContain(GITHUB_API_HOST);
  });

  it('beschreibt in beiden Sprachen, wann das Modell Webseiten liest und was die Seite sieht', () => {
    expect(privacy).toContain('Any web page');
    expect(privacy).toContain('“Internet” switch');
    expect(privacy).toContain('the site sees your IP address');
    expect(privacy).toContain('Beliebige Webseite');
    expect(privacy).toContain('Schalter „Internet“');
    expect(privacy).toContain('die Seite sieht deine IP-Adresse');
  });

  it('nennt den Suchdienst, an den Suchanfragen gehen, in beiden Sprachen', () => {
    expect(privacy).toContain(`(\`${WEB_SEARCH_HOST}\`)`);
    expect(privacy).toContain('Ollama web search');
    expect(privacy).toContain('“Search the web” checkbox');
    expect(privacy).toContain('your Ollama key');
    expect(privacy).toContain('Ollama-Websuche');
    expect(privacy).toContain('Haken „Im Web suchen“');
    expect(privacy).toContain('dein Ollama-Schlüssel');
  });

  it('beschreibt die Recherche (mehrere Suchen, Seiten aus den Treffern, nur nach „Starten“) in beiden Sprachen', () => {
    expect(privacy).toContain('A **research**');
    expect(privacy).toContain('after you click “Start”');
    expect(privacy).toContain('The notes are not stored');
    expect(privacy).toContain('Eine **Recherche**');
    expect(privacy).toContain('nach deinem Klick auf „Starten“');
    expect(privacy).toContain('Die Notizen werden nicht gespeichert');
  });

  it('beschreibt in beiden Sprachen, was von angehängten Tabellen gespeichert wird und woher das Modell sie sieht', () => {
    expect(privacy).toContain(
      'for tables you attach (CSV, TSV, Excel) it stores the',
    );
    expect(privacy).toContain(
      'the column names, a few rows and the results of the queries',
    );
    expect(privacy).toContain(
      'bei angehängten\n  Tabellen (CSV, TSV, Excel) die Tabelle',
    );
    expect(privacy).toContain(
      'die Spaltennamen, ein paar Zeilen und die Ergebnisse der Abfragen',
    );
  });

  it('enthält die Zusage zur eingeschränkten Nutzung von Google-Daten', () => {
    expect(privacy).toContain('Google API Services User Data Policy');
    expect(privacy).toContain('Limited Use');
  });
});
