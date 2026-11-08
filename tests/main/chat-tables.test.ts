import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrate, openDatabase } from '../../src/main/db/database';
import {
  ChatRepository,
  type StoredTable,
} from '../../src/main/db/chat-repository';
import { PendingTables } from '../../src/main/data/pending-tables';
import { readChatTable } from '../../src/main/chat-tables';
import type { DataWorker } from '../../src/main/data/data-client';
import type { MessageRecord } from '../../src/shared/api';
import {
  checkTableInputs,
  TABLE_MAX_BYTES,
  type ParsedTable,
} from '../../src/shared/tables';

const userMessage = (id: string): MessageRecord => ({
  id,
  role: 'user',
  content: 'Auswerten',
  thinking: '',
  status: 'done',
});

const table = (id: string, sqlName: string, name = `${sqlName}.csv`) =>
  ({
    id,
    name,
    sqlName,
    columns: [
      { name: 'stadt', type: 'text' },
      { name: 'umsatz', type: 'real' },
    ],
    rows: [
      ['Köln', 12.5],
      ['Bonn', null],
    ],
  }) satisfies StoredTable;

describe('Tabellen in Nachrichten (ChatRepository)', () => {
  let db: DatabaseSync;
  let repo: ChatRepository;
  const count = () =>
    (
      db.prepare('SELECT COUNT(*) AS n FROM message_tables').get() as {
        n: number;
      }
    ).n;

  beforeEach(() => {
    db = openDatabase(':memory:');
    repo = new ChatRepository(db);
    repo.createChat({ id: 'c1', title: 'x', model: 'm' });
    repo.appendMessage('c1', userMessage('u1'));
    repo.addTables('u1', [
      table('t-eins', 'umsatz'),
      table('t-zwei', 'kosten'),
    ]);
  });

  it('getChat liefert Name, SQL-Name und Größe – ohne die Daten', () => {
    const [user] = repo.getChat('c1')!.messages;
    expect(user.tables).toEqual([
      {
        id: 't-eins',
        name: 'umsatz.csv',
        sqlName: 'umsatz',
        rows: 2,
        columns: 2,
      },
      {
        id: 't-zwei',
        name: 'kosten.csv',
        sqlName: 'kosten',
        rows: 2,
        columns: 2,
      },
    ]);
    expect(JSON.stringify(user)).not.toContain('Köln');
  });

  it('getTable holt Spalten und Zeilen unverändert zurück', () => {
    const stored = repo.getTable('t-eins')!;
    expect(stored.columns).toEqual(table('t-eins', 'umsatz').columns);
    expect(stored.rows).toEqual([
      ['Köln', 12.5],
      ['Bonn', null],
    ]);
    expect(repo.getTable('gibt-es-nicht')).toBeNull();
  });

  it('tablesOfChat liefert die letzten Tabellen, die ältesten zuerst', () => {
    repo.appendMessage('c1', userMessage('u2'));
    repo.addTables('u2', [table('t-drei', 'plan'), table('t-vier', 'ist')]);
    expect(repo.tablesOfChat('c1', 3).map((t) => t.id)).toEqual([
      't-zwei',
      't-drei',
      't-vier',
    ]);
    expect(repo.tablesOfChat('c1', 10)).toHaveLength(4);
  });

  it('tableSqlNames und Tabellen anderer Chats', () => {
    repo.createChat({ id: 'c2', title: 'y', model: 'm' });
    repo.appendMessage('c2', userMessage('u3'));
    repo.addTables('u3', [table('t-fremd', 'fremd')]);
    expect(repo.tableSqlNames('c1').sort()).toEqual(['kosten', 'umsatz']);
    expect(repo.tablesOfChat('c1', 10).map((t) => t.id)).not.toContain(
      't-fremd',
    );
    expect(repo.getChat('c1')!.messages[0].tables).toHaveLength(2);
  });

  it('„Bearbeiten“ (truncateFrom) und Chat löschen nehmen die Tabellen mit', () => {
    repo.appendMessage('c1', userMessage('u2'));
    repo.addTables('u2', [table('t-drei', 'plan')]);
    expect(count()).toBe(3);
    expect(repo.truncateFrom('c1', 'u2')).toBe(true);
    expect(count()).toBe(2);
    expect(repo.getTable('t-drei')).toBeNull();
    repo.deleteChat('c1');
    expect(count()).toBe(0);
  });

  it('bringt eine Datenbank von vor den Tabellen ohne Datenverlust auf den neuen Stand', () => {
    const old = new DatabaseSync(':memory:');
    migrate(old, 21);
    old.exec('PRAGMA foreign_keys = ON');
    old
      .prepare(
        "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES ('alt', 'Alt', 'm', 1, 1)",
      )
      .run();
    old
      .prepare(
        "INSERT INTO messages (id, chat_id, position, role, content, thinking, status, created_at) VALUES ('m', 'alt', 0, 'user', 'Hallo', '', 'done', 1)",
      )
      .run();
    migrate(old);
    const alt = new ChatRepository(old);
    const [message] = alt.getChat('alt')!.messages;
    expect(message).toMatchObject({ content: 'Hallo' });
    expect(message).not.toHaveProperty('tables');
  });
});

