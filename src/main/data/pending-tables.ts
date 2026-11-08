import { randomUUID } from 'node:crypto';
import type { ParsedTable } from '../../shared/tables';

/** Eine gelesene, noch nicht gesendete Tabelle. */
export interface PendingTable extends ParsedTable {
  name: string;
}

/** So lange bleibt eine angehängte Tabelle im Hauptprozess, wenn die Nachricht nicht gesendet wird. */
export const PENDING_TABLE_TTL_MS = 30 * 60_000;
/** So viele gelesene Tabellen warten höchstens gleichzeitig (die ältesten fallen weg). */
export const PENDING_TABLE_MAX = 4;

/**
 * Hält gelesene Tabellen bis zum Senden der Nachricht: Die Oberfläche bekommt nur eine Nummer
 * (die Daten wären zu groß für jeden Weg hin und zurück). Wer die Nachricht nicht sendet oder die
 * Tabelle wieder entfernt, lässt sie nach einer Weile verfallen.
 */
export class PendingTables {
  private readonly items = new Map<
    string,
    { table: PendingTable; expires: number }
  >();

  constructor(
    private readonly ttlMs = PENDING_TABLE_TTL_MS,
    private readonly max = PENDING_TABLE_MAX,
    private readonly now: () => number = Date.now,
  ) {}

  add(table: PendingTable): string {
    this.prune();
    while (this.items.size >= this.max) {
      const oldest = this.items.keys().next().value;
      if (oldest === undefined) break;
      this.items.delete(oldest);
    }
    const id = randomUUID();
    this.items.set(id, { table, expires: this.now() + this.ttlMs });
    return id;
  }

  /** Holt die Tabelle und nimmt sie aus dem Speicher (null = gibt es nicht mehr). */
  take(id: string): PendingTable | null {
    this.prune();
    const item = this.items.get(id);
    if (!item) return null;
    this.items.delete(id);
    return item.table;
  }

  /** Holt alle Tabellen auf einmal – fehlt eine, bleibt alles liegen und das Ergebnis ist null. */
  takeAll(ids: string[]): PendingTable[] | null {
    this.prune();
    const tables: PendingTable[] = [];
    for (const id of ids) {
      const item = this.items.get(id);
      if (!item) return null;
      tables.push(item.table);
    }
    for (const id of ids) this.items.delete(id);
    return tables;
  }

  discard(id: string): void {
    this.items.delete(id);
  }

  get size(): number {
    this.prune();
    return this.items.size;
  }

  private prune(): void {
    const now = this.now();
    for (const [id, item] of this.items) {
      if (item.expires <= now) this.items.delete(id);
    }
  }
}
