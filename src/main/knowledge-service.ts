import { stat } from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import {
  IpcChannels,
  type CollectionConfig,
  type CollectionView,
  type IndexProgress,
  type Result,
} from '../shared/api';
import type { KnowledgeRepository } from './db/knowledge-repository';
import type { Provider } from './providers/provider';
import { indexCollection } from './rag/indexer';

/** Standard-Embedding-Modell für neue Sammlungen (vereinbart in Phase 5). */
export const DEFAULT_EMBEDDING_MODEL = 'qwen3-embedding:0.6b';

/** Fortschritt höchstens alle 250 ms an die Oberfläche – sonst flackert es. */
const BROADCAST_INTERVAL_MS = 250;

/**
 * Wissenssammlungen: anlegen, löschen, einlesen. Es wird immer nur eine Sammlung
 * gleichzeitig eingelesen – zwei parallel würden sich die Grafikkarte teilen.
 */
export function registerKnowledgeHandlers(
  repo: KnowledgeRepository,
  getProvider: () => Provider,
) {
  const progress = new Map<string, IndexProgress>();
  let running: { collectionId: string; controller: AbortController } | null =
    null;

  const views = (): CollectionView[] =>
    repo.listCollections().map((config) => ({
      config,
      stats: repo.stats(config.id),
      ...(progress.has(config.id) && { progress: progress.get(config.id) }),
    }));

  let lastBroadcast = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  const broadcast = (force = false) => {
    const send = () => {
      lastBroadcast = Date.now();
      pending = null;
      const list = views();
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IpcChannels.collectionsChanged, list);
      }
    };
    if (force || Date.now() - lastBroadcast >= BROADCAST_INTERVAL_MS) {
      if (pending) clearTimeout(pending);
      send();
    } else if (!pending) {
      pending = setTimeout(send, BROADCAST_INTERVAL_MS);
    }
  };

  ipcMain.handle(IpcChannels.listCollections, () => views());

  ipcMain.handle(
    IpcChannels.saveCollection,
    async (_event, input: unknown): Promise<Result<CollectionConfig>> => {
      const missing = await missingSource(input);
      if (missing) return { ok: false, error: `Nicht gefunden: ${missing}` };
      const result = repo.saveCollection(input, DEFAULT_EMBEDDING_MODEL);
      if (result.ok) broadcast(true);
      return result;
    },
  );

  ipcMain.handle(
    IpcChannels.deleteCollection,
    (_event, collectionId: unknown) => {
      if (typeof collectionId !== 'string') return;
      const current = running;
      if (current?.collectionId === collectionId) current.controller.abort();
      repo.deleteCollection(collectionId);
      progress.delete(collectionId);
      broadcast(true);
    },
  );

  ipcMain.handle(IpcChannels.listDocuments, (_event, collectionId: unknown) =>
    typeof collectionId === 'string' ? repo.listDocuments(collectionId) : [],
  );

  ipcMain.handle(
    IpcChannels.indexCollection,
    (_event, collectionId: unknown): Result<void> => {
      if (typeof collectionId !== 'string') {
        return { ok: false, error: 'Ungültige Sammlung' };
      }
      const collection = repo.getCollection(collectionId);
      if (!collection) return { ok: false, error: 'Sammlung nicht gefunden' };
      if (running) {
        return {
          ok: false,
          error: 'Es wird gerade schon eine Sammlung eingelesen.',
        };
      }
      const controller = new AbortController();
      running = { collectionId, controller };
      // Bewusst nicht abwarten: Der Fortschritt kommt über Ereignisse.
      const provider = getProvider();
      void indexCollection(collection, {
        repo,
        embed: (inputs, signal) =>
          provider.embed(collection.embeddingModel, inputs, signal),
        onProgress: (next) => {
          progress.set(collectionId, next);
          broadcast(next.phase !== 'indexing' || next.done === next.total);
        },
        signal: controller.signal,
      }).finally(() => {
        running = null;
        broadcast(true);
      });
      return { ok: true, value: undefined };
    },
  );

  ipcMain.handle(
    IpcChannels.cancelIndexing,
    (_event, collectionId: unknown) => {
      if (typeof collectionId !== 'string') return;
      const current = running;
      if (current && current.collectionId === collectionId) {
        current.controller.abort();
      }
    },
  );

  ipcMain.handle(IpcChannels.pickFiles, async (event): Promise<string[]> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Dateien wählen',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Text, Markdown, Code',
          extensions: [
            'md',
            'txt',
            'markdown',
            'ts',
            'js',
            'py',
            'json',
            'html',
            'css',
            'cs',
            'java',
            'go',
            'rs',
            'sql',
            'yaml',
            'yml',
          ],
        },
        { name: 'Alle Dateien', extensions: ['*'] },
      ],
    };
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });

  // Läuft beim Beenden noch ein Einlesen, sauber abbrechen.
  return { stop: () => running?.controller.abort() };
}

/** Erste Quelle, die es nicht gibt (die Formprüfung macht das Repository). */
async function missingSource(input: unknown): Promise<string | null> {
  const sources = (input as { sources?: unknown })?.sources;
  if (!Array.isArray(sources)) return null;
  for (const source of sources as { kind?: unknown; path?: unknown }[]) {
    if (typeof source?.path !== 'string') continue;
    try {
      const info = await stat(source.path);
      if (source.kind === 'folder' ? !info.isDirectory() : !info.isFile()) {
        return source.path;
      }
    } catch {
      return source.path;
    }
  }
  return null;
}
