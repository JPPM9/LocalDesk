import type { Result, ServerKind } from './api';
import { tr } from './messages';

export const OLLAMA_DEFAULT_PORT = 11434;

/**
 * So heißt der Server, den die Datenbank beim ersten Start anlegt (steht in database.ts).
 * Angezeigt wird er in der gewählten Sprache („Dieser PC“ / „This PC“); alles andere
 * ist ein Name, den du selbst vergeben hast.
 */
export const DEFAULT_SERVER_NAME = 'Dieser PC';

/**
 * Macht aus einer Eingabe wie „192.168.1.20“ oder „pc-wohnzimmer:11434“ eine
 * vollständige Server-Adresse (http://…:11434). Erlaubt sind nur http und https
 * ohne Pfad, Benutzername oder Passwort – es geht ausschließlich um einen Ollama-Server.
 */
export function normalizeServerUrl(
  input: string,
  kind: ServerKind = 'ollama',
): Result<string> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: tr('server.addressMissing') };

  // Ohne „http://“ davor versteht der URL-Parser „pc:11434“ falsch.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: tr('server.addressInvalid') };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: tr('server.protocolOnly') };
  }
  if (!url.hostname) {
    return {
      ok: false,
      error: tr('server.hostMissing'),
    };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      error: tr('server.noCredentials'),
    };
  }
  if (kind === 'openai') return normalizeOpenAiUrl(url, withScheme);
  if (url.pathname !== '/' || url.search || url.hash) {
    return {
      ok: false,
      error: tr('server.noPath'),
    };
  }

  // Ohne Port nimmt Ollama 11434 – nicht den Standard-Port von http (80).
  // Den Port lesen wir aus der Eingabe selbst: Der URL-Parser „verschluckt“
  // Standard-Ports (:80 bei http, :443 bei https) und sie wären nicht mehr zu erkennen.
  const authority = withScheme
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .split(/[/?#]/)[0];
  const hasExplicitPort = /:\d+$/.test(authority);
  const port = hasExplicitPort
    ? url.port || defaultPort(url.protocol)
    : String(OLLAMA_DEFAULT_PORT);
  return { ok: true, value: `${url.protocol}//${url.hostname}:${port}` };
}

/** Standard-Port von LM Studio (http ohne Port). */
export const OPENAI_LOCAL_PORT = 1234;

/**
 * OpenAI-kompatible Server: Pfad erlaubt (meist „/v1“; fehlt er, wird „/v1“ ergänzt).
 * Ohne Port gilt bei http der von LM Studio (1234), bei https der Standard-Port.
 */
function normalizeOpenAiUrl(url: URL, withScheme: string): Result<string> {
  if (url.search || url.hash) return { ok: false, error: tr('server.noPath') };
  const authority = withScheme
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .split(/[/?#]/)[0];
  const explicit = /:\d+$/.test(authority);
  const port = explicit
    ? url.port || defaultPort(url.protocol)
    : url.protocol === 'http:'
      ? String(OPENAI_LOCAL_PORT)
      : '';
  const path = url.pathname.replace(/\/+$/, '') || '/v1';
  const host = `${url.protocol}//${url.hostname}${port ? `:${port}` : ''}`;
  return { ok: true, value: `${host}${path}` };
}

/** Liegt der Server im eigenen Netz (dieser PC, Heimnetz)? Sonst verlassen Daten dein Netz. */
export function isPrivateHost(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return (
      host === 'localhost' ||
      host === '[::1]' ||
      !host.includes('.') ||
      host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
    );
  } catch {
    return false;
  }
}

function defaultPort(protocol: string) {
  return protocol === 'https:' ? '443' : '80';
}

/** Zeigt die Adresse auf diesen Rechner? (Nur dann kann die App später die GPU-Last messen.) */
export function isLocalServer(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}
