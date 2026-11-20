import { ipcMain } from 'electron';
import {
  IpcChannels,
  type CatalogFile,
  type CatalogModel,
  type Result,
} from '../shared/api';
import {
  CATALOG_HOST,
  isValidRepoId,
  parseFiles,
  parseSearch,
} from '../shared/catalog';
import { querySystemMemory } from './system/memory';

const HUB = `https://${CATALOG_HOST}`;
const TIMEOUT_MS = 15000;
const MAX_QUERY = 100;

type Fetch = typeof fetch;

async function getJson(
  url: string,
  fetchImpl: Fetch,
): Promise<Result<unknown>> {
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok)
      return { ok: false, error: `Hugging Face: HTTP ${response.status}` };
    return { ok: true, value: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Sucht GGUF-Modelle, meistgeladene zuerst. Nur das Suchwort verlässt den PC. */
export async function searchCatalog(
  query: unknown,
  fetchImpl: Fetch = fetch,
): Promise<Result<CatalogModel[]>> {
  if (typeof query !== 'string' || query.length > MAX_QUERY)
    return { ok: false, error: 'Ungültige Suche.' };
  const params = new URLSearchParams({
    filter: 'gguf',
    sort: 'downloads',
    direction: '-1',
    limit: '20',
  });
  if (query.trim()) params.set('search', query.trim());
  const result = await getJson(`${HUB}/api/models?${params}`, fetchImpl);
  return result.ok ? { ok: true, value: parseSearch(result.value) } : result;
}

/** Die Quantisierungen eines Repos mit Dateigrößen. */
export async function listCatalogFiles(
  repoId: unknown,
  fetchImpl: Fetch = fetch,
): Promise<Result<CatalogFile[]>> {
  if (!isValidRepoId(repoId)) return { ok: false, error: 'Ungültiges Modell.' };
  const result = await getJson(
    `${HUB}/api/models/${repoId}/tree/main?recursive=true`,
    fetchImpl,
  );
  return result.ok ? { ok: true, value: parseFiles(result.value) } : result;
}

export function registerCatalogHandlers() {
  ipcMain.handle(IpcChannels.getSystemMemory, () => querySystemMemory());
  ipcMain.handle(IpcChannels.searchCatalog, (_event, query: unknown) =>
    searchCatalog(query),
  );
  ipcMain.handle(IpcChannels.listCatalogFiles, (_event, repoId: unknown) =>
    listCatalogFiles(repoId),
  );
}
