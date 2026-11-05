import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

/** Was von einer Webseite übrig bleibt: Titel und Haupttext als Markdown. */
export interface WebText {
  title: string;
  text: string;
  /** Kaum Text bei großer Seite – sie lädt ihren Inhalt vermutlich erst mit JavaScript. */
  thin: boolean;
}

/** Was nie Inhalt ist (und Readability stören würde). */
const NEVER_CONTENT =
  'script, style, noscript, template, iframe, object, embed, svg, canvas';
/** Rahmen der Seite, falls Readability keinen Haupttext findet. */
const PAGE_CHROME =
  'nav, header, footer, aside, form, button, select, dialog, [role="navigation"], [role="banner"], [role="contentinfo"]';
const MIN_ARTICLE_CHARS = 200;
const THIN_TEXT_CHARS = 200;
const THIN_PAGE_CHARS = 4_000;

/** Nur das, was wir von einem DOM-Knoten brauchen (linkedom, ohne dessen Typen zu verlangen). */
interface DomNode {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
  tagName?: string;
  getAttribute?(name: string): string | null;
}
interface DomDocument extends DomNode {
  title?: string;
  body: DomNode;
  querySelector(selector: string): DomNode | null;
  querySelectorAll(selector: string): ArrayLike<DomNode & { remove(): void }>;
}

/** Jede Folge von Leerraum (auch geschützte Leerzeichen) wird zu einem Leerzeichen. */
const collapse = (text: string) => text.replace(/\s+/g, ' ');

/** Liest HTML; null, wenn der Parser gar nichts damit anfangen kann (z. B. nur „<“). */
function parse(raw: string): DomDocument | null {
  try {
    const document = parseHTML(raw).document as unknown as DomDocument;
    return document.body ? document : null;
  } catch {
    return null;
  }
}

/** Zeilenenden, Leerzeilen und Leerzeichen am Zeilenende aufräumen. */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function strip(doc: DomDocument, selector: string) {
  for (const element of Array.from(doc.querySelectorAll(selector))) {
    element.remove();
  }
}

