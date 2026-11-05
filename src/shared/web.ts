/**
 * Internet lesen: Das Modell darf mit dem Werkzeug „read_webpage“ eine Webseite lesen
 * (Schalter „Internet“ im Chat). Gelesen wird nur Text, ohne Skripte und ohne Anmeldung.
 * Adressen, die du selbst in deine Nachricht schreibst, werden ohne Rückfrage gelesen,
 * alle anderen fragen nach (Karte mit der ganzen Adresse).
 */

/** Kennung des Werkzeug-Servers „Internet“. */
export const WEB_TOOL_SERVER = 'internet';
export const WEB_TOOL_NAME = 'read_webpage';

/** Längste Adresse, die gelesen wird. */
export const WEB_URL_MAX = 2000;
export const WEB_TIMEOUT_MS = 20_000;
/** So viel einer Seite wird höchstens heruntergeladen (nach dem Entpacken). */
export const WEB_MAX_BYTES = 3_000_000;
export const WEB_MAX_REDIRECTS = 5;
/**
 * Ein Aufruf liefert höchstens so viele Zeichen Text (das Modell liest mit `offset` weiter).
 * Etwas weniger als `TOOL_RESULT_MAX` (20 000), damit der Rahmen und der Hinweis zum Weiterlesen
 * nie abgeschnitten werden.
 */
export const WEB_PAGE_MAX_CHARS = 18_000;
export const WEB_PAGE_MIN_CHARS = 2_000;
/** So viel vom Kontext darf ein Aufruf belegen. */
export const WEB_CONTEXT_SHARE = 0.35;

const CHARS_PER_TOKEN = 4;

/** Wie viele Zeichen eine Seite pro Aufruf liefert: ein Teil des Kontexts, nie mehr als 18 000. */
export function webPageChars(contextLength: number): number {
  const share = Math.floor(contextLength * CHARS_PER_TOKEN * WEB_CONTEXT_SHARE);
  return Math.min(WEB_PAGE_MAX_CHARS, Math.max(WEB_PAGE_MIN_CHARS, share));
}

/** Zeichen, die am Ende eines Links im Fließtext nicht mehr dazugehören („…siehe https://a.de.“). */
const TRAILING = new Set('.,;:!?»”’"\''.split(''));
const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

const count = (text: string, char: string) => text.split(char).length - 1;

/**
 * Die Adresse in einer Form, in der sich zwei Schreibweisen vergleichen lassen: ohne Anker,
 * mit „/“ nach der Domain. null, wenn es keine http(s)-Adresse ist.
 */
export function normalizeLink(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

/** Alle http(s)-Adressen in einem Text, normalisiert und ohne Doppelte. */
export function extractLinks(text: string): string[] {
  const found = new Set<string>();
  // Anführungszeichen (auch typografische) beenden eine Adresse.
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`“”„‘’«»‹›]+/gi)) {
    let link = match[0];
    // Satzzeichen und eine schließende Klammer, zu der es keine öffnende gibt, abschneiden.
    for (;;) {
      const last = link.at(-1) ?? '';
      const open = PAIRS[last];
      if (
        TRAILING.has(last) ||
        (open && count(link, open) < count(link, last))
      ) {
        link = link.slice(0, -1);
      } else {
        break;
      }
    }
    const normalized = normalizeLink(link);
    if (normalized) found.add(normalized);
  }
  return [...found];
}
