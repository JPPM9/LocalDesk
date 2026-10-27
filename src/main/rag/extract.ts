/**
 * Text aus PDF und Word holen. Läuft im Hintergrund-Thread (extract-worker.ts),
 * damit eine große oder präparierte Datei den Main-Prozess nicht blockiert.
 */
import mammoth from 'mammoth';

/** Text einer PDF, Seite für Seite (Index 0 = Seite 1). */
export async function extractPdf(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    // Kopie als reines Uint8Array: pdf.js lehnt Node-Buffer ab und übernimmt die Daten.
    data: new Uint8Array(bytes),
    // Keine Schriften ins System laden und nichts nachladen – wir brauchen nur Text.
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: false,
    // Hinweise von pdf.js (z. B. „DOMMatrix fehlt“ – nur fürs Zeichnen nötig) nur bei Fehlern.
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(joinTextItems(content.items));
      page.cleanup();
    }
    return pages;
  } finally {
    // Gibt den Speicher frei – auch wenn die Datei kaputt war.
    await task.destroy();
  }
}

/** Ein Textstück aus pdf.js (nur die Felder, die wir nutzen). */
interface TextItem {
  str?: string;
  hasEOL?: boolean;
}

/**
 * pdf.js liefert Textstücke mit „Zeilenende“-Markierung. Daraus wird normaler
 * Text; Silbentrennung am Zeilenende („Kündi-\ngung“) wird wieder zusammengefügt.
 */
export function joinTextItems(items: unknown[]): string {
  let text = '';
  for (const raw of items) {
    const item = raw as TextItem;
    if (typeof item.str !== 'string') continue;
    text += item.str;
    if (item.hasEOL) text += '\n';
  }
  return text
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Word-Datei als Markdown – Überschriften bleiben erhalten, Bilder fallen weg. */
export async function extractDocx(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.convertToHtml(
    { buffer: Buffer.from(bytes) },
    {
      // Bilder nicht als riesigen Base64-Text einbetten.
      convertImage: mammoth.images.imgElement(async () => ({ src: '' })),
    },
  );
  return htmlToMarkdown(result.value);
}

/**
 * Wandelt das schlichte HTML von mammoth in Markdown: Überschriften als „#“,
 * Listen als „-“, Tabellenzellen mit „|“. Mehr braucht die Suche nicht.
 */
export function htmlToMarkdown(html: string): string {
  return (
    decodeEntities(
      html
        .replace(
          /<h([1-6])[^>]*>/gi,
          (_, level: string) => `\n\n${'#'.repeat(Number(level))} `,
        )
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<\/(p|ul|ol|table)>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/t[dh]>/gi, ' | ')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<[^>]+>/g, ''),
    )
      .replace(/[ \t]+\n/g, '\n')
      // Leere Aufzählungspunkte (in Word oft als Abstandhalter benutzt)
      .replace(/^- *(\n|$)/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&amp;/g, '&');
}

type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsPromise: Promise<Pdfjs> | null = null;

/**
 * pdf.js erst bei Bedarf laden. Den „Worker“ von pdf.js geben wir direkt mit –
 * sonst sucht er eine eigene Datei, die es im fertigen Paket nicht gibt.
 */
function loadPdfjs(): Promise<Pdfjs> {
  pdfjsPromise ??= (async () => {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
    return import('pdfjs-dist/legacy/build/pdf.mjs');
  })();
  return pdfjsPromise;
}
