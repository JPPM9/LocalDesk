import { ipcMain, type WebContents } from 'electron';
import {
  IpcChannels,
  type ChatRequest,
  type ChatStreamEvent,
} from '../shared/api';
import type { Provider } from './providers/provider';

/**
 * Verbindet die Oberfläche mit dem Chat des Providers.
 * Eine Antwort läuft im Hintergrund weiter; jedes Stück geht als Ereignis an das
 * Fenster, das gefragt hat. Laufende Antworten merken wir uns, damit „Stopp“ sie
 * abbrechen kann.
 */
export function registerChatHandlers(provider: Provider) {
  const running = new Map<string, AbortController>();

  ipcMain.handle(
    IpcChannels.chatStart,
    (event, requestId: unknown, request: unknown) => {
      if (typeof requestId !== 'string' || !isChatRequest(request)) {
        throw new Error('Ungültige Chat-Anfrage');
      }
      const controller = new AbortController();
      running.set(requestId, controller);
      // Bewusst nicht abwarten: Die Oberfläche bekommt die Antwort über Ereignisse.
      void stream(event.sender, requestId, request, controller).finally(() =>
        running.delete(requestId),
      );
    },
  );

  ipcMain.handle(IpcChannels.chatCancel, (_event, requestId: unknown) => {
    if (typeof requestId === 'string') running.get(requestId)?.abort();
  });

  async function stream(
    sender: WebContents,
    requestId: string,
    request: ChatRequest,
    controller: AbortController,
  ) {
    const send = (event: ChatStreamEvent) => {
      if (!sender.isDestroyed()) sender.send(IpcChannels.chatEvent, event);
    };
    try {
      for await (const chunk of provider.chat(request, controller.signal)) {
        send({ requestId, ...chunk });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        send({ requestId, type: 'aborted' });
      } else {
        send({
          requestId,
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

// Die Oberfläche gilt als nicht vertrauenswürdig: Eingaben vom Renderer prüfen wir.
function isChatRequest(value: unknown): value is ChatRequest {
  if (typeof value !== 'object' || value === null) return false;
  const { model, messages } = value as Partial<ChatRequest>;
  return (
    typeof model === 'string' &&
    Array.isArray(messages) &&
    messages.every(
      (m) =>
        ['system', 'user', 'assistant'].includes(m?.role) &&
        typeof m?.content === 'string',
    )
  );
}
