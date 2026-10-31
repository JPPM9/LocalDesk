import type {
  ChatRequest,
  ChatSettings,
  MessageRecord,
  ModelInfo,
  ThinkSetting,
} from './api';
import { toRequestMessages } from './chat';

export const TEMPERATURE_MAX = 2;
export const CONTEXT_MIN = 512;
export const CONTEXT_MAX = 1_048_576;
const SYSTEM_PROMPT_MAX = 20_000;
const SEED_MAX = 2_147_483_647;
const THINK_LEVELS = ['low', 'medium', 'high'] as const;
const ID_LIST_MAX = 20;

/**
 * Prüft Einstellungen aus unsicherer Quelle (Oberfläche, Datenbank) und behält nur
 * gültige Werte. Ungültiges fällt weg – dann gilt wieder der Standard des Modells.
 */
export function normalizeSettings(raw: unknown): ChatSettings {
  if (typeof raw !== 'object' || raw === null) return {};
  const input = raw as Record<string, unknown>;
  const result: ChatSettings = {};

  if (typeof input.systemPrompt === 'string' && input.systemPrompt.trim()) {
    result.systemPrompt = input.systemPrompt.slice(0, SYSTEM_PROMPT_MAX);
  }
  if (isFiniteNumber(input.temperature)) {
    const clamped = Math.min(Math.max(input.temperature, 0), TEMPERATURE_MAX);
    result.temperature = Math.round(clamped * 100) / 100;
  }
  if (isFiniteNumber(input.contextLength)) {
    result.contextLength = Math.round(
      Math.min(Math.max(input.contextLength, CONTEXT_MIN), CONTEXT_MAX),
    );
  }
  if (
    isFiniteNumber(input.seed) &&
    Number.isInteger(input.seed) &&
    input.seed >= 0 &&
    input.seed <= SEED_MAX
  ) {
    result.seed = input.seed;
  }
  if (isThinkSetting(input.think)) {
    result.think = input.think;
  }
  // Leere Liste = keine Tools/kein Wissen → wie „nicht gesetzt“, damit nichts Unnötiges gespeichert wird.
  const mcpServers = idList(input.mcpServers);
  if (mcpServers.length > 0) result.mcpServers = mcpServers;
  const collections = idList(input.collections);
  if (collections.length > 0) result.collections = collections;
  const skills = idList(input.skills);
  if (skills.length > 0) result.skills = skills;
  // Ein Konto pro Chat – die Werkzeuge arbeiten mit genau einem Postfach.
  const mailAccounts = idList(input.mailAccounts).slice(0, 1);
  if (mailAccounts.length > 0) result.mailAccounts = mailAccounts;
  // „manual“ ist der Standard und wird nicht gespeichert.
  if (input.codeMode === 'plan') result.codeMode = 'plan';
  return result;
}

/** Liste von IDs (MCP-Server, Sammlungen): ohne Doppelte, Leeres und Überlanges. */
function idList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.filter(
        (id): id is string =>
          typeof id === 'string' && id !== '' && id.length <= 100,
      ),
    ),
  ].slice(0, ID_LIST_MAX);
}

/**
 * Baut aus Verlauf und Einstellungen die Anfrage an den Server.
 * `projectInstructions` (Chat liegt in einem Projekt) kommen vor den Systemprompt
 * des Chats – beides in einer System-Nachricht, weil manche Modelle nur die
 * erste beachten.
 */
export function buildChatRequest(
  model: string,
  history: MessageRecord[],
  settings: ChatSettings,
  projectInstructions?: string,
): ChatRequest {
  const messages = toRequestMessages(history);
  const system = [projectInstructions?.trim(), settings.systemPrompt?.trim()]
    .filter(Boolean)
    .join('\n\n');
  if (system) {
    // Der Systemprompt steht immer ganz vorne, unsichtbar für den Verlauf.
    messages.unshift({ role: 'system', content: system });
  }
  const options: ChatRequest['options'] = {};
  if (settings.temperature !== undefined)
    options.temperature = settings.temperature;
  if (settings.contextLength !== undefined)
    options.contextLength = settings.contextLength;
  if (settings.seed !== undefined) options.seed = settings.seed;

  return {
    model,
    messages,
    ...(Object.keys(options).length > 0 && { options }),
    ...(settings.think !== undefined && { think: settings.think }),
  };
}

/**
 * Wie sich das Denken eines Modells steuern lässt:
 * - 'none': Modell denkt nicht (keine Einstellung nötig)
 * - 'toggle': an/aus (qwen3, gemma4 …)
 * - 'levels': nur Stufen niedrig/mittel/hoch – gpt-oss ignoriert „aus“ (geprüft mit Ollama 0.40)
 */
export function thinkStyle(
  model: ModelInfo | undefined,
): 'none' | 'toggle' | 'levels' {
  if (!model?.capabilities.includes('thinking')) return 'none';
  return model.family === 'gptoss' ? 'levels' : 'toggle';
}

/**
 * Passt eine Denken-Einstellung zum Modell? An/Aus nur bei 'toggle',
 * Stufen nur bei 'levels'. Sonst sollte sie beim Modellwechsel weg.
 */
export function thinkFitsModel(
  think: ThinkSetting | undefined,
  model: ModelInfo | undefined,
): boolean {
  if (think === undefined) return true;
  const style = thinkStyle(model);
  if (style === 'toggle') return typeof think === 'boolean';
  if (style === 'levels') return typeof think === 'string';
  return false;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isThinkSetting(value: unknown): value is ThinkSetting {
  return (
    typeof value === 'boolean' ||
    (typeof value === 'string' &&
      (THINK_LEVELS as readonly string[]).includes(value))
  );
}
