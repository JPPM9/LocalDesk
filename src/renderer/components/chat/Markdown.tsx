import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Links öffnen immer im normalen Browser (siehe setWindowOpenHandler im Main-Prozess).
const components: Components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer" />
  ),
};

/**
 * Zeigt Modellantworten als Markdown an. HTML im Text wird bewusst nicht
 * ausgeführt (Standard von react-markdown) – ein Modell kann so keinen Code einschleusen.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
