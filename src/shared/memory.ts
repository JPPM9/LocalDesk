import type { ChatMessage, ChatRequest, MemoryView } from './api';
import { estimateTokens } from './context';
import { tr } from './messages';

/** Kennung des eingebauten Werkzeugs „Erinnerung speichern“ (statt eines MCP-Servers). */
export const MEMORY_TOOL_SERVER = 'localdesk:memory';
export const MEMORY_TOOL_NAME = 'save_memory';
/** Längste Erinnerung (wie im Main-Prozess). */
export const MEMORY_TEXT_MAX = 500;

/** So viel Kontext dürfen Erinnerungen höchstens belegen (vereinbart: ~1500 Tokens). */
export const MEMORY_TOKEN_BUDGET = 1500;

/**
 * Welche Erinnerungen ein Chat bekommt: alle, solange sie ins Budget passen.
 * Sonst die zur Frage passendsten (`scores`, gleiche Reihenfolge wie `memories`) –
 * ohne Bewertung (z. B. Ollama aus) die neuesten. Die Reihenfolge der Auswahl
 * bleibt wie in der Liste, damit sich der Text zwischen Fragen kaum ändert.
 */
export function selectMemories(
  memories: MemoryView[],
  budget = MEMORY_TOKEN_BUDGET,
  scores?: number[],
): MemoryView[] {
  const cost = (m: MemoryView) => estimateTokens(m.text) + 2;
  const total = memories.reduce((sum, m) => sum + cost(m), 0);
  if (total <= budget) return memories;

  const order = memories
    .map((m, index) => ({ m, index }))
    .sort((a, b) =>
      scores
        ? scores[b.index] - scores[a.index]
        : (b.m.created ?? '').localeCompare(a.m.created ?? ''),
    );
  const chosen = new Set<number>();
  let used = 0;
  for (const { m, index } of order) {
    if (used + cost(m) > budget) continue;
    chosen.add(index);
    used += cost(m);
  }
  return memories.filter((_, index) => chosen.has(index));
}

/**
 * Stellt die Erinnerungen an den Anfang der System-Nachricht (vor Projekt-Anweisungen
 * und Systemprompt) – oder legt eine an. Gilt nur für diese eine Anfrage.
 */
export function withMemories(
  request: ChatRequest,
  texts: string[],
): ChatRequest {
  const prompt = memoryPrompt(texts);
  if (!prompt) return request;
  const [first, ...rest] = request.messages;
  const messages: ChatMessage[] =
    first?.role === 'system'
      ? [{ ...first, content: `${prompt}\n\n${first.content}` }, ...rest]
      : [{ role: 'system', content: prompt }, ...request.messages];
  return { ...request, messages };
}

/** Der Teil der System-Nachricht mit den Erinnerungen. */
export function memoryPrompt(texts: string[]): string {
  if (texts.length === 0) return '';
  return [
    tr('prompt.memoryIntro'),
    ...texts.map((t) => `- ${t.replace(/\s*\n\s*/g, ' ')}`),
  ].join('\n');
}
