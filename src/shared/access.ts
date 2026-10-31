/** Eingebautes Werkzeug „Zugriff anfragen“: Das Modell bittet im Chat um Postfach oder Dateien. */
export const ACCESS_TOOL_SERVER = 'localdesk:access';
export const ACCESS_TOOL_NAME = 'request_access';

/** Worum das Modell bitten kann: dein Gmail-Postfach („mail“) oder Dateien über MCP-Server („files“). */
export type AccessKind = 'mail' | 'files';
export const ACCESS_KINDS: readonly AccessKind[] = ['mail', 'files'];

/** „chat“ = ab jetzt für diesen Chat (wie der Schalter), „once“ = nur für diese Antwort. */
export type AccessScope = 'chat' | 'once';

export function isAccessKind(value: unknown): value is AccessKind {
  return (ACCESS_KINDS as readonly unknown[]).includes(value);
}
