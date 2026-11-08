import { tr } from '../../shared/messages';
import {
  buildChart,
  checkChartArguments,
  CHART_MAX_POINTS,
  CHART_PIE_MAX_POINTS,
  CHART_TYPES,
  type TableChart,
} from '../../shared/table-chart';
import { TABLES_SERVER, type TableCell } from '../../shared/tables';
import type { OfferedTool } from '../../shared/tools';
import type { DataWorker } from './data-client';
import type { LoadTable, QueryResult } from './sql-session';

/** So viele Zeilen einer Abfrage bekommt das Modell höchstens zu sehen. */
export const QUERY_MAX_ROWS = 50;

export const TABLE_QUERY_TOOL = 'table_query';
export const TABLE_CHART_TOOL = 'table_chart';

/** Prüft die Eingabe von `table_query`: „sql“ ist ein nicht leerer Text. */
export function checkQueryArguments(args: unknown): string | null {
  if (typeof args !== 'object' || args === null) return null;
  const { sql } = args as Record<string, unknown>;
  return typeof sql === 'string' && sql.trim() !== '' ? sql : null;
}

/**
 * Die beiden Werkzeuge für die Tabellen des Chats. Sie lesen nur (die Abfrage läuft nur lesend in
 * einem eigenen Thread) und stehen im Chat – darum ohne Rückfrage. Bei einem Server auf einem
 * anderen Rechner fragt trotzdem jeder Aufruf; `describe` zeigt dann die Abfrage.
 */
export function tableTools(): OfferedTool[] {
  const serverName = tr('tables.serverName');
  return [
    {
      serverId: TABLES_SERVER,
      serverName,
      toolName: TABLE_QUERY_TOOL,
      description: tr('sql.queryDescription', { max: QUERY_MAX_ROWS }),
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: tr('sql.sqlParam') },
        },
        required: ['sql'],
      },
      destructive: false,
      permission: 'always',
      describe: async (args) => {
        const sql = checkQueryArguments(args);
        if (sql === null) throw new Error(tr('sql.badArguments'));
        return sql;
      },
    },
    {
      serverId: TABLES_SERVER,
      serverName,
      toolName: TABLE_CHART_TOOL,
      description: tr('chart.description', {
        max: CHART_MAX_POINTS,
        pie: CHART_PIE_MAX_POINTS,
      }),
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: tr('sql.sqlParam') },
          type: {
            type: 'string',
            enum: [...CHART_TYPES],
            description: tr('chart.typeParam'),
          },
          title: { type: 'string', description: tr('chart.titleParam') },
        },
        required: ['sql', 'type'],
      },
      destructive: false,
      permission: 'always',
      describe: async (args) => {
        const checked = checkChartArguments(args);
        if (!checked) throw new Error(tr('chart.badArguments'));
        return `${checked.type}: ${checked.sql}`;
      },
    },
  ];
}

/** Was ein Werkzeug zurückgibt: der Text fürs Modell, bei `table_chart` dazu das Diagramm. */
export interface TableToolResult {
  text: string;
  chart?: TableChart;
}

/**
 * Die Tabellen dieser Antwort in einem Hintergrund-Thread. Geladen wird erst beim ersten Aufruf
 * (große Tabellen kosten Zeit) – und neu, wenn der Thread nach einer Zeitüberschreitung neu
 * gestartet wurde.
 */
export class TableRunner {
  constructor(
    private readonly worker: DataWorker,
    /** Die abfragbaren Tabellen mit ihren Daten, frisch aus der Datenbank. */
    private readonly tables: () => LoadTable[],
  ) {}

  private async run(sql: string, maxRows: number): Promise<QueryResult> {
    if (!this.worker.loaded) {
      const loaded = await this.worker.load(this.tables());
      if (!loaded.ok) throw new Error(loaded.error);
    }
    const result = await this.worker.query(sql, maxRows);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  }

  /** Führt eines der Werkzeuge aus; wirft mit fertigem Text bei Fehlern. */
  async call(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<TableToolResult> {
    if (toolName === TABLE_CHART_TOOL) {
      const checked = checkChartArguments(args);
      if (!checked) throw new Error(tr('chart.badArguments'));
      const result = await this.run(checked.sql, QUERY_MAX_ROWS);
      // Zu viele Werte sind ein Fehler für das Modell – nicht stillschweigend gekürzt.
      if (result.more) {
        throw new Error(
          tr('chart.tooMany', {
            count: `${QUERY_MAX_ROWS}+`,
            max:
              checked.type === 'pie' ? CHART_PIE_MAX_POINTS : CHART_MAX_POINTS,
          }),
        );
      }
      const built = buildChart(result.columns, result.rows, checked);
      if (!built.ok) throw new Error(built.error);
      const chart = built.value;
      return {
        text: [
          tr('chart.done', {
            title: chart.title || '–',
            type: chart.type,
            count: chart.values.length,
          }),
          resultText(result),
        ].join('\n'),
        chart,
      };
    }
    const sql = checkQueryArguments(args);
    if (sql === null) throw new Error(tr('sql.badArguments'));
    return { text: resultText(await this.run(sql, QUERY_MAX_ROWS)) };
  }

  close(): void {
    this.worker.close();
  }
}

function cell(value: TableCell): string {
  if (value === null) return 'NULL';
  // Eine Zeile pro Datensatz, und „|“ soll keine Spalte vortäuschen.
  return String(value).replace(/\s+/g, ' ').replaceAll('|', '/').trim();
}

/**
 * Das Ergebnis einer Abfrage als Text: gerahmt als Daten (die Zellen stammen aus deiner Datei und
 * dürfen nicht als Anweisung gelten), Spalten durch „ | “ getrennt.
 */
export function resultText(result: QueryResult): string {
  if (result.rows.length === 0) return tr('sql.noRows');
  // Der Rahmen soll nicht von einer Zelle „geschlossen“ werden können.
  const body = [
    result.columns.map((c) => cell(c)).join(' | '),
    ...result.rows.map((row) => row.map(cell).join(' | ')),
  ]
    .join('\n')
    .replaceAll('TABLE>>>', 'TABLE> >>');
  return [
    tr('sql.frame'),
    tr('sql.resultInfo', {
      rows: result.rows.length,
      columns: result.columns.length,
    }),
    `<<<TABLE\n${body}\nTABLE>>>`,
    ...(result.more ? [tr('sql.more', { max: QUERY_MAX_ROWS })] : []),
  ].join('\n');
}
