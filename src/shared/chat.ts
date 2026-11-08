import type {
  ChatMessage,
  ChatStats,
  ChatStreamEvent,
  MessageRecord,
  ToolCallRecord,
} from './api';
import { fileBlock, fileMarker, fileOutOfContext, filesToSend } from './files';
import { tableMarker, tableOutOfContext, tablesToSend } from './tables';
import { imageMarker, imagesToSend } from './images';
import { settleToolCalls, toolRoundMessages } from './tools';

/**
 * Baut ein Ereignis aus dem Stream in die Nachrichtenliste ein. Die Oberfläche
 * nutzt das zum Anzeigen, der Main-Prozess zum Speichern – beide rechnen gleich.
 * Gibt immer eine neue Liste zurück, statt die alte zu verändern – so erkennt
 * React zuverlässig, dass neu gezeichnet werden muss.
 */
export function applyChatEvent(
  messages: MessageRecord[],
  event: ChatStreamEvent,
): MessageRecord[] {
  return messages.map((message) => {
    if (message.id !== event.requestId) return message;
    switch (event.type) {
      case 'content':
        return { ...message, content: message.content + event.text };
      case 'thinking':
        return { ...message, thinking: message.thinking + event.text };
      case 'tool-call':
        return {
          ...message,
          toolCalls: upsertToolCall(message.toolCalls ?? [], event.call),
        };
      case 'sources':
        return {
          ...message,
          sources: event.sources,
          ...(event.error !== undefined && { knowledgeError: event.error }),
        };
      case 'done':
        return { ...message, status: 'done', stats: event.stats };
      case 'error':
        return {
          ...message,
          status: 'error',
          error: event.error,
          ...settled(message),
        };
      case 'aborted':
        return { ...message, status: 'aborted', ...settled(message) };
    }
  });
}

function upsertToolCall(
  calls: ToolCallRecord[],
  call: ToolCallRecord,
): ToolCallRecord[] {
  const index = calls.findIndex((c) => c.id === call.id);
  if (index === -1) return [...calls, call];
  return calls.map((c, i) => (i === index ? call : c));
}

function settled(message: MessageRecord): Pick<MessageRecord, 'toolCalls'> {
  return message.toolCalls
    ? { toolCalls: settleToolCalls(message.toolCalls) }
    : {};
}

/**
 * Der Verlauf, den das Modell als Kontext bekommt. Fehlgeschlagene und leere
 * Antworten lassen wir weg; Gedanken schickt man nicht zurück – sie würden nur
 * den Kontext füllen. Tool-Aufrufe einer Antwort kommen Runde für Runde vor
 * deren Text, damit das Modell später noch weiß, was es nachgeschlagen hat.
 */
export function toRequestMessages(
  messages: MessageRecord[],
  attach?: AttachmentSource,
): ChatMessage[] {
  const usable = messages.filter(isUsable);
  // Ohne Quelle (z. B. beim Zählen) geht kein Bild und keine Datei mit – es bleibt der Text-Hinweis.
  const sentImages = attach
    ? imagesToSend(usable, attach.vision)
    : new Set<string>();
  const sentFiles = attach ? filesToSend(usable) : new Set<string>();
  const sentTables = attach ? tablesToSend(usable) : new Set<string>();
  return usable.flatMap((m): ChatMessage[] => {
    const attached: string[] = [];
    const markers: string[] = [];
    for (const image of m.images ?? []) {
      const data = sentImages.has(image.id)
        ? attach?.data(image.id)
        : undefined;
      if (data) attached.push(data);
      else markers.push(imageMarker(image.name));
    }
    // Dateien: der Text vor deiner Frage; ältere nur noch als Hinweis.
    const blocks = [
      ...(m.files ?? []).map((file) => {
        if (!attach) return fileMarker(file.name);
        const text = sentFiles.has(file.id)
          ? attach.fileText?.(file.id)
          : undefined;
        return text !== undefined
          ? fileBlock(file.name, text)
          : fileOutOfContext(file.name);
      }),
      // Tabellen: Beschreibung (oder bei Modellen ohne Werkzeuge der Inhalt); ältere nur als Hinweis.
      ...(m.tables ?? []).map((table) => {
        if (!attach) return tableMarker(table.name);
        const text = sentTables.has(table.id)
          ? attach.tableText?.(table.id)
          : undefined;
        return text !== undefined ? text : tableOutOfContext(table.name);
      }),
    ];
    const withMarkers =
      markers.length > 0
        ? [...markers, m.content]
            .filter((part) => part.trim() !== '')
            .join('\n')
        : m.content;
    const content =
      blocks.length > 0
        ? [blocks.join('\n\n'), withMarkers]
            .filter((part) => part.trim() !== '')
            .join('\n\n')
        : withMarkers;
    return [
      ...toolRounds(m.toolCalls ?? []).flatMap(toolRoundMessages),
      {
        role: m.role,
        content,
        ...(attached.length > 0 && { images: attached }),
      },
    ];
  });
}

