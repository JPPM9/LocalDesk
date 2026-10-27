import type { ChatMessage, SourceRef, ToolDefinition } from './api';

/**
 * Wie voll ist das Kontextfenster des Modells? Vor dem Senden kann LocalDesk nur
 * schätzen (Ollama hat keinen Token-Zähler); nach jeder Antwort meldet Ollama die
 * genaue Zahl der Eingabe-Tokens.
 */

/** Ollama-Standard, wenn nichts eingestellt ist (gemessen mit Ollama 0.40.11). */
export const OLLAMA_DEFAULT_CONTEXT = 4096;
/** So viel Platz sollte für die Antwort frei bleiben. */
export const ANSWER_RESERVE = 1024;
/**
 * Zeichen pro Token, gemessen mit qwen3:14b über Ollama (Eingabe-Tokens der
 * Antworten nachgerechnet): Text ~4, Tool-Beschreibungen (JSON) ~5,5 – mit 3,5
 * für alles lag die Schätzung bis zu 50 % zu hoch und meldete Fehlalarm.
 */
const CHARS_PER_TOKEN = 4;
const JSON_CHARS_PER_TOKEN = 5.5;

export function estimateTokens(
  text: string,
  charsPerToken = CHARS_PER_TOKEN,
): number {
  return Math.ceil(text.length / charsPerToken);
}

export type ContextPart =
  | 'memory'
  | 'instructions'
  | 'history'
  | 'knowledge'
  | 'tools';

/** Auszüge mit Hinweistext, wenn noch keine Wissenssuche gelaufen ist: 6 × ~1500 Zeichen. */
const TYPICAL_KNOWLEDGE_CHARS = 6 * 1500 + 300;

export interface ContextInput {
  /** Der Erinnerungs-Teil der System-Nachricht (leer = keine). */
  memoryText: string;
  /** Projekt-Anweisungen und Systemprompt. */
  instructions: string;
  /** Verlauf, wie er ans Modell geht (inkl. Tool-Runden). */
  history: ChatMessage[];
  /** Durchsucht dieser Chat Wissen? Dann kommen Auszüge zur nächsten Frage dazu. */
  knowledgeActive: boolean;
  /** Auszüge der letzten Antwort – Anhaltspunkt für die nächste. */
  lastSources: Pick<SourceRef, 'text'>[] | undefined;
  /** Die Tool-Beschreibungen, wie sie ans Modell gehen. */
  tools: ToolDefinition[];
}

/** Schätzt, wie viel jeder Teil der nächsten Anfrage vom Kontext belegt. */
export function estimateContextParts(
  input: ContextInput,
): Record<ContextPart, number> {
  const history = input.history.reduce(
    (sum, m) =>
      sum +
      estimateTokens(m.content) +
      (m.toolCalls ? estimateTokens(JSON.stringify(m.toolCalls)) : 0) +
      4, // Rolle und Trennzeichen pro Nachricht
    0,
  );
  const knowledge = !input.knowledgeActive
    ? 0
    : input.lastSources && input.lastSources.length > 0
      ? estimateTokens(input.lastSources.map((s) => s.text).join('\n\n')) + 90
      : Math.ceil(TYPICAL_KNOWLEDGE_CHARS / CHARS_PER_TOKEN);
  const tools = input.tools.length
    ? estimateTokens(
        JSON.stringify(
          input.tools.map((t) => ({ type: 'function', function: t })),
        ),
        JSON_CHARS_PER_TOKEN,
      )
    : 0;
  return {
    memory: input.memoryText ? estimateTokens(input.memoryText) : 0,
    instructions: input.instructions ? estimateTokens(input.instructions) : 0,
    history,
    knowledge,
    tools,
  };
}

export interface ContextUsage {
  /** Tokens je Anteil (geschätzt). */
  parts: Record<ContextPart, number>;
  used: number;
  contextLength: number;
  /** Anteil 0–1 (kann über 1 liegen). */
  ratio: number;
  /**
   * ok: genug Platz · tight: weniger als ANSWER_RESERVE frei für die Antwort ·
   * full: passt nicht – Ollama schneidet den Anfang des Verlaufs ab.
   */
  level: 'ok' | 'tight' | 'full';
}

export function contextUsage(
  parts: Record<ContextPart, number>,
  contextLength: number,
): ContextUsage {
  const used = Object.values(parts).reduce((sum, n) => sum + n, 0);
  const free = contextLength - used;
  return {
    parts,
    used,
    contextLength,
    ratio: used / contextLength,
    level: free < 0 ? 'full' : free < ANSWER_RESERVE ? 'tight' : 'ok',
  };
}

/** Gebräuchliche Stufen für die Kontextlänge. */
const STEPS = [4096, 8192, 16384, 32768, 65536, 131072, 262144];

/**
 * Vorschlag für „Kontextlänge erhöhen“: die nächste Stufe, in die Bedarf plus
 * Platz für die Antwort passt – höchstens so viel, wie das Modell kann.
 * Null, wenn schon das Maximum erreicht ist.
 */
export function suggestContextLength(
  needed: number,
  current: number,
  modelMax?: number,
): number | null {
  const target = needed + ANSWER_RESERVE;
  const step = STEPS.find((s) => s > current && s >= target) ?? STEPS.at(-1)!;
  const limited = modelMax ? Math.min(step, modelMax) : step;
  return limited > current ? limited : null;
}

/** Aufschlag für Rechenpuffer, die mit dem Kontext wachsen (gemessen: qwen3 +9 %, gemma4 +35 %). */
const OVERHEAD = 1.2;

/**
 * Grafikspeicher pro Token Kontext (KV-Cache), aus den Modell-Angaben von Ollama
 * (`model_info` von /api/show): Jede Schicht merkt sich pro Token Schlüssel und
 * Wert (je 2 Byte pro Zahl). Schichten mit „Sliding Window“ merken sich nur die
 * letzten Tokens und wachsen nicht mit. Null = nicht vorhersagbar (z. B. gpt-oss:
 * Sliding Window ohne Angabe, welche Schichten).
 */
export function kvBytesPerToken(
  modelInfo: Record<string, unknown>,
): number | null {
  const arch = modelInfo['general.architecture'];
  if (typeof arch !== 'string') return null;
  const get = (key: string) => modelInfo[`${arch}.${key}`];

  const layers = get('block_count');
  if (typeof layers !== 'number' || layers <= 0) return null;
  const kvHeads = get('attention.head_count_kv');
  const keyLength = get('attention.key_length');
  const valueLength = get('attention.value_length');
  if (typeof keyLength !== 'number' || typeof valueLength !== 'number') {
    return null;
  }
  const pattern = get('attention.sliding_window_pattern');
  const hasSlidingWindow = get('attention.sliding_window') !== undefined;
  if (hasSlidingWindow && !Array.isArray(pattern)) return null;

  let bytes = 0;
  for (let layer = 0; layer < layers; layer++) {
    // true im Muster = Sliding-Window-Schicht → wächst nicht mit dem Kontext
    if (Array.isArray(pattern) && pattern[layer] === true) continue;
    const heads = Array.isArray(kvHeads) ? kvHeads[layer] : kvHeads;
    if (typeof heads !== 'number') return null;
    bytes += heads * (keyLength + valueLength) * 2;
  }
  return Math.round(bytes * OVERHEAD);
}
