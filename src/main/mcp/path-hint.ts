import { tr } from '../../shared/messages';

/** Eingaben, in denen das Modell Pfade (oder verschachtelt: Werkzeug-Eingaben) schreibt. */
const PATH_FIELD = /path|file|folder|dir|arguments/i;

/**
 * Hängt an die Beschreibung eines Werkzeugs, dass Pfade mit Schrägstrichen geschrieben werden.
 * Modelle schreiben Windows-Pfade sonst gern mit einfachen Backslashes ins JSON; Ollama bricht
 * den Aufruf dann mit „invalid character in string escape code“ ab.
 */
export function withPathHint(
  description: string,
  inputSchema: Record<string, unknown>,
): string {
  const properties = inputSchema.properties;
  const hasPath =
    typeof properties === 'object' &&
    properties !== null &&
    Object.keys(properties).some((name) => PATH_FIELD.test(name));
  return hasPath ? `${description} ${tr('mcp.pathHint')}`.trim() : description;
}
