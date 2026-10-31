import type { MailChange, MailLabel } from '../../shared/mail';
import { NEW_LABELS_MAX } from '../../shared/mail-labels';
import { isSortableLabel } from '../../shared/mail-sorting';
import { tr } from '../../shared/messages';
import type { MailClient } from './mail-client';

/**
 * Führt die bestätigten Änderungen nacheinander aus. Ein neues Label („newLabel“)
 * wird einmal angelegt – gibt es den Namen inzwischen als eigenes Label, wird
 * dieses genommen – und dann bei jeder Mail gesetzt, die es braucht. Scheitert das
 * Anlegen, gilt der Fehler einmal (nicht je Mail).
 */
export async function applyMailChangeList(
  client: MailClient,
  changes: MailChange[],
): Promise<{ applied: number; failed: string[] }> {
  const names = new Set<string>();
  for (const change of changes) {
    if (change.kind === 'newLabel') names.add(change.name.toLowerCase());
  }
  if (names.size > NEW_LABELS_MAX) {
    throw new Error(tr('mail.tooManyNewLabels', { max: NEW_LABELS_MAX }));
  }

  let known: MailLabel[] | null = null;
  const resolved = new Map<string, MailLabel | Error>();
  const resolve = async (name: string): Promise<MailLabel> => {
    const key = name.toLowerCase();
    const cached = resolved.get(key);
    if (cached instanceof Error) throw cached;
    if (cached) return cached;
    try {
      known ??= await client.labels();
      const label =
        known.find((l) => isSortableLabel(l) && l.name.toLowerCase() === key) ??
        (await client.createLabel(name));
      resolved.set(key, label);
      return label;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      resolved.set(key, failure);
      throw failure;
    }
  };

  let applied = 0;
  const failed: string[] = [];
  const reported = new Set<Error>();
  for (const change of changes) {
    try {
      await client.apply(
        change.kind === 'newLabel'
          ? {
              kind: 'label',
              messageId: change.messageId,
              labelId: (await resolve(change.name)).id,
            }
          : change,
      );
      applied++;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      // Dasselbe gescheiterte Anlegen nur einmal melden.
      if ([...resolved.values()].includes(failure)) {
        if (reported.has(failure)) continue;
        reported.add(failure);
      }
      failed.push(failure.message);
    }
  }
  return { applied, failed };
}
