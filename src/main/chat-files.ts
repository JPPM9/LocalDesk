import type { Result } from '../shared/api';
import { kindOfName } from '../shared/file-kinds';
import {
  cleanFileName,
  FILE_DOCUMENT_MAX_BYTES,
  FILE_TEXT_MAX_BYTES,
  FILE_TEXT_MAX_CHARS,
  type ReadChatFile,
} from '../shared/files';
import { messageLocale, tr } from '../shared/messages';
import { EXTRACT_TIMEOUT_MS, type Extractor } from './rag/extractor';
import { decodeText } from './rag/files';

const NAME_MAX = 300;

/**
 * Liest den Text einer Datei, die du an eine Nachricht hängst: PDF (Seite für Seite mit
 * „[Seite N]“), Word (als Markdown), Text, Markdown, CSV und Quellcode. Entschieden wird nach
 * der Endung; Größe, Zeichensatz und Länge werden geprüft. Es wird nichts gespeichert.
 * PDF und Word liest ein Hintergrund-Thread (`makeExtractor`), der danach wieder beendet wird.
 */
export async function readChatFile(
  name: unknown,
  data: unknown,
  makeExtractor: () => Extractor,
): Promise<Result<ReadChatFile>> {
  const bytes =
    data instanceof Uint8Array
      ? data
      : data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : null;
  if (typeof name !== 'string' || name.length > NAME_MAX || !bytes) {
    return { ok: false, error: tr('files.badInput') };
  }
  const clean = cleanFileName(name);
  const kind = kindOfName(clean);
  if (!kind && /\.xls$/i.test(clean)) {
    return { ok: false, error: tr('files.oldExcel', { name: clean }) };
  }
  if (!kind) {
    return { ok: false, error: tr('files.unsupported', { name: clean }) };
  }
  const isDocument = kind === 'pdf' || kind === 'docx';
  const limit = isDocument ? FILE_DOCUMENT_MAX_BYTES : FILE_TEXT_MAX_BYTES;
  if (bytes.byteLength > limit) {
    return {
      ok: false,
      error: tr('files.tooBig', { name: clean, max: limit / 1024 / 1024 }),
    };
  }

  let text: string;
  let pages: number | undefined;
  if (isDocument) {
    const extractor = makeExtractor();
    try {
      const content = await extractor.extract(kind, bytes);
      if ('pages' in content) {
        pages = content.pages.length;
        text = content.pages
          .map((page, index) =>
            page.trim() === ''
              ? ''
              : `${tr('prompt.filePage', { n: index + 1 })}\n${page}`,
          )
          .filter(Boolean)
          .join('\n\n');
      } else {
        text = content.text;
      }
    } catch (error) {
      const timeout = tr('knowledge.readTimeout', {
        seconds: EXTRACT_TIMEOUT_MS / 1000,
      });
      return {
        ok: false,
        error:
          error instanceof Error && error.message === timeout
            ? timeout
            : tr('files.broken', { name: clean }),
      };
    } finally {
      extractor.close();
    }
  } else {
    const decoded = decodeText(bytes);
    if (!decoded.ok) {
      return { ok: false, error: tr('files.binary', { name: clean }) };
    }
    text = decoded.text;
  }

  text = text.replace(/\r\n?/g, '\n').trim();
  if (text === '') {
    return {
      ok: false,
      error: tr(isDocument ? 'files.noText' : 'files.empty', { name: clean }),
    };
  }
  if (text.length > FILE_TEXT_MAX_CHARS) {
    return {
      ok: false,
      error: tr('files.tooLong', {
        name: clean,
        max: FILE_TEXT_MAX_CHARS.toLocaleString(messageLocale()),
      }),
    };
  }
  return {
    ok: true,
    value: {
      name: clean,
      kind,
      text,
      chars: text.length,
      ...(pages !== undefined && { pages }),
    },
  };
}
