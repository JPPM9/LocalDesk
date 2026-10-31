import { stat } from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import {
  IpcChannels,
  type CollectionConfig,
  type CollectionView,
  type IndexProgress,
  type Result,
  type SourceRef,
} from '../shared/api';
import type { KnowledgeRepository } from './db/knowledge-repository';
import type { ProjectKnowledge } from './folder-service';
import type { Provider } from './providers/provider';
import { WorkerExtractor } from './rag/extractor';
import { indexCollection } from './rag/indexer';
import { KnowledgeSearch } from './rag/search';
import { tr } from '../shared/messages';

/** Standard-Embedding-Modell für neue Sammlungen (vereinbart in Phase 5). */
export const DEFAULT_EMBEDDING_MODEL = 'qwen3-embedding:0.6b';

/** Fortschritt höchstens alle 250 ms an die Oberfläche – sonst flackert es. */
const BROADCAST_INTERVAL_MS = 250;

/** Diese Dateiarten öffnen wir im Standardprogramm; alles andere nur im Explorer. */
const OPEN_DIRECTLY = new Set([
  '.pdf',
  '.docx',
  '.md',
  '.markdown',
  '.txt',
  '.text',
  '.csv',
  '.log',
]);

/** Was der Chat vom Wissen braucht. */
export interface ChatKnowledge {
  search(collectionIds: string[], query: string): Promise<Result<SourceRef[]>>;
}

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
        return { ok: false, error: tr('error.invalidCollection') };
      }
      const collection = repo.getCollection(collectionId);
      if (!collection)
        return { ok: false, error: tr('error.collectionNotFound') };
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
      // Der Worker liegt nach dem Bauen als eigene Datei neben main.js.
      const extractor = new WorkerExtractor(
        path.join(__dirname, 'extract-worker.cjs'),
      );
      void indexCollection(collection, {
        extractor,
        repo,
        embed: (inputs, signal) =>
          provider.embed(collection.embeddingModel, inputs, signal),
        onProgress: (next) => {
          progress.set(collectionId, next);
          broadcast(next.phase !== 'indexing' || next.done === next.total);
        },
        signal: controller.signal,
      }).finally(() => {
        extractor.close();
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
          name: 'Dokumente, Text, Code',
          extensions: [
            'pdf',
            'docx',
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

  // Nur Dateien aus Sammlungen – nie ein beliebiger Pfad aus der Oberfläche.
  ipcMain.handle(
    IpcChannels.openDocument,
    async (_event, documentId: unknown): Promise<Result<void>> => {
      const filePath =
        typeof documentId === 'string' ? repo.documentPath(documentId) : null;
      if (!filePath) return { ok: false, error: tr('error.fileNotFound') };
      // Notizen aus dem Vault direkt in Obsidian öffnen – sofern Obsidian installiert ist.
      if (
        repo.documentInObsidian(documentId as string) &&
        path.extname(filePath).toLowerCase() === '.md' &&
        app.getApplicationNameForProtocol('obsidian://')
      ) {
        try {
          await shell.openExternal(
            `obsidian://open?path=${encodeURIComponent(filePath)}`,
          );
          return { ok: true, value: undefined };
        } catch {
          // Obsidian reagiert nicht – unten im Standardprogramm öffnen.
        }
      }
      if (!OPEN_DIRECTLY.has(path.extname(filePath).toLowerCase())) {
        // Skripte (.bat, .ps1, .js …) würde Windows ausführen – nur im Explorer zeigen.
        shell.showItemInFolder(filePath);
        return { ok: true, value: undefined };
      }
      const error = await shell.openPath(filePath);
      return error ? { ok: false, error } : { ok: true, value: undefined };
    },
  );

  const search = new KnowledgeSearch({
    repo,
    embed: async (model, input) => {
      const result = await getProvider().embed(model, [input]);
      if (result.ok) return { ok: true, value: result.value[0] };
      return {
        ok: false,
        error: result.error.includes('not found')
          ? `Das Embedding-Modell ${model} fehlt auf dem aktiven Ollama-Server – unter „Installierte Modelle“ herunterladen.`
          : result.error,
      };
    },
  });

  /** Für den Chat: Sammlungen durchsuchen (unbekannte IDs werden übergangen). */
  const knowledge: ChatKnowledge = {
    search: (collectionIds, query) => {
      const collections = collectionIds
        .map((id) => repo.getCollection(id))
        .filter((c): c is CollectionConfig => c !== null);
      return search.search(collections, query);
    },
  };

  /** Für Projekte: deren Dokumente sind eine Sammlung mit project_id. */
  const projects: ProjectKnowledge = {
    ensureCollection: (projectId, projectName) =>
      repo.ensureProjectCollection(
        projectId,
        projectName,
        DEFAULT_EMBEDDING_MODEL,
      ),
    cancel: (collectionId) => {
      const current = running;
      if (current && current.collectionId === collectionId) {
        current.controller.abort();
      }
      progress.delete(collectionId);
    },
    changed: () => broadcast(true),
  };

  /** Sammlung „Obsidian“ an den Vault anpassen (null = Vault vergessen). */
  const syncObsidian = (vaultPath: string | null) => {
    const current = running;
    const existing = repo.listCollections().find((c) => c.kind === 'obsidian');
    // Wird sie entfernt oder bekommt einen anderen Vault, ein laufendes Einlesen stoppen.
    repo.syncObsidianCollection(vaultPath, DEFAULT_EMBEDDING_MODEL);
    const after = repo.listCollections().find((c) => c.kind === 'obsidian');
    const changed = existing?.sources[0]?.path !== after?.sources[0]?.path;
    if (existing && changed && current?.collectionId === existing.id) {
      current.controller.abort();
    }
    if (existing && !vaultPath) progress.delete(existing.id);
    broadcast(true);
  };

  // Läuft beim Beenden noch ein Einlesen, sauber abbrechen.
  return {
    stop: () => running?.controller.abort(),
    knowledge,
    projects,
    syncObsidian,
  };
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
