/**
 * Welche Dateien LocalDesk als Text lesen kann – für das Wissen (Sammlungen) und für Dateien,
 * die du an eine Chat-Nachricht hängst. Entschieden wird nur nach der Endung.
 */
export type FileKind = 'markdown' | 'text' | 'code' | 'pdf' | 'docx';

const MARKDOWN = new Set(['.md', '.markdown', '.mdx']);
const TEXT = new Set(['.txt', '.text', '.log', '.csv', '.tsv']);
const CODE = new Set([
  // JavaScript und Verwandte
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  // Programmiersprachen
  '.py',
  '.java',
  '.kt',
  '.kts',
  '.cs',
  '.go',
  '.rs',
  '.swift',
  '.dart',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cc',
  '.rb',
  '.php',
  '.lua',
  '.r',
  '.m',
  // Skripte
  '.sh',
  '.bash',
  '.ps1',
  '.bat',
  '.cmd',
  '.sql',
  '.gradle',
  // Web und Daten
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.xml',
  '.svg',
  '.json',
  '.jsonc',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
]);

/** Alle Endungen, die gelesen werden können (für die Dateiauswahl). */
export const READABLE_EXTENSIONS: readonly string[] = [
  ...MARKDOWN,
  ...TEXT,
  ...CODE,
  '.pdf',
  '.docx',
];

/** Die Art einer Datei nach ihrer Endung (mit Punkt, klein geschrieben); null = nicht lesbar. */
export function kindOfExtension(extension: string): FileKind | null {
  if (MARKDOWN.has(extension)) return 'markdown';
  if (TEXT.has(extension)) return 'text';
  if (CODE.has(extension)) return 'code';
  if (extension === '.pdf') return 'pdf';
  // Nur das heutige Word-Format; alte .doc-Dateien sind ein anderes, binäres Format.
  if (extension === '.docx') return 'docx';
  return null;
}

/** Die Art einer Datei nach ihrem Namen (auch mit Pfad). */
export function kindOfName(name: string): FileKind | null {
  const base = name.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? kindOfExtension(base.slice(dot).toLowerCase()) : null;
}
