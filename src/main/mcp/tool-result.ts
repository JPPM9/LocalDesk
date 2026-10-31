import type { ToolResult } from '../tool-loop';
import { tr } from '../../shared/messages';

/** Ein Inhaltsteil einer MCP-Tool-Antwort (nur die Felder, die wir nutzen). */
interface ContentPart {
  type?: unknown;
  text?: unknown;
  resource?: { uri?: unknown; text?: unknown };
}

/**
 * Macht aus der Antwort eines MCP-Tools Text für das Modell. Bilder und andere
 * Binärdaten kann das Modell hier nicht sehen – die werden nur erwähnt.
 */
export function toToolResult(raw: unknown): ToolResult {
  const response = (raw ?? {}) as { content?: unknown; isError?: unknown };
  const parts = Array.isArray(response.content)
    ? (response.content as ContentPart[])
    : [];
  const texts = parts.map((part) => {
    if (part.type === 'text' && typeof part.text === 'string') return part.text;
    if (part.type === 'resource' && typeof part.resource?.text === 'string') {
      return part.resource.text;
    }
    return tr('mcp.cannotShow', {
      type: typeof part.type === 'string' ? part.type : tr('mcp.contentWord'),
    });
  });
  return {
    text: texts.join('\n') || tr('mcp.noResult'),
    isError: response.isError === true,
  };
}
