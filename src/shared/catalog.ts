// Katalog von Hugging Face (GGUF-Modelle): reine Auswertung der Antworten, ohne Netzwerk.
import type { CatalogFile, CatalogModel } from './api';

/** Der einzige Host des Modell-Katalogs (steht in docs/privacy.md). */
export const CATALOG_HOST = 'huggingface.co';

/** Erlaubte Form einer Repo-Kennung „nutzer/modell“ (kommt in eine Adresse und einen Modellnamen). */
export function isValidRepoId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length <= 160 &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)
  );
}

/** Quantisierung aus einem Dateipfad: „Qwen3-4B-Q4_K_M.gguf“ → „Q4_K_M“; null, wenn keine erkennbar. */
export function quantFromPath(path: string): string | null {
  const match =
    /(?<![A-Za-z0-9])((?:IQ|Q)\d(?:_[A-Z0-9]+)*|BF16|F16|F32)(?![A-Za-z0-9])/i.exec(
      path,
    );
  return match ? match[1].toUpperCase() : null;
}

/** Aus einer Suchantwort die Modelle lesen; Unbrauchbares fällt weg. */
export function parseSearch(json: unknown): CatalogModel[] {
  if (!Array.isArray(json)) return [];
  const result: CatalogModel[] = [];
  for (const item of json) {
    const entry = item as Record<string, unknown>;
    if (!isValidRepoId(entry?.id)) continue;
    result.push({
      id: entry.id,
      downloads: typeof entry.downloads === 'number' ? entry.downloads : 0,
      likes: typeof entry.likes === 'number' ? entry.likes : 0,
      tags: Array.isArray(entry.tags)
        ? entry.tags.filter((t): t is string => typeof t === 'string')
        : [],
    });
  }
  return result;
}

/**
 * Aus der Dateiliste eines Repos die Größen je Quantisierung: geteilte Dateien („-00001-of-00003“)
 * werden zusammengezählt, Bild-Zusatzdateien („mmproj“) und Dateien ohne erkennbare Quantisierung
 * fallen weg. Kleinste zuerst.
 */
export function parseFiles(json: unknown): CatalogFile[] {
  if (!Array.isArray(json)) return [];
  const byQuant = new Map<string, CatalogFile>();
  for (const item of json) {
    const file = item as Record<string, unknown>;
    const path = file?.path;
    if (file?.type !== 'file' || typeof path !== 'string') continue;
    if (!/\.gguf$/i.test(path) || /mmproj/i.test(path)) continue;
    const lfs = file.lfs as { size?: unknown } | undefined;
    const size = typeof lfs?.size === 'number' ? lfs.size : file.size;
    if (typeof size !== 'number' || size <= 0) continue;
    const quant = quantFromPath(path);
    if (!quant) continue;
    const current = byQuant.get(quant) ?? {
      quant,
      sizeBytes: 0,
      files: 0,
    };
    // Dieselbe Quantisierung als eigene, nicht geteilte Datei (z. B. andere Variante im Unterordner):
    // nicht dazuzählen, sonst wird die Größe doppelt gerechnet.
    if (current.files > 0 && !/-\d{3,5}-of-\d{3,5}/i.test(path)) continue;
    current.sizeBytes += size;
    current.files += 1;
    byQuant.set(quant, current);
  }
  return [...byQuant.values()].sort((a, b) => a.sizeBytes - b.sizeBytes);
}

/** Der Name, unter dem Ollama das Modell lädt („hf.co/nutzer/modell:Q4_K_M“). */
export function ollamaNameFor(repoId: string, quant: string): string {
  return `hf.co/${repoId}:${quant}`;
}
