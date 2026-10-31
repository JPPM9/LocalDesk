import { describe, expect, it } from 'vitest';
import { applyMailChangeList } from '../../src/main/mail/apply-changes';
import type { MailClient } from '../../src/main/mail/mail-client';
import type { MailChange, MailLabel } from '../../src/shared/mail';

function fakeClient(
  options: {
    labels?: MailLabel[];
    failCreate?: string;
    failApply?: (change: MailChange) => string | undefined;
  } = {},
) {
  const applied: MailChange[] = [];
  const created: string[] = [];
  const labels: MailLabel[] = options.labels ?? [
    { id: 'INBOX', name: 'INBOX', type: 'system' },
    { id: 'Label_1', name: 'Rechnungen', type: 'user' },
  ];
  const client = {
    labels: async () => labels,
    createLabel: async (name: string) => {
      if (options.failCreate) throw new Error(options.failCreate);
      created.push(name);
      return { id: `Neu_${created.length}`, name, type: 'user' as const };
    },
    apply: async (change: MailChange) => {
      const error = options.failApply?.(change);
      if (error) throw new Error(error);
      applied.push(change);
    },
  } as unknown as MailClient;
  return { client, applied, created };
}

const newLabel = (messageId: string, name: string): MailChange => ({
  kind: 'newLabel',
  messageId,
  name,
});

describe('applyMailChangeList', () => {
  it('legt ein neues Label einmal an und setzt es bei allen Mails', async () => {
    const { client, applied, created } = fakeClient();
    const result = await applyMailChangeList(client, [
      newLabel('m1', 'Versicherung'),
      newLabel('m2', 'versicherung'),
      { kind: 'star', messageId: 'm3', starred: true },
    ]);
    expect(result).toEqual({ applied: 3, failed: [] });
    expect(created).toEqual(['Versicherung']);
    expect(applied).toEqual([
      { kind: 'label', messageId: 'm1', labelId: 'Neu_1' },
      { kind: 'label', messageId: 'm2', labelId: 'Neu_1' },
      { kind: 'star', messageId: 'm3', starred: true },
    ]);
  });

  it('nimmt ein inzwischen vorhandenes eigenes Label, statt es doppelt anzulegen', async () => {
    const { client, applied, created } = fakeClient();
    await applyMailChangeList(client, [newLabel('m1', 'RECHNUNGEN')]);
    expect(created).toEqual([]);
    expect(applied).toEqual([
      { kind: 'label', messageId: 'm1', labelId: 'Label_1' },
    ]);
  });

  it('meldet ein gescheitertes Anlegen nur einmal und setzt trotzdem alles andere', async () => {
    const { client, applied } = fakeClient({ failCreate: 'Gmail sagt nein' });
    const result = await applyMailChangeList(client, [
      newLabel('m1', 'Versicherung'),
      newLabel('m2', 'Versicherung'),
      { kind: 'star', messageId: 'm3', starred: true },
    ]);
    expect(result).toEqual({ applied: 1, failed: ['Gmail sagt nein'] });
    expect(applied).toEqual([{ kind: 'star', messageId: 'm3', starred: true }]);
  });

  it('meldet Fehler einzelner Mails weiter einzeln', async () => {
    const { client } = fakeClient({
      failApply: (c) => (c.messageId === 'm2' ? 'Mail weg' : undefined),
    });
    const result = await applyMailChangeList(client, [
      { kind: 'star', messageId: 'm1', starred: true },
      { kind: 'star', messageId: 'm2', starred: true },
      { kind: 'star', messageId: 'm4', starred: true },
    ]);
    expect(result).toEqual({ applied: 2, failed: ['Mail weg'] });
  });

  it('legt höchstens 3 verschiedene neue Labels auf einmal an', async () => {
    const { client, created } = fakeClient();
    await expect(
      applyMailChangeList(client, [
        newLabel('m1', 'A'),
        newLabel('m2', 'B'),
        newLabel('m3', 'C'),
        newLabel('m4', 'D'),
      ]),
    ).rejects.toThrow('Höchstens 3 neue Labels');
    expect(created).toEqual([]);
    await expect(
      applyMailChangeList(client, [
        newLabel('m1', 'A'),
        newLabel('m2', 'a'),
        newLabel('m3', 'B'),
        newLabel('m4', 'C'),
      ]),
    ).resolves.toMatchObject({ applied: 4 });
  });
});
