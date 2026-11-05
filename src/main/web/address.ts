import type { Result } from '../../shared/api';
import { tr } from '../../shared/messages';
import { WEB_URL_MAX } from '../../shared/web';

/**
 * Welche Adressen darf LocalDesk im Internet lesen? Nur öffentliche Webseiten: nichts in
 * deinem Heimnetz, nichts auf diesem PC (auch nicht dein Ollama) und nichts bei den
 * Cloud-Diensten, die unter 169.254.169.254 Zugangsdaten herausgeben. Geprüft wird zweimal:
 * hier an der Adresse selbst und beim Verbindungsaufbau an der Adresse, die der Domainname
 * tatsächlich hat (siehe fetch.ts) – sonst könnte eine Domain auf 127.0.0.1 zeigen.
 */

/** Dotted-decimal IPv4: genau vier Zahlen 0–255 ohne führende Nullen (alles andere ist mehrdeutig). */
function parseIPv4(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) =>
    /^(0|[1-9]\d{0,2})$/.test(part) ? Number(part) : Number.NaN,
  );
  return numbers.every((n) => n >= 0 && n <= 255) ? numbers : null;
}

/** IPv6 als acht Gruppen zu je 16 Bit (auch mit „::“ und IPv4-Endung); Zonen („%…“) gelten als ungültig. */
function parseIPv6(text: string): number[] | null {
  if (text.includes('%')) return null;
  let s = text.toLowerCase();
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) {
    const v4 = parseIPv4(tail[1]);
    if (!v4) return null;
    s =
      s.slice(0, -tail[1].length) +
      ((v4[0] << 8) | v4[1]).toString(16) +
      ':' +
      ((v4[2] << 8) | v4[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [
    ...left,
    ...Array.from({ length: Math.max(0, missing) }, () => '0'),
    ...right,
  ];
  const numbers = groups.map((g) =>
    /^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : Number.NaN,
  );
  return numbers.length === 8 && numbers.every((n) => !Number.isNaN(n))
    ? numbers
    : null;
}

function blockedIPv4([a, b, c]: number[]): boolean {
  return (
    a === 0 || // „dieses Netz“
    a === 10 ||
    a === 127 || // dieser PC
    (a === 100 && b >= 64 && b <= 127) || // Provider-Netz (CGNAT)
    (a === 169 && b === 254) || // Link-Lokal, auch Cloud-Zugangsdaten (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // Multicast und reserviert, auch 255.255.255.255
  );
}

function blockedIPv6(g: number[]): boolean {
  const embedded = (hi: number, lo: number) =>
    blockedIPv4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  const zeros = (from: number, to: number) =>
    g.slice(from, to).every((n) => n === 0);
  // IPv4 in IPv6: ::ffff:a.b.c.d, ::a.b.c.d (veraltet, samt „::“ und „::1“), 64:ff9b::a.b.c.d, 6to4
  if (zeros(0, 5) && g[5] === 0xffff) return embedded(g[6], g[7]);
  if (zeros(0, 6)) return true;
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) {
    return embedded(g[6], g[7]);
  }
  if (g[0] === 0x2002) return embedded(g[1], g[2]);
  // Nur öffentliche Adressen (2000::/3) – ohne Teredo und die Dokumentationsadressen.
  if ((g[0] & 0xe000) !== 0x2000) return true;
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0xdb8)) return true;
  return false;
}

/**
 * Ist das eine Adresse, zu der LocalDesk nie verbindet? Alles, was keine gültige
 * öffentliche IPv4- oder IPv6-Adresse ist, gilt als gesperrt.
 */
export function isBlockedAddress(address: string): boolean {
  const bare = address.replace(/^\[|\]$/g, '');
  const v4 = parseIPv4(bare);
  if (v4) return blockedIPv4(v4);
  const v6 = parseIPv6(bare);
  return v6 ? blockedIPv6(v6) : true;
}

/** Namen, die nie im Internet liegen (Heimnetz, Firmennetz, dieser PC). */
const LOCAL_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.lan',
  '.home',
  '.localdomain',
  '.home.arpa',
  '.corp',
];
const DOMAIN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

const invalid = () => ({ ok: false as const, error: tr('web.invalidUrl') });
const blocked = () => ({
  ok: false as const,
  error: tr('web.blockedAddress'),
});

/**
 * Prüft eine Adresse, bevor irgendetwas geladen wird: nur http/https, ohne Zugangsdaten, nur
 * der Standard-Port, ein Domainname mit Punkt (kein „localhost“, kein Name aus dem Heimnetz)
 * oder eine öffentliche IP-Adresse. Die Schreibweisen von IP-Adressen (0x7f.1, 2130706433,
 * [::ffff:127.0.0.1]) normalisiert `new URL` schon vorher.
 */
export function checkWebUrl(raw: string): Result<URL> {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > WEB_URL_MAX) {
    return invalid();
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return invalid();
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return invalid();
  // `new URL` lässt den Standard-Port weg – steht noch einer da, ist es ein anderer.
  if (url.username || url.password || url.port) return invalid();

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[')) {
    return isBlockedAddress(host) ? blocked() : { ok: true, value: url };
  }
  if (/^[\d.]+$/.test(host)) {
    return isBlockedAddress(host) ? blocked() : { ok: true, value: url };
  }
  // Namen ohne Punkt (Rechner im Heimnetz) und Namen aus dem Heimnetz/Firmennetz sind privat.
  if (
    host === 'localhost' ||
    !host.includes('.') ||
    LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    return blocked();
  }
  if (!DOMAIN.test(host)) return invalid();
  return { ok: true, value: url };
}
