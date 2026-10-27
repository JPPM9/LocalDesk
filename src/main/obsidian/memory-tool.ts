import {
  MEMORY_TEXT_MAX,
  MEMORY_TOOL_NAME,
  MEMORY_TOOL_SERVER,
} from '../../shared/memory';
import type { OfferedTool } from '../../shared/tools';

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
    serverName: 'Erinnerungen',
    toolName: MEMORY_TOOL_NAME,
    description:
      'Schlägt vor, einen dauerhaften Fakt über den Nutzer als Erinnerung zu speichern ' +
      '(z. B. Studium, Beruf, Wohnort, Vorlieben, wiederkehrende Wünsche an Antworten). ' +
      'Nutze es, wenn der Nutzer so etwas über sich erzählt oder dich bittet, dir etwas zu merken – ' +
      'nicht für einmalige Fragen oder allgemeines Wissen. Der Nutzer bestätigt oder ändert den ' +
      'Text, bevor er gespeichert wird. Formuliere kurz in der Ich-Form des Nutzers, z. B. ' +
      '„Ich studiere Statistik.“ Antworte danach ganz normal weiter.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Der Fakt in einem kurzen Satz, Ich-Form des Nutzers.',
        },
        ...(inProject && {
          scope: {
            type: 'string',
            enum: ['global', 'projekt'],
            description:
              '„projekt“, wenn der Fakt nur für dieses Projekt wichtig ist, sonst „global“.',
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
