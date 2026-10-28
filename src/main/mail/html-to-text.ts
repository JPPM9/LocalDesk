/**
 * Macht aus HTML-Mails lesbaren Text. Das Ergebnis wird nie als HTML angezeigt,
 * nur als Text – deshalb reicht eine einfache Umwandlung: Unsichtbares weg,
 * Absätze und Listen als Zeilen, Links mit Adresse, Zeichen-Codes aufgelöst.
 * Bilder (auch Tracking-Pixel) verschwinden dabei ganz.
 */
export function htmlToText(html: string): string {
  let text = html
    // Kommentare und unsichtbare Bereiche samt Inhalt
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<(head|style|script|title|template|noscript)\b[\s\S]*?<\/\1\s*>/gi,
      '',
    )
    // Links: „Text (Adresse)“, wenn die Adresse etwas anderes sagt als der Text
    .replace(
      /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
      (_match, _quote, href: string, inner: string) => {
        const label = stripTags(inner).trim();
        const url = decodeEntities(href).trim();
        if (!/^https?:/i.test(url) || !label || label === url) return inner;
        return `${inner} (${url})`;
      },
    )
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(
      /<\/(p|div|h[1-6]|tr|ul|ol|table|blockquote|section|article)\s*>/gi,
      '\n',
    )
    // Absätze und Überschriften bekommen eine Leerzeile davor, Zeilen und Blöcke nicht.
    .replace(/<(p|h[1-6]|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<\/t[dh]\s*>/gi, '\t')
    .replace(/<hr\b[^>]*>/gi, '\n———\n');

  text = decodeEntities(stripTags(text));

  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
  zwnj: '',
  zwj: '',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  euro: '€',
  copy: '©',
  reg: '®',
  trade: '™',
  middot: '·',
  bull: '•',
  rarr: '→',
  larr: '←',
  uarr: '↑',
  darr: '↓',
  harr: '↔',
  times: '×',
  divide: '÷',
  deg: '°',
  plusmn: '±',
  sect: '§',
  para: '¶',
  pound: '£',
  yen: '¥',
  cent: '¢',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  iexcl: '¡',
  iquest: '¿',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
};

/** Löst &amp;, &#39;, &#x2019; usw. auf (auch für Gmails Vorschautexte). */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,15});/gi,
    (match, code: string) => {
      if (code[0] === '#') {
        const point =
          code[1] === 'x' || code[1] === 'X'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return point > 0 &&
          point <= 0x10ffff &&
          !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : match;
      }
      return NAMED[code] ?? match;
    },
  );
}
