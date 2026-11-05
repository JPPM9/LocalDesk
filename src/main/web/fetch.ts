import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';
import zlib from 'node:zlib';
import type { Result } from '../../shared/api';
import { tr, type MessageKey } from '../../shared/messages';
import {
  WEB_MAX_BYTES,
  WEB_MAX_REDIRECTS,
  WEB_TIMEOUT_MS,
} from '../../shared/web';
import { checkWebUrl, isBlockedAddress } from './address';

/** Eine geladene Seite (Text schon entschlüsselt). */
export interface FetchedPage {
  /** Die Adresse, bei der die Seite am Ende lag (nach Weiterleitungen). */
  url: string;
  /** Typ aus dem Kopf, klein geschrieben (z. B. „text/html“); leer, wenn die Seite keinen nennt. */
  contentType: string;
  text: string;
  /** Die Seite war größer als erlaubt – gelesen wurde nur der Anfang. */
  truncated: boolean;
  redirected: boolean;
}

/** Austauschbare Teile – die App nutzt die Standardwerte, Tests setzen eigene. */
export interface WebFetchDeps {
  /** Darf zu dieser IP-Adresse verbunden werden? Standard: nur öffentliche Adressen. */
  isAllowedAddress?: (address: string) => boolean;
  /** Die Adressen eines Domainnamens. */
  resolve?: (
    hostname: string,
  ) => Promise<{ address: string; family: number }[]>;
  /** Prüft jede Adresse – die erste und die jeder Weiterleitung. */
  checkUrl?: (raw: string) => Result<URL>;
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
}

/** Ein Fehler mit fertigem Text für den Nutzer (alles andere wird zu „nicht erreichbar“). */
class WebError extends Error {
  constructor(
    readonly key: MessageKey,
    readonly params: Record<string, string | number> = {},
  ) {
    super(key);
  }
}

const TEXT_APPLICATION = new Set([
  'application/xhtml+xml',
  'application/xml',
  'application/json',
  'application/ld+json',
  'application/rss+xml',
  'application/atom+xml',
]);

/** Textseiten: HTML, Text, Markdown, JSON, XML. Alles andere (PDF, Bilder, Downloads) nicht. */
export function isTextType(type: string): boolean {
  return (
    type.startsWith('text/') ||
    TEXT_APPLICATION.has(type) ||
    /\+(xml|json)$/.test(type)
  );
}

const CERTIFICATE_ERRORS = new Set([
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

/** Der Text für den Nutzer zu einem Fehler beim Laden. */
function describe(error: unknown): string {
  if (error instanceof WebError) return tr(error.key, error.params);
  const code = (error as NodeJS.ErrnoException | undefined)?.code ?? '';
  if (CERTIFICATE_ERRORS.has(code)) return tr('web.certificate');
  return tr('web.offline');
}

const defaultResolve: NonNullable<WebFetchDeps['resolve']> = (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true });

interface Config {
  isAllowedAddress: (address: string) => boolean;
  resolve: NonNullable<WebFetchDeps['resolve']>;
  checkUrl: (raw: string) => Result<URL>;
  timeoutMs: number;
  maxBytes: number;
  userAgent: string;
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  truncated: boolean;
}

/**
 * Eine einzelne Anfrage (nur GET). Der Domainname wird erst beim Verbindungsaufbau
 * aufgelöst und dort geprüft – es gibt keine Lücke zwischen „geprüft“ und „verbunden“.
 * Keine Cookies, kein Referer, keine Anmeldung; Antworten werden entpackt und begrenzt.
 */
function request(
  url: URL,
  signal: AbortSignal,
  config: Config,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    let req: http.ClientRequest | undefined;
    const onAbort = () => fail(signal.reason ?? new Error('aborted'));
    const cleanup = () => {
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      cleanup();
      req?.destroy();
      reject(error);
    };
    const finish = (response: RawResponse) => {
      if (settled) return;
      cleanup();
      resolve(response);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(
      () => fail(new WebError('web.timeout')),
      config.timeoutMs,
    );

    const lookup: LookupFunction = (hostname, options, callback) => {
      config.resolve(hostname).then(
        (addresses) => {
          if (addresses.length === 0) {
            callback(new WebError('web.offline') as never, '', 4);
          } else if (
            !addresses.every((a) => config.isAllowedAddress(a.address))
          ) {
            callback(new WebError('web.blockedAddress') as never, '', 4);
          } else if (options.all) {
            callback(null, addresses);
          } else {
            callback(null, addresses[0].address, addresses[0].family);
          }
        },
        (error: Error) => callback(error as never, '', 4),
      );
    };

    const secure = url.protocol === 'https:';
    try {
      req = (secure ? https : http).request(
        {
          hostname: url.hostname.replace(/^\[|\]$/g, ''),
          port: url.port || (secure ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          headers: {
            'User-Agent': config.userAgent,
            Accept:
              'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
            'Accept-Language': 'de,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'close',
          },
          lookup,
          agent: false,
        },
        (res) => {
          res.on('error', fail);
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            // Weiterleitung oder Fehler: den Inhalt brauchen wir nicht.
            res.resume();
            finish({
              status,
              headers: res.headers,
              body: Buffer.alloc(0),
              truncated: false,
            });
            return;
          }
          const type = String(res.headers['content-type'] ?? '')
            .split(';')[0]
            .trim()
            .toLowerCase();
          if (type && !isTextType(type)) {
            res.destroy();
            fail(new WebError('web.notText', { type }));
            return;
          }
          const encoding = String(res.headers['content-encoding'] ?? '')
            .trim()
            .toLowerCase();
          let body: Readable = res;
          if (encoding === 'gzip' || encoding === 'x-gzip') {
            body = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            body = res.pipe(zlib.createInflate());
          } else if (encoding === 'br') {
            body = res.pipe(zlib.createBrotliDecompress());
          } else if (encoding && encoding !== 'identity') {
            res.destroy();
            fail(new WebError('web.offline'));
            return;
          }
          if (body !== res) body.on('error', fail);
          const chunks: Buffer[] = [];
          let size = 0;
          body.on('data', (chunk: Buffer) => {
            if (settled) return;
            size += chunk.length;
            if (size > config.maxBytes) {
              // Nach dem Entpacken gezählt: Auch eine „Zip-Bombe“ bricht hier ab.
              chunks.push(
                chunk.subarray(0, chunk.length - (size - config.maxBytes)),
              );
              finish({
                status,
                headers: res.headers,
                body: Buffer.concat(chunks),
                truncated: true,
              });
              req?.destroy();
              return;
            }
            chunks.push(chunk);
          });
          body.on('end', () =>
            finish({
              status,
              headers: res.headers,
              body: Buffer.concat(chunks),
              truncated: false,
            }),
          );
        },
      );
      req.on('error', fail);
      req.end();
    } catch (error) {
      fail(error);
    }
  });
}

