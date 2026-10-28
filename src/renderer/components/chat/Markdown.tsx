import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { remarkCitations } from './citations';

interface MarkdownProps {
  text: string;
  /** Anzahl der Quellen – nur deren Nummern werden zu anklickbaren Marken. */
  sourceCount?: number;
  onCite?: (n: number) => void;
}

/**
 * Zeigt Modellantworten als Markdown an. HTML im Text wird bewusst nicht
 * ausgeführt (Standard von react-markdown) – ein Modell kann so keinen Code einschleusen.
 */
export function Markdown({ text, sourceCount = 0, onCite }: MarkdownProps) {
  const components: Components = {
    // Links öffnen immer im normalen Browser (siehe setWindowOpenHandler im Main-Prozess).
    a: ({ node: _node, ...props }) => (
      <a {...props} target="_blank" rel="noreferrer" />
    ),
    // Zitat-Marken aus remarkCitations („[1]“) werden zu Knöpfen, die zur Quelle springen.
    sup: ({ node: _node, children, ...props }) => {
      const n = Number((props as { 'data-source'?: string })['data-source']);
      if (!n) return <sup {...props}>{children}</sup>;
      return (
        <button
          type="button"
          onClick={() => onCite?.(n)}
          className="mx-0.5 rounded bg-accent-soft px-1 align-super font-mono text-[10px] leading-none text-accent-text hover:bg-accent hover:text-white"
        >
          {children}
        </button>
      );
    },
  };
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkCitations, { count: sourceCount }]]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
