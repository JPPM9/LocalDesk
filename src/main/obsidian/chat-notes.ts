import type { ChatDetail, MessageRecord, SourceRef } from '../../shared/api';
import { localDate, yamlString } from './note-format';

export const CHATS_DIR = 'Chats';
const TAG = 'localdesk/chat';

export interface ChatNote {
  /** Dateiname ohne Endung, z. B. „2026-10-27 Kündigungsfrist“. */
  title: string;
  content: string;
}

/**
 * Ein Chat (oder eine einzelne Antwort mit ihrer Frage) als Obsidian-Notiz.
 * Mit `answerId` nur diese Antwort und die Frage davor, sonst der ganze Chat.
 * Gedanken und Tool-Aufrufe bleiben draußen – sie sind Arbeitsschritte, kein
 * Ergebnis. Die Quellen stehen unter jeder Antwort, weil jede Antwort ihre
 * eigene Nummerierung [1], [2] … hat. Liefert null, wenn es nichts zu speichern gibt.
 */
export function formatChatNote(
  chat: ChatDetail,
  date: Date,
  options: { answerId?: string; projectName?: string } = {},
): ChatNote | null {
  const messages = pickMessages(chat.messages, options.answerId);
  if (!messages.some((m) => m.role === 'assistant')) return null;

  const models = [
    ...new Set(
      messages.filter((m) => m.role === 'assistant').map((m) => m.model ?? ''),
    ),
  ].filter(Boolean);
  const day = localDate(date);
  const front = [
    '---',
    `tags: [${TAG}]`,
    `erstellt: ${day}`,
    `modell: ${yamlString(models.join(', '))}`,
    ...(options.projectName
      ? [`projekt: ${yamlString(options.projectName)}`]
      : []),
    `chat-id: ${chat.id}`,
    '---',
  ];
  const body = messages.flatMap((m) =>
    m.role === 'user'
      ? ['## Frage', '', m.content.trim(), '']
      : [
          `## Antwort (${m.model ?? 'Modell'})`,
          '',
          m.content.trim(),
          '',
          ...formatSources(m.sources ?? []),
        ],
  );
  return {
    // Automatisch gekürzte Titel enden auf „…“ – im Dateinamen stört das nur.
    title: `${day} ${chat.title.replace(/\s*…$/, '')}`,
    content: [...front, '', `# ${chat.title}`, '', ...body]
      .join('\n')
      .trimEnd()
      .concat('\n'),
  };
}

/** Nur fertige Fragen und Antworten mit Text, bei einer Antwort plus ihre Frage. */
function pickMessages(
  all: MessageRecord[],
  answerId: string | undefined,
): MessageRecord[] {
  const usable = (m: MessageRecord) => m.content.trim() !== '';
  if (answerId === undefined) return all.filter(usable);
  const index = all.findIndex(
    (m) => m.id === answerId && m.role === 'assistant',
  );
  if (index < 0 || !usable(all[index])) return [];
  const question = all
    .slice(0, index)
    .reverse()
    .find((m) => m.role === 'user');
  return [...(question ? [question] : []), all[index]];
}

function formatSources(sources: SourceRef[]): string[] {
  if (sources.length === 0) return [];
  return [
    '**Quellen**',
    '',
    ...sources.map((s) => {
      const where = [
        s.page !== undefined ? `S. ${s.page}` : '',
        s.heading ?? '',
      ]
        .filter(Boolean)
        .join(', ');
      return `${s.n}. ${s.collectionName}: ${s.path}${where ? ` (${where})` : ''}`;
    }),
    '',
  ];
}