describe('PendingTables', () => {
  const sample: ParsedTable & { name: string } = {
    name: 'a.csv',
    columns: [{ name: 'x', type: 'integer' }],
    rows: [[1]],
  };

  it('take gibt die Tabelle einmal heraus', () => {
    const pending = new PendingTables();
    const id = pending.add(sample);
    expect(pending.take(id)).toEqual(sample);
    expect(pending.take(id)).toBeNull();
  });

  it('verfällt nach der Frist', () => {
    let now = 0;
    const pending = new PendingTables(1_000, 4, () => now);
    const id = pending.add(sample);
    now = 999;
    expect(pending.size).toBe(1);
    now = 1_000;
    expect(pending.take(id)).toBeNull();
    expect(pending.size).toBe(0);
  });

  it('behält höchstens so viele und wirft die ältesten weg', () => {
    const pending = new PendingTables(60_000, 2);
    const a = pending.add(sample);
    const b = pending.add(sample);
    const c = pending.add(sample);
    expect(pending.size).toBe(2);
    expect(pending.take(a)).toBeNull();
    expect(pending.take(b)).not.toBeNull();
    expect(pending.take(c)).not.toBeNull();
  });

  it('takeAll nimmt alles oder nichts', () => {
    const pending = new PendingTables();
    const a = pending.add(sample);
    const b = pending.add(sample);
    expect(pending.takeAll([a, 'fehlt'])).toBeNull();
    expect(pending.size).toBe(2);
    expect(pending.takeAll([a, b])).toHaveLength(2);
    expect(pending.size).toBe(0);
  });

  it('discard wirft eine Tabelle weg', () => {
    const pending = new PendingTables();
    const id = pending.add(sample);
    pending.discard(id);
    expect(pending.take(id)).toBeNull();
  });
});

describe('checkTableInputs', () => {
  it('ohne Angabe gibt es keine Tabellen', () => {
    expect(checkTableInputs(undefined, 3)).toEqual({ ok: true, value: [] });
  });

  it('nimmt Nummern an und lehnt Falsches ab', () => {
    expect(checkTableInputs([{ id: 'abcdefgh-1234' }], 3)).toEqual({
      ok: true,
      value: [{ id: 'abcdefgh-1234' }],
    });
    expect(checkTableInputs('x', 3).ok).toBe(false);
    expect(checkTableInputs([null], 3).ok).toBe(false);
    expect(checkTableInputs([{ id: 5 }], 3).ok).toBe(false);
    expect(checkTableInputs([{ id: 'kurz' }], 3).ok).toBe(false);
    expect(checkTableInputs([{ id: '../../etc/passwd' }], 3).ok).toBe(false);
  });

  it('lehnt doppelte Nummern und zu viele Tabellen ab', () => {
    const id = { id: 'abcdefgh-1234' };
    expect(checkTableInputs([id, id], 3).ok).toBe(false);
    const many = [1, 2, 3, 4].map((n) => ({ id: `abcdefgh-000${n}` }));
    expect(checkTableInputs(many, 3).ok).toBe(false);
    expect(checkTableInputs(many.slice(0, 2), 1).ok).toBe(false);
    expect(checkTableInputs([], 0).ok).toBe(true);
  });
});

describe('readChatTable', () => {
  const fakeWorker = (
    result: Awaited<ReturnType<DataWorker['read']>>,
  ): { worker: DataWorker; closed: () => boolean } => {
    let closed = false;
    const worker = {
      read: async () => result,
      close: () => {
        closed = true;
      },
    } as unknown as DataWorker;
    return { worker, closed: () => closed };
  };
  const built = {
    ok: true as const,
    value: {
      noHeader: false,
      columns: [{ name: 'a', type: 'integer' as const }],
      rows: [[1], [2], [3]],
    },
  };

  it('liest, merkt sich die Tabelle und gibt nur Nummer und Größe zurück', async () => {
    const pending = new PendingTables();
    const { worker, closed } = fakeWorker(built);
    const result = await readChatTable(
      'C:\\daten\\Umsatz.csv',
      new Uint8Array(3),
      () => worker,
      pending,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      name: 'Umsatz.csv',
      rows: 3,
      columns: 1,
    });
    expect(JSON.stringify(result.value)).not.toContain('"rows":[');
    expect(pending.take(result.value.id)).toMatchObject({ name: 'Umsatz.csv' });
    expect(closed()).toBe(true);
  });

  it('lehnt falsche Eingaben, andere Endungen und zu große Dateien ab – ohne Thread', async () => {
    let started = 0;
    const make = () => {
      started++;
      return fakeWorker(built).worker;
    };
    const pending = new PendingTables();
    expect((await readChatTable(5, new Uint8Array(1), make, pending)).ok).toBe(
      false,
    );
    expect((await readChatTable('a.csv', 'text', make, pending)).ok).toBe(
      false,
    );
    const wrong = await readChatTable(
      'a.pdf',
      new Uint8Array(1),
      make,
      pending,
    );
    expect(wrong.ok).toBe(false);
    const big = await readChatTable(
      'a.csv',
      new Uint8Array(TABLE_MAX_BYTES + 1),
      make,
      pending,
    );
    expect(big.ok).toBe(false);
    expect(started).toBe(0);
    expect(pending.size).toBe(0);
  });

  it('reicht den Fehler des Lesens durch und schließt den Thread trotzdem', async () => {
    const pending = new PendingTables();
    const { worker, closed } = fakeWorker({ ok: false, error: 'kaputt' });
    const result = await readChatTable(
      'a.xlsx',
      new Uint8Array(3),
      () => worker,
      pending,
    );
    expect(result).toEqual({ ok: false, error: 'kaputt' });
    expect(closed()).toBe(true);
    expect(pending.size).toBe(0);
  });
});
