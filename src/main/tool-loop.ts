import type {
  ChatRequest,
  ChatStats,
  ChatStreamEvent,
  ModelToolCall,
  ToolCallRecord,
  ToolAnswer,
} from '../shared/api';
import { combineStats } from '../shared/chat';
import {
  DENIED_RESULT,
  limitResult,
  nameTools,
  toolRoundMessages,
  toToolDefinition,
  type NamedTool,
  type OfferedTool,
} from '../shared/tools';
import type { Provider } from './providers/provider';

/** Vereinbart: höchstens so viele Tool-Runden pro Antwort. */
export const MAX_TOOL_ROUNDS = 8;

/** Hinweis, wenn das Modell gar keinen Antworttext geschrieben hat. */
export const EMPTY_ANSWER =
  'Das Modell hat keine Antwort geschrieben – vermutlich wollte es ein Werkzeug falsch aufrufen. Bitte noch einmal fragen oder ein anderes Modell wählen.';

export interface ToolResult {
  text: string;
  isError: boolean;
}

/** Was die Schleife von außen braucht – im Test nachgebaut, in der App die MCP-Server. */
export interface ToolRuntime {
  /** Tools, die gerade zur Verfügung stehen (ohne „aus“). Wird jede Runde neu gefragt. */
  tools(): OfferedTool[];
  call(
    tool: NamedTool,
    args: Record<string, unknown>,
    signal: AbortSignal,
    /** Kennung des Aufrufs (z. B. für Sicherungen zum Rückgängigmachen). */
    callId: string,
  ): Promise<ToolResult>;
  /** Fragt dich im Chat; liefert „deny“, wenn die Antwort vorher gestoppt wird. */
  ask(call: ToolCallRecord): Promise<ToolAnswer>;
  allowAlways(tool: NamedTool): void;
}

interface AnswerOptions {
  provider: Provider;
  request: ChatRequest;
  requestId: string;
  runtime: ToolRuntime;
  emit: (event: ChatStreamEvent) => void;
  signal: AbortSignal;
  newId: () => string;
  maxRounds?: number;
}

/**
 * Eine Antwort, gegebenenfalls über mehrere Runden: Will das Modell Tools benutzen,
 * führt LocalDesk sie aus (nach Freigabe) und fragt das Modell mit den Ergebnissen
 * erneut. Nach `maxRounds` Tool-Runden bekommt das Modell keine Tools mehr angeboten
 * und muss mit dem antworten, was es hat.
 * Wirft bei Abbruch oder Verbindungsfehlern – das behandelt der Aufrufer.
 */
export async function runAnswer({
  provider,
  request,
  requestId,
  runtime,
  emit,
  signal,
  newId,
  maxRounds = MAX_TOOL_ROUNDS,
}: AnswerOptions): Promise<void> {
  const messages = [...request.messages];
  const stats: ChatStats[] = [];
  const written = { content: false, thinking: false };

  for (let round = 1; ; round++) {
    const tools = round <= maxRounds ? nameTools(runtime.tools()) : [];
    const byName = new Map(tools.map((t) => [t.name, t]));
    const wanted: ModelToolCall[] = [];
    const startedThisRound = { content: false, thinking: false };

    const roundRequest: ChatRequest = {
      ...request,
      messages,
      ...(tools.length > 0 && { tools: tools.map(toToolDefinition) }),
    };
    for await (const chunk of provider.chat(roundRequest, signal)) {
      if (chunk.type === 'tool-calls') {
        wanted.push(...chunk.calls);
      } else if (chunk.type === 'done') {
        if (chunk.stats) stats.push(chunk.stats);
      } else {
        // Text einer späteren Runde mit Leerzeile vom vorherigen trennen.
        if (written[chunk.type] && !startedThisRound[chunk.type]) {
          emit({ requestId, type: chunk.type, text: '\n\n' });
        }
        written[chunk.type] = true;
        startedThisRound[chunk.type] = true;
        emit({ requestId, ...chunk });
      }
    }

    if (wanted.length === 0 || tools.length === 0) {
      // Kein einziges Wort Antwort (z. B. wollte das Modell ein Werkzeug aufrufen,
      // das es nicht gibt, und Ollama hat den Aufruf verworfen): Hinweis statt leerer Blase.
      if (!written.content) {
        emit({ requestId, type: 'error', error: EMPTY_ANSWER });
        return;
      }
      emit({ requestId, type: 'done', stats: combineStats(stats) });
      return;
    }

    const records: ToolCallRecord[] = [];
    for (const call of wanted) {
      records.push(
        await runToolCall(call, round, byName.get(call.name), {
          requestId,
          runtime,
          emit,
          signal,
          newId,
        }),
      );
    }
    messages.push(...toolRoundMessages(records));
  }
}

