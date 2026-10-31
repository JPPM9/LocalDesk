import {
  MEMORY_TEXT_MAX,
  MEMORY_TOOL_NAME,
  MEMORY_TOOL_SERVER,
} from '../../shared/memory';
import type { OfferedTool } from '../../shared/tools';
import { tr } from '../../shared/messages';

export type MemoryScope = 'global' | 'projekt';

/**
 * Prüft die Eingaben (vom Modell oder aus deiner bearbeiteten Rückfrage):
 * Text nicht leer, höchstens 500 Zeichen; Ziel „global“ oder „projekt“.
 */
export function checkMemoryArguments(
  args: unknown,
): { text: string; scope: MemoryScope } | null {
  if (typeof args !== 'object' || args === null) return null;
  const raw = args as Record<string, unknown>;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text || text.length > MEMORY_TEXT_MAX) return null;
  const scope: MemoryScope = raw.scope === 'projekt' ? 'projekt' : 'global';
  return { text, scope };
}

/**
 * Das eingebaute Werkzeug „Erinnerung speichern“. Es fragt IMMER nach (vereinbart:
 * Modell schlägt vor, du bestätigst) – „Immer erlauben“ gibt es nicht. Im Projekt
 * darf das Modell vorschlagen, ob der Fakt nur für das Projekt gilt.
 */
export function memoryTool(inProject: boolean): OfferedTool {
  return {
    serverId: MEMORY_TOOL_SERVER,
    serverName: tr('tool.memoryServer'),
    toolName: MEMORY_TOOL_NAME,
    description: tr('tool.saveMemory'),
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: tr('tool.memoryText'),
        },
        ...(inProject && {
          scope: {
            type: 'string',
            enum: ['global', 'projekt'],
            description: tr('tool.memoryScope'),
          },
        }),
      },
      required: ['text'],
    },
    destructive: false,
    permission: 'ask',
    editable: { checkArguments: checkMemoryArguments },
  };
}
