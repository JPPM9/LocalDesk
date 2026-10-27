import { describe, expect, it } from 'vitest';
import {
  remarkCitations,
  splitText,
} from '../../src/renderer/components/chat/citations';

const cite = (n: number) => ({
  type: 'citation',
  children: [{ type: 'text', value: String(n) }],
  data: { hName: 'sup', hProperties: { dataSource: n } },
});

describe('splitText', () => {
  it('macht aus [1] und [1, 2] Zitat-Marken', () => {
    expect(splitText('Drei Monate [1]. Schriftlich [1, 2].', 2)).toEqual([
      { type: 'text', value: 'Drei Monate ' },
      cite(1),
      { type: 'text', value: '. Schriftlich ' },
      cite(1),
      cite(2),
      { type: 'text', value: '.' },
    ]);
  });

  it('lässt Nummern ohne passende Quelle als Text stehen', () => {
    expect(splitText('Siehe [7] und [0].', 3)).toEqual([
      { type: 'text', value: 'Siehe [7] und [0].' },
    ]);
  });
});

describe('remarkCitations', () => {
  it('fasst Code und Links nicht an', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Text [1] ' },
            { type: 'inlineCode', value: 'arr[1]' },
            { type: 'link', children: [{ type: 'text', value: '[1]' }] },
          ],
        },
        { type: 'code', value: 'x = a[1]' },
      ],
    };
    remarkCitations({ count: 1 })(tree);
    const paragraph = tree.children[0] as { children: { type: string }[] };
    expect(paragraph.children.map((c) => c.type)).toEqual([
      'text',
      'citation',
      'text',
      'inlineCode',
      'link',
    ]);
    expect(tree.children[1]).toEqual({ type: 'code', value: 'x = a[1]' });
  });

  it('macht nichts, wenn es keine Quellen gibt', () => {
    const tree = { type: 'root', children: [{ type: 'text', value: '[1]' }] };
    remarkCitations({ count: 0 })(tree);
    expect(tree.children).toEqual([{ type: 'text', value: '[1]' }]);
  });
});
