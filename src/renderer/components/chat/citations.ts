/**
 * Markdown-Plugin: macht aus „[1]“ oder „[1, 3]“ im Antworttext kleine Marken,
 * die zur Quelle springen. Nur Nummern, zu denen es eine Quelle gibt – erfundene
 * Nummern bleiben normaler Text. Code und Links bleiben unberührt (dort ist „[1]“
 * meist etwas anderes, z. B. ein Array-Zugriff).
 */

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const CITATION = /\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g;
const SKIP = new Set(['code', 'inlineCode', 'link', 'linkReference']);

export function remarkCitations(options: { count: number }) {
  return (tree: MdNode) => {
    if (options.count > 0) walk(tree, options.count);
  };
}

function walk(node: MdNode, count: number) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (SKIP.has(child.type)) return [child];
    if (child.type === 'text' && child.value)
      return splitText(child.value, count);
    walk(child, count);
    return [child];
  });
}

/** Zerlegt einen Text in normale Stücke und Zitat-Marken. */
export function splitText(text: string, count: number): MdNode[] {
  const nodes: MdNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION)) {
    const numbers = match[1].split(',').map((n) => Number(n.trim()));
    if (!numbers.every((n) => n >= 1 && n <= count)) continue;
    if (match.index > last) {
      nodes.push({ type: 'text', value: text.slice(last, match.index) });
    }
    for (const n of numbers) nodes.push(citation(n));
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes.length > 0 ? nodes : [{ type: 'text', value: text }];
}

function citation(n: number): MdNode {
  return {
    type: 'citation',
    children: [{ type: 'text', value: String(n) }],
    // Wird als <sup data-source="n"> ausgegeben; Markdown.tsx macht daraus einen Knopf.
    data: { hName: 'sup', hProperties: { dataSource: n } },
  };
}
