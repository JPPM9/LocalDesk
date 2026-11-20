import type { McpServerConfig, McpToolInfo } from '../../shared/api';
import { ARTCRAFT_APPS } from '../../shared/artcraft';
import { tr } from '../../shared/messages';
import { artcraftArgs, findArtcraftCli } from './artcraft';

/**
 * Feste Version des offiziellen Dateisystem-Servers. Bewusst festgelegt statt
 * „neueste“: Ein Update soll nicht unbemerkt anderen Code auf deinem PC ausführen.
 */
export const FILESYSTEM_PACKAGE =
  '@modelcontextprotocol/server-filesystem@2.0.1';

/**
 * Baut den Startbefehl aus der Server-Art. Nur hier entsteht ein Befehl – die
 * Oberfläche kann keinen eigenen Befehl vorgeben.
 */
export function buildCommand(
  config: McpServerConfig,
  find: typeof findArtcraftCli = findArtcraftCli,
): {
  command: string;
  args: string[];
} {
  switch (config.kind) {
    case 'filesystem':
      // -y: npx fragt nicht nach, ob es das Paket herunterladen darf.
      // Danach nur die freigegebenen Ordner – der Server erlaubt nichts außerhalb.
      return {
        command: 'npx',
        args: ['-y', FILESYSTEM_PACKAGE, ...config.folders],
      };
    case 'artcraft': {
      if (!config.app) throw new Error(tr('mcp.unknownKind'));
      const cli = find(config.app);
      if (!cli)
        throw new Error(
          tr('mcp.appNotFound', { app: ARTCRAFT_APPS[config.app].name }),
        );
      return {
        command: cli,
        args: artcraftArgs(
          config.app,
          config.folders,
          config.allowWrite === true,
        ),
      };
    }
  }
}

/** Ein Tool, wie das MCP-SDK es liefert (nur die Felder, die wir nutzen). */
interface SdkTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
}

/**
 * Übernimmt die Angaben des Servers. Fehlt die Kennzeichnung „nur lesend“,
 * gilt das Tool sicherheitshalber als verändernd (→ Rückfrage).
 */
export function toToolInfo(tool: SdkTool): McpToolInfo {
  const readOnly = tool.annotations?.readOnlyHint === true;
  return {
    name: tool.name,
    description: tool.description ?? '',
    readOnly,
    // Laut MCP-Spezifikation gilt ein nicht-lesendes Tool ohne Angabe als zerstörend.
    destructive: !readOnly && tool.annotations?.destructiveHint !== false,
    inputSchema:
      typeof tool.inputSchema === 'object' && tool.inputSchema !== null
        ? (tool.inputSchema as Record<string, unknown>)
        : { type: 'object', properties: {} },
  };
}
