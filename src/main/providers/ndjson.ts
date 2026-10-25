/**
 * Liest einen Strom aus „NDJSON“: ein JSON-Objekt pro Zeile.
 * So streamt Ollama seine Antworten. Netzwerk-Pakete enden nicht immer an
 * einer Zeilengrenze – deshalb sammeln wir Text, bis eine Zeile vollständig ist.
 */
export async function* readNdjson(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of body) {
    // stream: true – ein Umlaut kann über zwei Pakete verteilt sein.
    buffer += decoder.decode(chunk, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line);
    }
  }

  const rest = (buffer + decoder.decode()).trim();
  if (rest) yield JSON.parse(rest);
}