async function runToolCall(
  call: ModelToolCall,
  round: number,
  tool: NamedTool | undefined,
  context: Pick<
    AnswerOptions,
    'requestId' | 'runtime' | 'emit' | 'signal' | 'newId'
  >,
): Promise<ToolCallRecord> {
  const { requestId, runtime, emit, signal } = context;
  let record: ToolCallRecord = {
    id: context.newId(),
    round,
    name: call.name,
    toolName: tool?.toolName ?? call.name,
    serverId: tool?.serverId ?? '',
    serverName: tool?.serverName ?? '',
    arguments: call.arguments,
    status: 'running',
    ...(tool?.destructive && { destructive: true }),
    ...(tool?.alwaysAsk && { alwaysAsk: true }),
  };
  const update = (patch: Partial<ToolCallRecord>) => {
    record = { ...record, ...patch };
    emit({ requestId, type: 'tool-call', call: record });
  };

  // Ein Tool, das nicht angeboten wurde (ausgeschaltet oder erfunden), läuft nie.
  if (!tool) {
    update({
      status: 'error',
      result: `Das Tool „${call.name}“ gibt es nicht oder es ist ausgeschaltet.`,
    });
    return record;
  }

  let args = call.arguments;
  if (tool.permission === 'ask') {
    // Erst prüfen und verständlich beschreiben – Unsinn erreicht dich gar nicht.
    let preview: string | undefined;
    if (tool.describe) {
      try {
        preview = await tool.describe(args);
      } catch (error) {
        signal.throwIfAborted();
        update({
          status: 'error',
          result: error instanceof Error ? error.message : String(error),
        });
        return record;
      }
      signal.throwIfAborted();
    }
    update({ status: 'asking', ...(preview && { preview }) });
    const answer = await runtime.ask(record);
    signal.throwIfAborted();
    if (answer.decision === 'deny') {
      update({ status: 'denied', result: DENIED_RESULT });
      return record;
    }
    // Geänderte Eingaben gelten nur bei bearbeitbaren Werkzeugen – und nur geprüft.
    if (tool.editable && answer.arguments) {
      const checked = tool.editable.checkArguments(answer.arguments);
      if (!checked) {
        update({
          status: 'error',
          result: 'Ungültige Eingabe in der Rückfrage.',
        });
        return record;
      }
      args = checked;
      update({ arguments: args });
    }
    // „Immer erlauben“ gibt es bei bearbeitbaren Werkzeugen nicht.
    if (answer.decision === 'always' && !tool.editable && !tool.alwaysAsk) {
      runtime.allowAlways(tool);
    }
  }

  update({ status: 'running' });
  let result: ToolResult;
  try {
    result = await runtime.call(tool, args, signal, record.id);
  } catch (error) {
    signal.throwIfAborted();
    result = {
      text: error instanceof Error ? error.message : String(error),
      isError: true,
    };
  }
  signal.throwIfAborted();
  update({
    status: result.isError ? 'error' : 'done',
    result: limitResult(result.text),
  });
  return record;
}
