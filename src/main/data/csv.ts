/**
 * Ein eigener CSV-Leser (RFC 4180 mit den üblichen Abweichungen): Anführungszeichen mit „""“,
 * Zeilenumbrüche in Feldern, \r\n und \n, leere Zeilen werden übersprungen. Das Trennzeichen
 * (Komma, Semikolon, Tabulator, Strich) wird an den ersten Zeilen erkannt.
 */

export type Delimiter = ',' | ';' | '\t' | '|';
const CANDIDATES: readonly Delimiter[] = [',', ';', '\t', '|'];

/** So viel vom Anfang genügt, um das Trennzeichen zu erkennen. */
const SNIFF_CHARS = 32_768;
const SNIFF_LINES = 30;

/** Zählt, wie oft `delimiter` je Zeile außerhalb von Anführungszeichen vorkommt (erste Zeilen). */
function countPerLine(text: string, delimiter: Delimiter): number[] {
  const counts: number[] = [];
  let inQuotes = false;
  let count = 0;
  let hasContent = false;
  for (let i = 0; i < text.length && counts.length < SNIFF_LINES; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      hasContent = true;
    } else if (!inQuotes && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (hasContent) counts.push(count);
      count = 0;
      hasContent = false;
    } else if (!inQuotes && c === delimiter) {
      count++;
      hasContent = true;
    } else if (c !== ' ') {
      hasContent = true;
    }
  }
  if (hasContent && counts.length < SNIFF_LINES) counts.push(count);
  return counts;
}

/**
 * Das Trennzeichen: das, das in den ersten Zeilen am gleichmäßigsten (gleich oft, mindestens
 * einmal) vorkommt. Bei Gleichstand gilt die Reihenfolge Komma, Semikolon, Tabulator, Strich.
 * Gibt es nirgends eines (eine Spalte), ist es das Komma.
 */
export function detectDelimiter(text: string): Delimiter {
  const sample = text.slice(0, SNIFF_CHARS);
  let best: Delimiter = ',';
  let bestScore = 0;
  for (const delimiter of CANDIDATES) {
    const counts = countPerLine(sample, delimiter);
    if (counts.length === 0) continue;
    const typical = [...counts].sort((a, b) => a - b)[
      Math.floor(counts.length / 2)
    ];
    if (typical === 0) continue;
    const consistent =
      counts.filter((n) => n === typical).length / counts.length;
    // Gleichmäßig verteilt zählt mehr als nur häufig.
    const score = consistent * 100 + Math.min(typical, 50);
    if (score > bestScore + 0.001) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

export interface CsvResult {
  rows: string[][];
  /** Es gab mehr Zeilen als `maxRows` – der Rest wurde nicht gelesen. */
  truncated: boolean;
}

/**
 * Liest den Text in Zeilen von Feldern. Gelesen werden höchstens `maxRows` Zeilen
 * (danach `truncated`). Leere Zeilen fallen weg; ein Anführungszeichen, das nie schließt,
 * läuft bis zum Ende des Textes.
 */
export function parseCsv(
  text: string,
  delimiter: Delimiter,
  maxRows = Number.POSITIVE_INFINITY,
): CsvResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let quoted = false;
  let truncated = false;

  const endField = () => {
    row.push(field);
    field = '';
    quoted = false;
  };
  const endRow = (): boolean => {
    const wasQuoted = quoted;
    endField();
    const empty = row.length === 1 && row[0] === '' && !wasQuoted;
    if (!empty) {
      if (rows.length >= maxRows) {
        truncated = true;
        return false;
      }
      rows.push(row);
    }
    row = [];
    return true;
  };

  const length = text.length;
  for (let i = 0; i < length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      inQuotes = true;
      quoted = true;
    } else if (c === delimiter) {
      endField();
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (!endRow()) return { rows, truncated };
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0 || quoted) endRow();
  return { rows, truncated };
}
