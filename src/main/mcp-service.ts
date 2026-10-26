import { stat } from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import {
  IpcChannels,
  type McpServerConfig,
  type McpServerView,
  type Result,
} from '../shared/api';
import type { McpRepository } from './db/mcp-repository';
import { McpManager } from './mcp/mcp-manager';

/**
 * MCP-Server für die Oberfläche: einrichten, ein-/ausschalten, neu starten,
 * löschen. Eingeschaltete Server starten mit der App. Jede Änderung geht an alle Fenster.
 */
export function registerMcpHandlers(servers: McpRepository) {
  const views = (): McpServerView[] =>
    servers
      .listServers()
      .map((config) => ({ config, status: manager.status(config.id) }));

  const broadcast = () => {
    const list = views();
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IpcChannels.mcpChanged, list);
    }
  };

  const manager = new McpManager(broadcast);

  const startIfEnabled = (config: McpServerConfig | null) => {
    if (config?.enabled) void manager.start(config);
  };

  ipcMain.handle(IpcChannels.listMcpServers, () => views());

  ipcMain.handle(
    IpcChannels.saveMcpServer,
    async (_event, input: unknown): Promise<Result<McpServerConfig>> => {
      const missing = await missingFolders(input);
      if (missing) {
        return { ok: false, error: `Ordner nicht gefunden: ${missing}` };
      }
      const result = servers.saveServer(input);
      if (result.ok) {
        broadcast();
        startIfEnabled(result.value); // neue Ordner gelten erst nach einem Neustart
      }
      return result;
    },
  );

  ipcMain.handle(
    IpcChannels.setMcpServerEnabled,
    async (_event, serverId: unknown, enabled: unknown) => {
      if (typeof serverId !== 'string' || typeof enabled !== 'boolean') return;
      servers.setEnabled(serverId, enabled);
      if (enabled) startIfEnabled(servers.getServer(serverId));
      else await manager.stop(serverId);
      broadcast();
    },
  );

  ipcMain.handle(IpcChannels.restartMcpServer, (_event, serverId: unknown) => {
    if (typeof serverId === 'string')
      startIfEnabled(servers.getServer(serverId));
  });

  ipcMain.handle(
    IpcChannels.deleteMcpServer,
    async (_event, serverId: unknown) => {
      if (typeof serverId !== 'string') return;
      await manager.stop(serverId);
      servers.deleteServer(serverId);
      broadcast();
    },
  );

  ipcMain.handle(IpcChannels.pickFolders, async (event): Promise<string[]> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Ordner für den MCP-Server freigeben',
      properties: ['openDirectory', 'multiSelections'],
    };
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });

  // Eingeschaltete Server mit der App starten, beim Beenden sauber stoppen.
  for (const config of servers.listServers()) startIfEnabled(config);
  return { manager };
}

/** Gibt den ersten Ordner zurück, den es nicht gibt (oder der keine Ordner ist). */
async function missingFolders(input: unknown): Promise<string | null> {
  const folders = (input as { folders?: unknown })?.folders;
  if (!Array.isArray(folders)) return null; // die Formprüfung macht das Repository
  for (const folder of folders) {
    if (typeof folder !== 'string') continue;
    try {
      if (!(await stat(folder)).isDirectory()) return folder;
    } catch {
      return folder;
    }
  }
  return null;
}
