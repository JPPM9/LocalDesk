import { localDate, yamlString } from './note-format';

export const SUMMARIES_DIR = 'Zusammenfassungen';
const TAG = 'localdesk/zusammenfassung';

/** Eine Zusammenfassung als Obsidian-Notiz – Kopf wie bei gespeicherten Chats. */
export function formatSummaryNote(
  summary: { title: string; text: string },
  date: Date,
  meta: { chatId: string; model: string; projectName?: string },
): { title: string; content: string } {
  const day = localDate(date);
  const title = summary.title.trim();
  const content = [
    '---',
    `tags: [${TAG}]`,
    `erstellt: ${day}`,
    `modell: ${yamlString(meta.model)}`,
    ...(meta.projectName ? [`projekt: ${yamlString(meta.projectName)}`] : []),
    `chat-id: ${meta.chatId}`,
    '---',
    '',
    `# ${title}`,
    '',
    summary.text.trim(),
    '',
  ].join('\n');
  return { title: `${day} ${title}`, content };
}
