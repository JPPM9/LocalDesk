import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_HOSTS } from '../../src/main/mail/mail-fetch';
import { GITHUB_RAW_HOST } from '../../src/shared/github';

const privacy = readFileSync('docs/privacy.md', 'utf8');

describe('Datenschutzerklärung', () => {
  it('nennt jede Adresse, die LocalDesk für Mail erreichen darf', () => {
    for (const host of MAIL_HOSTS) {
      expect(privacy, host).toContain(host);
    }
  });

  it('nennt den Host, von dem Skills geladen werden', () => {
    expect(privacy).toContain(GITHUB_RAW_HOST);
  });

  it('enthält die Zusage zur eingeschränkten Nutzung von Google-Daten', () => {
    expect(privacy).toContain('Google API Services User Data Policy');
    expect(privacy).toContain('Limited Use');
  });
});
