import type { Result } from '../../shared/api';
import { tr } from '../../shared/messages';
import {
  normalizeLink,
  WEB_SEARCH_HOST,
  WEB_SEARCH_MAX_BYTES,
  WEB_SEARCH_RESULTS,
  WEB_SEARCH_SNIPPET_MAX,
  WEB_SEARCH_TIMEOUT_MS,
  WEB_SEARCH_TITLE_MAX,
  WEB_SEARCH_URL,
  WEB_URL_MAX,
  type WebSearchHit,
} from '../../shared/web';

/** So wird gesendet (austauschbar für Tests): immer POST, ohne Weiterleitung, mit Zeitlimit. */
export type SearchFetch = (
  url: string,
  init: {
    method: 'POST';
    redirect: 'error';
    signal: AbortSignal;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<Response>;

export interface WebSearchDeps {
  fetch?: SearchFetch;
  timeoutMs?: number;
  maxBytes?: number;
}

/** Ein Wort pro Zeile: Zeilenumbrüche und Leerraum werden zu einem Leerzeichen, dann gekürzt. */
function oneLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Liest die Antwort des Suchdienstes: nur Treffer mit einer http(s)-Adresse, Titel und Auszug
 * als eine Zeile gekürzt. null, wenn die Antwort nicht die erwartete Form hat.
 */
export function parseSearchResponse(
  json: unknown,
  limit: number,
): WebSearchHit[] | null {
  if (typeof json !== 'object' || json === null) return null;
  const results = (json as { results?: unknown }).results;
  if (!Array.isArray(results)) return null;
  const hits: WebSearchHit[] = [];
  const seen = new Set<string>();
  for (const item of results) {
    if (typeof item !== 'object' || item === null) continue;
    const { title, url, content } = item as Record<string, unknown>;
    if (typeof url !== 'string' || url.length > WEB_URL_MAX) continue;
    const link = normalizeLink(url);
    if (!link || seen.has(link)) continue;
    seen.add(link);
    hits.push({
      title: oneLine(title, WEB_SEARCH_TITLE_MAX) || link,
      url: link,
      snippet: oneLine(content, WEB_SEARCH_SNIPPET_MAX),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

/** Liest den Text, bricht aber bei mehr als `max` Bytes ab (null) – ohne alles zu laden. */
async function readCapped(
  response: Response,
  max: number,
): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Sucht im Web über die Ollama-Websuche: POST an `ollama.com` mit deinem Schlüssel (Bearer),
 * ohne Weiterleitung, mit Zeit- und Größenlimit. Der Schlüssel steht nur im Kopf der Anfrage –
 * nie in Fehlertexten. Gibt Treffer oder einen fertigen Fehlertext zurück; wirft nur, wenn
 * `signal` abgebrochen wird.
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  signal: AbortSignal,
  count: number = WEB_SEARCH_RESULTS,
  deps: WebSearchDeps = {},
): Promise<Result<WebSearchHit[]>> {
  // Doppelt gesichert: Auch bei einem Fehler an anderer Stelle geht der Schlüssel nur dorthin.
  const target = new URL(WEB_SEARCH_URL);
  if (target.protocol !== 'https:' || target.hostname !== WEB_SEARCH_HOST) {
    return { ok: false, error: tr('web.searchOffline') };
  }
  const send: SearchFetch =
    deps.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const timeout = AbortSignal.timeout(deps.timeoutMs ?? WEB_SEARCH_TIMEOUT_MS);
  try {
    const response = await send(target.href, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.any([signal, timeout]),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, max_results: count }),
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: tr('web.searchKeyRejected') };
    }
    if (response.status === 429) {
      return { ok: false, error: tr('web.searchLimit') };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: tr('web.searchFailed', { status: response.status }),
      };
    }
    const text = await readCapped(
      response,
      deps.maxBytes ?? WEB_SEARCH_MAX_BYTES,
    );
    if (text === null) return { ok: false, error: tr('web.searchTooLarge') };
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: tr('web.searchBadAnswer') };
    }
    const hits = parseSearchResponse(json, count);
    return hits
      ? { ok: true, value: hits }
      : { ok: false, error: tr('web.searchBadAnswer') };
  } catch (error) {
    if (signal.aborted) throw error;
    return {
      ok: false,
      error: timeout.aborted
        ? tr('web.searchTimeout')
        : tr('web.searchOffline'),
    };
  }
}
