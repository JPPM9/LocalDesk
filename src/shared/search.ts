/** Steuerzeichen, die im Textausschnitt einen Treffer einrahmen (kommen in normalem Text nicht vor). */
export const HIGHLIGHT_START = '\u0002';
export const HIGHLIGHT_END = '\u0003';

const MAX_TERMS = 10;

/** Zerlegt die Eingabe in Suchwörter (Leerzeichen trennen). */
export function searchTerms(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TERMS);
}

/**
 * Baut aus der Eingabe eine sichere FTS5-Abfrage: Jedes Wort wird in
 * Anführungszeichen gesetzt (so werden Zeichen wie `-`, `*`, `:` oder `OR` nicht
 * als Befehle gelesen) und mit `*` als Wortanfang gesucht. Alle Wörter müssen vorkommen.
 * Gibt null zurück, wenn nichts zu suchen ist.
 */
export function buildFtsQuery(input: string): string | null {
  const terms = searchTerms(input);
  if (terms.length === 0) return null;
  return terms.map((term) => `"${term.replaceAll('"', '""')}"*`).join(' ');
}

/**
 * Teilt einen Textausschnitt in normale und hervorgehobene Stücke – zum Anzeigen ohne HTML.
 * Markdown-Zeichen für fett und Code (`**`, `__`, Backticks) werden dabei entfernt;
 * einzelne `_` bleiben, damit Namen wie `is_prime` lesbar bleiben.
 */
export function splitHighlights(
  snippet: string,
): { text: string; highlight: boolean }[] {
  const parts: { text: string; highlight: boolean }[] = [];
  let rest = snippet.replace(/\*\*|__|`/g, '');
  while (rest) {
    const start = rest.indexOf(HIGHLIGHT_START);
    if (start === -1) {
      parts.push({ text: rest, highlight: false });
      break;
    }
    if (start > 0) parts.push({ text: rest.slice(0, start), highlight: false });
    const end = rest.indexOf(HIGHLIGHT_END, start);
    const stop = end === -1 ? rest.length : end;
    parts.push({ text: rest.slice(start + 1, stop), highlight: true });
    rest = end === -1 ? '' : rest.slice(end + 1);
  }
  return parts.filter((p) => p.text !== '');
}
