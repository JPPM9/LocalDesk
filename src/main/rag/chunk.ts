/** Ein Abschnitt eines Dokuments, wie er eingebettet und später als Quelle gezeigt wird. */
export interface Chunk {
  text: string;
  /** Position im Originaltext (Zeichen), um die Stelle später wiederzufinden. */
  start: number;
  end: number;
  /** Überschriften-Pfad bei Markdown, z. B. „LocalDesk › Wo liegen meine Daten?“. */
  heading?: string;
  /** Seite bei PDFs (ab 1); Positionen gelten dann innerhalb dieser Seite. */
  page?: number;
}

export interface ChunkOptions {
  /** Ziel-Länge eines Abschnitts in Zeichen (ca. 400 Tokens bei 1500). */
  size: number;
  /** So viele Zeichen teilt ein Abschnitt mit dem vorherigen. */
  overlap: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { size: 1500, overlap: 200 };

/**
 * Zerlegt Text in Abschnitte. Geschnitten wird möglichst an einer Leerzeile
 * (Absatz), sonst am Zeilenende, sonst am Satzende, sonst an einem Leerzeichen –
 * und nur im Notfall mitten im Wort. Aufeinanderfolgende Abschnitte überlappen,
 * damit ein Gedanke an der Grenze in beiden vorkommt.
 */
export function chunkText(
  text: string,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): Chunk[] {
  const { size, overlap } = options;
  if (overlap >= size) throw new Error('overlap muss kleiner als size sein');
  const chunks: Chunk[] = [];
  let start = skipWhitespace(text, 0);

  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) end = findBreak(text, start, end, size);

    const piece = text.slice(start, end).trim();
    if (piece) chunks.push({ text: piece, start, end });
    if (end >= text.length) break;

    // Nächster Abschnitt beginnt etwas vor dem Ende – möglichst an einem Wortanfang.
    let next = Math.max(end - overlap, start + 1);
    const space = text.indexOf(' ', next);
    if (overlap > 0 && space !== -1 && space < end) next = space + 1;
    start = skipWhitespace(text, overlap > 0 ? next : end);
  }
  return chunks;
}

/**
 * Markdown zuerst an Überschriften trennen: Ein Abschnitt mit mehreren Themen hat
 * einen „verwaschenen“ Fingerabdruck und passt zu keiner Frage richtig (im Test fiel
 * „Wo liegen meine Daten?“ so aus den ersten sechs Treffern). Lange Kapitel werden
 * danach wie normaler Text zerlegt; jeder Teil merkt sich seine Überschriften.
 */
export function chunkMarkdown(
  text: string,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of splitSections(text)) {
    const heading = section.heading;
    for (const chunk of chunkText(section.body, options)) {
      chunks.push({
        ...chunk,
        start: chunk.start + section.offset,
        end: chunk.end + section.offset,
        ...(heading && { heading }),
      });
    }
  }
  return chunks;
}

/** Text, der eingebettet wird: Überschrift als Zusammenhang vor den Abschnitt. */
export function embeddingText(chunk: Chunk): string {
  return chunk.heading ? `${chunk.heading}\n\n${chunk.text}` : chunk.text;
}

interface Section {
  /** Überschriften-Pfad bis hierher; fehlt vor der ersten Überschrift. */
  heading?: string;
  body: string;
  offset: number;
}

/** Teilt an Zeilen wie „## Titel“ – aber nicht innerhalb von Code-Blöcken (```). */
function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  const path: string[] = [];
  let current: Section = { body: '', offset: 0 };
  let inCode = false;
  let position = 0;
  for (const line of text.split(/(?<=\n)/)) {
    if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
    const match = inCode ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      sections.push(current);
      const level = match[1].length;
      path.length = level - 1; // tiefere Ebenen der vorigen Überschrift fallen weg
      path[level - 1] = match[2];
      current = {
        heading: path.filter(Boolean).join(' › '),
        body: line,
        offset: position,
      };
    } else {
      current.body += line;
    }
    position += line.length;
  }
  sections.push(current);
  // Eine Überschrift ohne eigenen Text (direkt gefolgt von einer Unterüberschrift)
  // ergäbe einen Abschnitt nur aus dem Titel – der wirkt über `heading` weiter.
  return sections.filter(
    (s) => s.body.replace(/^#{1,6}\s+.*\n?/, '').trim() !== '',
  );
}

/** Sucht in der hinteren Hälfte des Fensters die „schönste“ Stelle zum Schneiden. */
function findBreak(
  text: string,
  start: number,
  end: number,
  size: number,
): number {
  const earliest = start + Math.floor(size / 2);
  const window = text.slice(earliest, end);
  const candidates: RegExp[] = [
    /\n\s*\n/g, // Absatz
    /\n/g, // Zeile
    /[.!?…]["»”)]?\s/g, // Satzende
    /\s/g, // Wort
  ];
  for (const pattern of candidates) {
    let last = -1;
    for (const match of window.matchAll(pattern)) {
      last = match.index + match[0].length;
    }
    if (last > 0) return earliest + last;
  }
  return end;
}

function skipWhitespace(text: string, index: number): number {
  while (index < text.length && /\s/.test(text[index])) index++;
  return index;
}
