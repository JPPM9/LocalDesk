import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_HOSTS } from '../../src/main/mail/mail-fetch';

const privacy = readFileSync('docs/privacy.md', 'utf8');

describe('Datenschutzerklärung', () => {
  it('nennt jede Adresse, die LocalDesk für Mail erreichen darf', () => {
    for (const host of MAIL_HOSTS) {
      expect(privacy, host).toContain(host);
    }
  });

  it('enthält die Zusage zur eingeschränkten Nutzung von Google-Daten', () => {
    expect(privacy).toContain('Google API Services User Data Policy');
    expect(privacy).toContain('Limited Use');
  });
});
