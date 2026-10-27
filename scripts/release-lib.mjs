// Prüfbare Bausteine für scripts/release.mjs (Tests: tests/scripts/release-lib.test.ts).
import { createHash } from 'node:crypto';

/** SemVer ohne Zusätze, z. B. 0.1.0 oder 1.2.13. */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Der Abschnitt einer Version aus CHANGELOG.md (ohne die Überschrift) –
 * oder null, wenn es ihn nicht gibt oder er leer ist.
 * @param {string} markdown
 * @param {string} version
 */
export function changelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const escaped = version.replace(/\./g, '\\.');
  const start = lines.findIndex((l) =>
    new RegExp(`^##\\s+${escaped}(\\s|$)`).test(l),
  );
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  const text = (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
  return text || null;
}

/**
 * Liest die Felder aus latest.yml, die der Update-Knopf braucht.
 * (Einfaches Format von electron-builder – kein vollständiger YAML-Parser nötig.)
 * @param {string} text
 * @returns {{ version?: string, path?: string, sha512?: string }}
 */
export function parseLatestYml(text) {
  const field = (name) =>
    new RegExp(`^${name}:\\s*['"]?([^'"\\r\\n]+?)['"]?\\s*$`, 'm').exec(
      text,
    )?.[1];
  return {
    version: field('version'),
    path: field('path'),
    sha512: field('sha512'),
  };
}

/**
 * SHA-512 als Base64 – so steht die Prüfsumme in latest.yml.
 * @param {Uint8Array} bytes
 */
export function sha512Base64(bytes) {
  return createHash('sha512').update(bytes).digest('base64');
}