/** Das Zeichensatz-Kürzel aus dem Kopf, aus <meta> oder dem XML-Kopf (nur in den ersten Bytes gesucht). */
function sniffCharset(body: Buffer, header: string): string {
  if (header) return header;
  const head = body.subarray(0, 4096).toString('latin1');
  const meta =
    /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(head) ??
    /<\?xml[^>]+encoding\s*=\s*["']([\w-]+)/i.exec(head);
  return meta?.[1] ?? '';
}

/**
 * Macht aus den Bytes Text: Zeichensatz aus BOM, Kopf oder <meta>, sonst UTF-8 und – wenn das
 * nicht passt – Windows-1252. null = sieht nach Binärdaten aus.
 */
export function decodeBody(body: Buffer, contentType: string): string | null {
  const charsetHeader =
    /charset\s*=\s*"?([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase() ?? '';
  let label = '';
  if (body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) label = 'utf-8';
  else if (body[0] === 0xff && body[1] === 0xfe) label = 'utf-16le';
  else if (body[0] === 0xfe && body[1] === 0xff) label = 'utf-16be';
  else label = sniffCharset(body, charsetHeader).toLowerCase();

  if (!label.startsWith('utf-16') && body.subarray(0, 8000).includes(0)) {
    return null;
  }
  if (label) {
    try {
      return new TextDecoder(label).decode(body).replace(/^﻿/, '');
    } catch {
      // unbekanntes Kürzel → wie ohne Angabe
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(body)
      .replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(body);
  }
}

/**
 * Lädt eine Webseite: nur öffentliche Adressen, höchstens 5 Weiterleitungen (jede wird neu
 * geprüft), 20 s Zeit, 3 MB Text. Gibt den Text zurück oder einen fertigen Fehlertext.
 * Wirft nur, wenn `signal` abgebrochen wird.
 */
export async function fetchWebPage(
  start: URL,
  signal: AbortSignal,
  deps: WebFetchDeps = {},
): Promise<Result<FetchedPage>> {
  const config: Config = {
    isAllowedAddress: deps.isAllowedAddress ?? ((a) => !isBlockedAddress(a)),
    resolve: deps.resolve ?? defaultResolve,
    checkUrl: deps.checkUrl ?? checkWebUrl,
    timeoutMs: deps.timeoutMs ?? WEB_TIMEOUT_MS,
    maxBytes: deps.maxBytes ?? WEB_MAX_BYTES,
    userAgent:
      deps.userAgent ?? 'LocalDesk (+https://github.com/JPPM9/LocalDesk)',
  };
  let current = start;
  let redirected = false;
  try {
    for (let hop = 0; ; hop++) {
      const raw = await request(current, signal, config);
      const location = raw.headers.location;
      if (raw.status >= 300 && raw.status < 400 && location) {
        if (hop >= WEB_MAX_REDIRECTS) {
          return { ok: false, error: tr('web.tooManyRedirects') };
        }
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          return { ok: false, error: tr('web.invalidUrl') };
        }
        const checked = config.checkUrl(next.href);
        if (!checked.ok) return checked;
        current = checked.value;
        redirected = true;
        continue;
      }
      if (raw.status === 404 || raw.status === 410) {
        return { ok: false, error: tr('web.notFound') };
      }
      if (raw.status < 200 || raw.status >= 300) {
        return { ok: false, error: tr('web.status', { status: raw.status }) };
      }
      const contentType = String(
        raw.headers['content-type'] ?? '',
      ).toLowerCase();
      const text = decodeBody(raw.body, contentType);
      if (text === null) {
        return {
          ok: false,
          error: tr('web.notText', { type: contentType.split(';')[0] || '?' }),
        };
      }
      return {
        ok: true,
        value: {
          url: current.href,
          contentType: contentType.split(';')[0].trim(),
          text,
          truncated: raw.truncated,
          redirected,
        },
      };
    }
  } catch (error) {
    if (signal.aborted) throw error;
    return { ok: false, error: describe(error) };
  }
}
