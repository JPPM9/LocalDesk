import type { Result } from './api';
import { tr } from './messages';
import type { TableCell } from './tables';

/**
 * Diagramme aus Tabellen (Werkzeug `table_chart`): eine Reihe aus Beschriftung und Zahl, als
 * Balken, Linie oder Kreis. Die Oberfläche zeichnet sie selbst als SVG – das Modell liefert nur
 * die Abfrage, nie Zeichencode.
 */

export type ChartType = 'bar' | 'line' | 'pie';
export const CHART_TYPES: readonly ChartType[] = ['bar', 'line', 'pie'];

/** Höchstens so viele Werte in Balken und Linie, im Kreis weniger (sonst unlesbar). */
export const CHART_MAX_POINTS = 50;
export const CHART_PIE_MAX_POINTS = 12;
export const CHART_LABEL_MAX = 40;
export const CHART_TITLE_MAX = 100;

export interface TableChart {
  type: ChartType;
  title: string;
  labels: string[];
  values: number[];
  /** Name der Wert-Spalte (Beschriftung der Achse). */
  valueName: string;
}

/** Eingaben des Modells für `table_chart`, geprüft. */
export interface ChartArguments {
  sql: string;
  type: ChartType;
  title: string;
}

export function checkChartArguments(args: unknown): ChartArguments | null {
  if (typeof args !== 'object' || args === null) return null;
  const { sql, type, title } = args as Record<string, unknown>;
  if (typeof sql !== 'string' || sql.trim() === '') return null;
  const kind = typeof type === 'string' ? type.trim().toLowerCase() : '';
  if (!(CHART_TYPES as readonly string[]).includes(kind)) return null;
  if (title !== undefined && title !== null && typeof title !== 'string') {
    return null;
  }
  return {
    sql,
    type: kind as ChartType,
    title: (title ?? '').replace(/\s+/g, ' ').trim().slice(0, CHART_TITLE_MAX),
  };
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Eine Zahl aus einer Zelle (Zahl oder Text wie „12,5“ nicht – nur echte Zahlen). */
function numberOf(cell: TableCell): number | null {
  return typeof cell === 'number' && Number.isFinite(cell) ? cell : null;
}

/**
 * Baut das Diagramm aus dem Ergebnis einer Abfrage: genau zwei Spalten (Beschriftung, Zahl), nicht
 * leer, nicht zu viele Zeilen, nur endliche Zahlen (beim Kreis nicht negativ und zusammen > 0).
 * Fehler haben fertigen Text für das Modell.
 */
export function buildChart(
  columns: string[],
  rows: TableCell[][],
  args: Pick<ChartArguments, 'type' | 'title'>,
): Result<TableChart> {
  if (columns.length !== 2) {
    return {
      ok: false,
      error: tr('chart.needTwoColumns', { count: columns.length }),
    };
  }
  if (rows.length === 0) return { ok: false, error: tr('chart.empty') };
  const max = args.type === 'pie' ? CHART_PIE_MAX_POINTS : CHART_MAX_POINTS;
  if (rows.length > max) {
    return {
      ok: false,
      error: tr('chart.tooMany', { count: rows.length, max }),
    };
  }
  const labels: string[] = [];
  const values: number[] = [];
  for (const [index, row] of rows.entries()) {
    const value = numberOf(row[1]);
    if (value === null) {
      return {
        ok: false,
        error: tr('chart.notNumber', { row: index + 1 }),
      };
    }
    labels.push(clip(row[0] === null ? '' : String(row[0]), CHART_LABEL_MAX));
    values.push(value);
  }
  if (
    args.type === 'pie' &&
    (values.some((v) => v < 0) || values.reduce((a, b) => a + b, 0) <= 0)
  ) {
    return { ok: false, error: tr('chart.pieValues') };
  }
  return {
    ok: true,
    value: {
      type: args.type,
      title: args.title,
      labels,
      values,
      valueName: clip(columns[1], CHART_LABEL_MAX),
    },
  };
}

/**
 * Ist das ein gültiges Diagramm? (Es kommt aus der gespeicherten Antwort – die Oberfläche
 * zeichnet nur, was diese Prüfung besteht.)
 */
export function isTableChart(value: unknown): value is TableChart {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Partial<TableChart>;
  if (
    !CHART_TYPES.includes(c.type as ChartType) ||
    typeof c.title !== 'string' ||
    typeof c.valueName !== 'string' ||
    !Array.isArray(c.labels) ||
    !Array.isArray(c.values) ||
    c.labels.length !== c.values.length ||
    c.labels.length === 0 ||
    c.labels.length > CHART_MAX_POINTS
  ) {
    return false;
  }
  return (
    c.labels.every((l) => typeof l === 'string') &&
    c.values.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}
