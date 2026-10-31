import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from '../../src/renderer/components/chat/Markdown';

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

describe('Markdown: Bilder aus Modellantworten', () => {
  it('lädt nie ein Bild – auch keine Netzwerkpfade („//rechner/x.png“)', () => {
    for (const src of [
      '//192.0.2.10/share/a.png',
      '\\\\192.0.2.10\\share\\a.png',
      'https://example.invalid/a.png',
      'file:///C:/geheim.png',
      'data:image/png;base64,AAAA',
    ]) {
      const out = html(`![Kuchen](${src})`);
      expect(out, src).not.toContain('<img');
      expect(out, src).not.toContain('192.0.2.10');
      expect(out, src).toContain('Kuchen');
    }
  });

  it('Text und Links bleiben unverändert', () => {
    const out = html('Hallo **Welt** [Link](https://example.com)');
    expect(out).toContain('<strong>Welt</strong>');
    expect(out).toContain('href="https://example.com"');
  });
});
