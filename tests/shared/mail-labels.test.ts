import { describe, expect, it } from 'vitest';
import type { MailLabel } from '../../src/shared/mail';
import { checkLabelName, LABEL_NAME_MAX } from '../../src/shared/mail-labels';

const LABELS: MailLabel[] = [
  { id: 'INBOX', name: 'INBOX', type: 'system' },
  { id: 'Label_1', name: 'Rechnungen', type: 'user' },
];

const error = (input: unknown, ignoreId?: string) => {
  const result = checkLabelName(input, LABELS, ignoreId);
  return result.ok ? null : result.error;
};

describe('checkLabelName', () => {
  it('nimmt einen gewöhnlichen Namen und schneidet Leerzeichen ab', () => {
    expect(checkLabelName('  Reisen ', LABELS)).toEqual({
      ok: true,
      value: 'Reisen',
    });
    expect(checkLabelName('Arbeit/Projekt A', LABELS).ok).toBe(true);
    expect(checkLabelName('x'.repeat(LABEL_NAME_MAX), LABELS).ok).toBe(true);
  });

  it('lehnt leere, zu lange und fremde Eingaben ab', () => {
    expect(error('')).toContain('fehlt');
    expect(error('   ')).toContain('fehlt');
    expect(error(undefined)).toContain('fehlt');
    expect(error(42)).toContain('fehlt');
    expect(error('x'.repeat(LABEL_NAME_MAX + 1))).toContain(
      `höchstens ${LABEL_NAME_MAX}`,
    );
    expect(error('Zeile\neins')).toContain('unzulässige');
    expect(error('Tab\there')).toContain('unzulässige');
  });

  it('lehnt Namen ab, die Gmail selbst verwendet', () => {
    for (const name of [
      'inbox',
      'Sent',
      'DRAFT',
      'Trash',
      'spam',
      'STARRED',
      'unread',
      'Important',
      'all mail',
      'CATEGORY_SOCIAL',
      '[Gmail]/Alle Nachrichten',
      '[Google Mail]/Papierkorb',
    ]) {
      expect(error(name), name).toContain('Gmail selbst');
    }
  });

  it('lehnt vorhandene Namen ab – egal wie geschrieben', () => {
    expect(error('Rechnungen')).toContain('gibt es schon');
    expect(error(' RECHNUNGEN ')).toContain('gibt es schon');
  });

  it('erlaubt beim Umbenennen den eigenen Namen (nur andere Schreibweise)', () => {
    expect(checkLabelName('RECHNUNGEN', LABELS, 'Label_1').ok).toBe(true);
    expect(error('RECHNUNGEN', 'Label_2')).toContain('gibt es schon');
  });
});
