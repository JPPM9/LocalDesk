import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_HOSTS } from '../../src/main/mail/mail-fetch';
import { GITHUB_API_HOST, GITHUB_RAW_HOST } from '../../src/shared/github';

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

  it('enthält die Zusage zur eingeschränkten Nutzung von Google-Daten', () => {
    expect(privacy).toContain('Google API Services User Data Policy');
    expect(privacy).toContain('Limited Use');
  });
});