/** Ein Link als vollständige http(s)-Adresse; null bei Anker, „javascript:“, „mailto:“ usw. */
function absolute(
  href: string | null | undefined,
  base: string,
): string | null {
  if (!href || href.startsWith('#')) return null;
  try {
    const url = new URL(href, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

const BLOCKS = new Set([
  'p',
  'div',
  'section',
  'article',
  'main',
  'header',
  'footer',
  'aside',
  'figure',
  'figcaption',
  'details',
  'summary',
  'address',
  'dl',
  'dt',
  'dd',
]);

const block = (content: string) => {
  const text = content.trim();
  return text ? `\n\n${text}\n\n` : '';
};

/** Wandelt einen Teil des DOMs in Markdown: Überschriften, Listen, Tabellen, Code, Zitate, Links. */
function toMarkdown(root: DomNode, base: string): string {
  // Aufeinanderfolgende Textknoten (der Parser teilt sie an Zeichen-Entitäten) werden erst
  // zusammengesetzt und dann gemeinsam von überzähligen Leerzeichen befreit.
  const inlineNodes = (nodes: DomNode[]): string => {
    let out = '';
    let pending = '';
    for (const child of nodes) {
      if (child.nodeType === 3) {
        pending += child.textContent ?? '';
      } else if (child.nodeType === 1) {
        out += collapse(pending) + element(child);
        pending = '';
      }
    }
    return out + collapse(pending);
  };
  const inline = (node: DomNode): string =>
    inlineNodes(Array.from(node.childNodes));

  const list = (node: DomNode, depth: number): string => {
    const ordered = node.tagName?.toLowerCase() === 'ol';
    const lines: string[] = [];
    let n = 1;
    for (const item of Array.from(node.childNodes)) {
      if (item.nodeType !== 1 || item.tagName?.toLowerCase() !== 'li') continue;
      const content: DomNode[] = [];
      const nested: string[] = [];
      for (const child of Array.from(item.childNodes)) {
        const tag = child.nodeType === 1 ? child.tagName?.toLowerCase() : '';
        if (tag === 'ul' || tag === 'ol') nested.push(list(child, depth + 1));
        else content.push(child);
      }
      const marker = ordered ? `${n++}.` : '-';
      lines.push(
        `${'  '.repeat(depth)}${marker} ${inlineNodes(content).trim()}`,
      );
      lines.push(...nested);
    }
    return lines.join('\n');
  };

  const table = (node: DomNode): string => {
    const rows: string[] = [];
    let headerDone = false;
    const visit = (parent: DomNode) => {
      for (const child of Array.from(parent.childNodes)) {
        if (child.nodeType !== 1) continue;
        const tag = child.tagName?.toLowerCase();
        if (tag === 'tr') {
          const cells = Array.from(child.childNodes).filter(
            (c) =>
              c.nodeType === 1 &&
              ['td', 'th'].includes(c.tagName?.toLowerCase() ?? ''),
          );
          if (cells.length === 0) continue;
          const text = cells.map((c) =>
            inline(c)
              .trim()
              .replace(/\s*\n\s*/g, ' '),
          );
          rows.push(`| ${text.join(' | ')} |`);
          const hasHeader = cells.some(
            (c) => c.tagName?.toLowerCase() === 'th',
          );
          if (!headerDone && hasHeader) {
            rows.push(`| ${cells.map(() => '---').join(' | ')} |`);
          }
          headerDone = true;
        } else {
          visit(child);
        }
      }
    };
    visit(node);
    return rows.join('\n');
  };

  const element = (el: DomNode): string => {
    const tag = (el.tagName ?? '').toLowerCase();
    switch (tag) {
      case 'br':
        return '\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'img':
        return '';
      case 'a': {
        const text = inline(el).trim();
        const href = absolute(el.getAttribute?.('href'), base);
        return text && href ? `[${text}](${href})` : text;
      }
      case 'strong':
      case 'b': {
        const text = inline(el).trim();
        return text ? `**${text}**` : '';
      }
      case 'em':
      case 'i': {
        const text = inline(el).trim();
        return text ? `_${text}_` : '';
      }
      case 'code': {
        const text = (el.textContent ?? '').trim();
        return text ? `\`${text}\`` : '';
      }
      case 'pre': {
        const text = (el.textContent ?? '').replace(/^\n+|\s+$/g, '');
        return text ? `\n\n\`\`\`\n${text}\n\`\`\`\n\n` : '';
      }
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return block(`${'#'.repeat(Number(tag[1]))} ${inline(el).trim()}`);
      case 'ul':
      case 'ol':
        return block(list(el, 0));
      case 'blockquote':
        return block(
          tidy(toMarkdown(el, base))
            .split('\n')
            .map((line) => (line ? `> ${line}` : '>'))
            .join('\n'),
        );
      case 'table':
        return block(table(el));
      default:
        return BLOCKS.has(tag) ? block(inline(el)) : inline(el);
    }
  };

  return inline(root);
}

/**
 * Löst den Haupttext aus einer Seite. HTML: Readability (die Technik hinter dem Lesemodus von
 * Firefox) findet den Artikel, daraus wird Markdown; findet es nichts, bleibt der Text der Seite
 * ohne Menüs und Fußzeilen. Alles andere (Text, Markdown, JSON, XML) bleibt, wie es ist.
 * Nichts wird ausgeführt – `linkedom` liest nur das HTML.
 */
export function extractWebText(
  raw: string,
  contentType: string,
  baseUrl: string,
): WebText {
  const isHtml =
    /html/.test(contentType) ||
    (!contentType && /^\s*(<!doctype html|<html)/i.test(raw));
  if (!isHtml) return { title: '', text: tidy(raw), thin: false };

  const first = parse(raw);
  if (!first) return { title: '', text: tidy(raw), thin: false };
  strip(first, NEVER_CONTENT);
  const pageTitle = collapse(first.title ?? '').trim();

  let text = '';
  let title = pageTitle;
  try {
    const article = new Readability(first as never, {
      charThreshold: MIN_ARTICLE_CHARS,
    }).parse();
    if (article?.content) {
      const body = parse(
        `<!doctype html><html><body>${article.content}</body></html>`,
      )?.body;
      if (body) text = tidy(toMarkdown(body, baseUrl));
      title = collapse(article.title ?? '').trim() || pageTitle;
    }
  } catch {
    text = '';
  }
  // Readability gibt auch bei Seiten ohne Artikel etwas zurück (samt Menü und Fußzeile). Ist das
  // wenig, ist der Text der Seite ohne ihre Rahmen die bessere Wahl.
  if (text.length < MIN_ARTICLE_CHARS) {
    const second = parse(raw);
    if (second) {
      strip(second, NEVER_CONTENT);
      strip(second, PAGE_CHROME);
      const root =
        second.querySelector('main, article, [role="main"]') ?? second.body;
      const fallback = tidy(toMarkdown(root, baseUrl));
      if (fallback) text = fallback;
    }
  }
  return {
    title,
    text,
    thin: text.length < THIN_TEXT_CHARS && raw.length > THIN_PAGE_CHARS,
  };
}
