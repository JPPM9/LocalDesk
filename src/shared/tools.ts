import type {
  ChatMessage,
  ToolCallRecord,
  ToolCallStatus,
  ToolDefinition,
} from './api';

/** So viel Ergebnistext bekommt das Modell höchstens pro Aufruf (Kontext ist knapp). */
export const TOOL_RESULT_MAX = 20_000;

const TOOL_CALL_STATUSES: readonly ToolCallStatus[] = [
  'asking',
  'running',
  'done',
  'error',
  'denied',
  'cancelled',
];

/** Ein Tool eines MCP-Servers, wie es einem Chat zur Verfügung steht. */
export interface OfferedTool {
  serverId: string;
  serverName: string;
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  destructive: boolean;
  /** 'off' wird gar nicht erst angeboten. */
  permission: 'always' | 'ask';
  /**
   * Du darfst die Eingaben in der Rückfrage ändern (Erinnerung speichern) –
   * „Immer erlauben“ gibt es dafür nicht. Geprüft werden die Änderungen mit `checkArguments`.
   */
  editable?: {
    checkArguments: (args: unknown) => Record<string, unknown> | null;
  };
  /** Fragt jedes Mal nach – „Immer erlauben“ gibt es nicht (z. B. Änderungen in Gmail). */
  alwaysAsk?: boolean;
  /**
   * Verständliche Vorschau für die Rückfrage (z. B. welche Mail sich wie ändert).
   * Wirft sie, läuft das Werkzeug nicht – das Modell bekommt den Fehler.
   */
  describe?: (args: Record<string, unknown>) => Promise<string>;
}

/** Ein angebotenes Tool mit dem Namen, unter dem das Modell es kennt. */
export interface NamedTool extends OfferedTool {
  name: string;
}

/**
 * Vergibt eindeutige Namen für das Modell. Zwei Dateisystem-Server haben dieselben
 * Tool-Namen – der zweite bekommt dann „_2“ angehängt. Bei mehreren Servern steht
 * der Server-Name vorne in der Beschreibung, damit das Modell sie unterscheiden kann.
 */
export function nameTools(tools: OfferedTool[]): NamedTool[] {
  const used = new Set<string>();
  const multipleServers = new Set(tools.map((t) => t.serverId)).size > 1;
  return tools.map((tool) => {
    let name = tool.toolName;
    for (let n = 2; used.has(name); n++) name = `${tool.toolName}_${n}`;
    used.add(name);
    return {
      ...tool,
      name,
      description: multipleServers
        ? `[${tool.serverName}] ${tool.description}`
        : tool.description,
    };
  });
}

export function toToolDefinition(tool: NamedTool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };
}

/**
 * Die Nachrichten einer Tool-Runde für das Modell: erst „das wollte ich aufrufen“,
 * dann je Aufruf das Ergebnis.
 */
export function toolRoundMessages(calls: ToolCallRecord[]): ChatMessage[] {
  if (calls.length === 0) return [];
  return [
    {
      role: 'assistant',
      content: '',
      toolCalls: calls.map((c) => ({ name: c.name, arguments: c.arguments })),
    },
    ...calls.map((c): ChatMessage => ({
      role: 'tool',
      toolName: c.name,
      content: c.result ?? CANCELLED_RESULT,
    })),
  ];
}

export const DENIED_RESULT = 'Der Nutzer hat diesen Aufruf abgelehnt.';
export const CANCELLED_RESULT = 'Der Aufruf wurde abgebrochen.';

/** Kürzt Ergebnisse, die den Kontext des Modells sprengen würden. */
export function limitResult(text: string): string {
  if (text.length <= TOOL_RESULT_MAX) return text;
  return `${text.slice(0, TOOL_RESULT_MAX)}\n[… gekürzt, ${text.length - TOOL_RESULT_MAX} Zeichen ausgelassen]`;
}

/**
 * Aufrufe, die noch warten oder laufen, gelten als abgebrochen – z. B. wenn du
 * „Stopp“ drückst oder die App während einer Antwort beendet wurde.
 */
export function settleToolCalls(calls: ToolCallRecord[]): ToolCallRecord[] {
  return calls.map((c) =>
    c.status === 'asking' || c.status === 'running'
      ? { ...c, status: 'cancelled', result: c.result ?? CANCELLED_RESULT }
      : c,
  );
}

/** Kurzfassung der Argumente für die eingeklappte Zeile, z. B. den Dateipfad. */
export function summarizeArguments(args: Record<string, unknown>): string {
  const preferred = ['path', 'source', 'pattern', 'query'];
  const key =
    preferred.find((k) => typeof args[k] === 'string') ??
    Object.keys(args).find((k) => typeof args[k] === 'string');
  // Bei Pfaden ist das Ende (Dateiname) wichtiger als der Anfang.
  if (key) return shorten(args[key] as string, isPathKey(key));
  const paths = args.paths;
  if (Array.isArray(paths) && paths.every((p) => typeof p === 'string')) {
    return shorten(paths.join(', '), true);
  }
  return '';
}

function isPathKey(key: string): boolean {
  return ['path', 'source', 'destination'].includes(key);
}

function shorten(text: string, keepEnd: boolean, max = 60): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return keepEnd
    ? `…${oneLine.slice(-(max - 1))}`
    : `${oneLine.slice(0, max - 1)}…`;
}

/** Prüft gespeicherte Tool-Aufrufe – eine kaputte Zeile soll die App nicht stoppen. */
export function parseToolCalls(json: string | null): ToolCallRecord[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(isToolCallRecord);
}

function isToolCallRecord(value: unknown): value is ToolCallRecord {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Partial<ToolCallRecord>;
  return (
    typeof c.id === 'string' &&
    typeof c.round === 'number' &&
    typeof c.name === 'string' &&
    typeof c.toolName === 'string' &&
    typeof c.serverId === 'string' &&
    typeof c.serverName === 'string' &&
    typeof c.arguments === 'object' &&
    c.arguments !== null &&
    (TOOL_CALL_STATUSES as readonly unknown[]).includes(c.status)
  );
}
