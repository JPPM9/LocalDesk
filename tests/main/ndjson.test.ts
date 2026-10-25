import { describe, expect, it } from 'vitest';
import { readNdjson } from '../../src/main/providers/ndjson';

// Baut einen Netzwerk-Strom nach, der genau diese Byte-Pakete liefert.
function streamOf(...chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

const bytes = (text: string) => new TextEncoder().encode(text);

async function collect(stream: ReadableStream<Uint8Array>) {
  const items: unknown[] = [];
  for await (const item of readNdjson(stream)) items.push(item);
  return items;
}

describe('readNdjson', () => {
  it('liest ein Objekt pro Zeile', async () => {
    const result = await collect(streamOf(bytes('{"a":1}\n{"a":2}\n')));
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('setzt Zeilen zusammen, die über mehrere Pakete verteilt sind', async () => {
    const result = await collect(
      streamOf(bytes('{"te'), bytes('xt":"Hal'), bytes('lo"}\n')),
    );
    expect(result).toEqual([{ text: 'Hallo' }]);
  });

  it('übersteht einen Umlaut, der mitten im Zeichen getrennt wird', async () => {
    const all = bytes('{"text":"ü"}\n');
    const split = all.indexOf(0xc3) + 1; // „ü“ besteht aus zwei Bytes: C3 BC
    const result = await collect(
      streamOf(all.slice(0, split), all.slice(split)),
    );
    expect(result).toEqual([{ text: 'ü' }]);
  });

  it('liest auch die letzte Zeile ohne Zeilenumbruch und überspringt Leerzeilen', async () => {
    const result = await collect(streamOf(bytes('{"a":1}\n\n{"a":2}')));
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });
});
