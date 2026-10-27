/** Erinnerungen kommen schon über die System-Nachricht in jeden Chat – nicht doppelt suchen. */
const MEMORY_TAG = 'localdesk/erinnerung';
const IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

export interface ObsidianNote {
  /** Text ohne Datei-Kopf, Wiki-Links als lesbarer Text, ohne %%Kommentare%%. */
  text: string;
  /** Tags aus dem Kopf und aus dem Text (ohne „#“), ohne Doppelte. */
  tags: string[];
  /** LocalDesk-Erinnerung – wird nicht als Wissen eingelesen. */
  isMemory: boolean;
}

/**
 * Bereitet eine Obsidian-Notiz für die Suche auf. Der Datei-Kopf (Frontmatter)
 * zählt nicht als Text, seine Tags dienen aber als Zusammenhang.
 */
export function prepareObsidianNote(raw: string): ObsidianNote {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(raw);
  const front = match?.[1] ?? '';
  let body = match ? raw.slice(match[0].length) : raw;

  body = body
    .replace(/%%[\s\S]*?%%/g, '')
    // Eingebettete Bilder tragen keinen Text.
    .replace(/!\[\[([^\]]+)\]\]/g, (_all, inner: string) =>
      IMAGE.test(inner.split('|')[0].trim()) ? '' : `[[${inner}]]`,
    )
    .replace(/\[\[([^\]]+)\]\]/g, (_all, inner: string) => wikiLinkText(inner));

  const tags = [...frontmatterTags(front), ...inlineTags(body)];
  const unique = [
    ...new Set(tags.map((t) => t.replace(/^#/, '').trim()).filter(Boolean)),
  ];
  return {
    text: body.trim(),
    tags: unique,
    isMemory: unique.some((t) => t.toLowerCase() === MEMORY_TAG),
  };
}

/** [[Ordner/Notiz#Abschnitt|Anzeige]] → „Anzeige“, sonst „Notiz › Abschnitt“. */
function wikiLinkText(inner: string): string {
  const [target, alias] = inner.split('|');
  if (alias?.trim()) return alias.trim();
  const [file, section] = target.split('#');
  const name = file.trim().split('/').pop()!.replace(/\.md$/i, '');
  // Block-Verweise (#^abc123) sind nur IDs.
  const heading = section && !section.startsWith('^') ? section.trim() : '';
  if (!name) return heading;
  return heading ? `${name} › ${heading}` : name;
}

/** Tags im Kopf: `tags: [a, b]`, `tags: a, b` oder als Liste darunter. */
function frontmatterTags(front: string): string[] {
  const lines = front.split(/\r?\n/);
  const tags: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(tags?)\s*:\s*(.*)$/i.exec(lines[i]);
    if (!m) continue;
    const value = m[2].trim();
    if (value) {
      tags.push(
        ...value
          .replace(/^\[|\]$/g, '')
          .split(/[,\s]+/)
          .map(unquote),
      );
    } else {
      for (let j = i + 1; j < lines.length; j++) {
        const item = /^\s*-\s*(.+)$/.exec(lines[j]);
        if (!item) break;
        tags.push(unquote(item[1]));
      }
    }
  }
  return tags;
}

/** #tag im Text – aber keine Überschriften („# Titel“), Zahlen („#3“) oder Links (…/#anker). */
function inlineTags(body: string): string[] {
  return [...body.matchAll(/(?:^|[\s(])#([\p{L}_][\p{L}\p{N}_/-]*)/gu)].map(
    (m) => m[1],
  );
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '');
}