/** Woher die Anhänge einer Anfrage kommen: Bilder nur mit Bild-Fähigkeit, Bytes und Texte aus dem Speicher. */
export interface AttachmentSource {
  vision: boolean;
  /** Base64 eines Bildes (leer/undefined = nicht verfügbar → Text-Hinweis). */
  data: (imageId: string) => string | undefined;
  /** Gelesener Text einer Datei (undefined = nicht verfügbar → Hinweis „nicht mehr im Kontext“). */
  fileText?: (fileId: string) => string | undefined;
  /** Was das Modell zu einer Tabelle sieht (undefined = nicht verfügbar → Hinweis „nicht mehr abfragbar“). */
  tableText?: (tableId: string) => string | undefined;
}

/** Geht diese Nachricht an das Modell? Fehlgeschlagene und leere (ohne Bild oder Datei) nicht. */
export const isUsable = (m: MessageRecord): boolean =>
  m.status !== 'error' &&
  (m.content.trim() !== '' ||
    (m.images?.length ?? 0) > 0 ||
    (m.files?.length ?? 0) > 0 ||
    (m.tables?.length ?? 0) > 0);

function toolRounds(calls: ToolCallRecord[]): ToolCallRecord[][] {
  const rounds = new Map<number, ToolCallRecord[]>();
  for (const call of settleToolCalls(calls)) {
    rounds.set(call.round, [...(rounds.get(call.round) ?? []), call]);
  }
  return [...rounds.keys()]
    .sort((a, b) => a - b)
    .map((round) => rounds.get(round) ?? []);
}

/**
 * Fasst die Kennzahlen mehrerer Runden zusammen (eine Antwort mit Tools besteht
 * aus mehreren Anfragen). Die Eingabe-Tokens zählen nur von der letzten Runde –
 * sie enthält den ganzen Verlauf.
 */
export function combineStats(stats: ChatStats[]): ChatStats | undefined {
  if (stats.length === 0) return undefined;
  const outputTokens = stats.reduce((sum, s) => sum + s.outputTokens, 0);
  const evalSeconds = stats.reduce(
    (sum, s) =>
      sum + (s.tokensPerSecond > 0 ? s.outputTokens / s.tokensPerSecond : 0),
    0,
  );
  return {
    outputTokens,
    tokensPerSecond: evalSeconds > 0 ? outputTokens / evalSeconds : 0,
    promptTokens: stats[stats.length - 1].promptTokens,
    totalMs: stats.reduce((sum, s) => sum + s.totalMs, 0),
  };
}

const TITLE_MAX_LENGTH = 60;

/** Titel für einen neuen Chat: die erste Zeile der ersten Nachricht, gekürzt. */
export function titleFromMessage(content: string): string {
  const firstLine = content.trim().split('\n')[0].replace(/\s+/g, ' ');
  if (firstLine.length <= TITLE_MAX_LENGTH) return firstLine;
  return firstLine.slice(0, TITLE_MAX_LENGTH - 1).trimEnd() + '…';
}
