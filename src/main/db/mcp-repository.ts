import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { McpServerConfig, Result, ToolPermission } from '../../shared/api';
import {
  ARTCRAFT_APPS,
  isArtcraftApp,
  type ArtcraftApp,
} from '../../shared/artcraft';
import { isToolPermission } from '../../shared/permissions';
import { tr } from '../../shared/messages';

interface ServerRow {
  id: string;
  name: string;
  kind: string;
  config_json: string;
  enabled: number;
}

const NAME_MAX_LENGTH = 80;
const MAX_FOLDERS = 10;

/** Gespeicherte MCP-Server (welche Art, welche Ordner, ein/aus). */
export class McpRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
  ) {}

  listServers(): McpServerConfig[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, kind, config_json, enabled FROM mcp_servers ORDER BY created_at, name',
      )
      .all() as unknown as ServerRow[];
    return rows
      .map(toConfig)
      .filter((server): server is McpServerConfig => server !== null);
  }

  getServer(serverId: string): McpServerConfig | null {
    return this.listServers().find((s) => s.id === serverId) ?? null;
  }

  /**
   * Legt an oder ändert (gleiche id). Die Eingabe kommt aus der Oberfläche und
   * wird geprüft. Ob die Ordner wirklich existieren, prüft der Aufrufer vorher.
   */
  saveServer(input: unknown): Result<McpServerConfig> {
    const checked = checkInput(input);
    if (!checked.ok) return checked;
    const { id, name, folders, kind, app, allowWrite } = checked.value;
    this.db
      .prepare(
        `INSERT INTO mcp_servers (id, name, kind, config_json, enabled, created_at)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, config_json = excluded.config_json`,
      )
      .run(
        id,
        name,
        kind,
        JSON.stringify({ folders, app, allowWrite }),
        this.now(),
      );
    return { ok: true, value: this.getServer(id)! };
  }

  setEnabled(serverId: string, enabled: boolean) {
    this.db
      .prepare('UPDATE mcp_servers SET enabled = ? WHERE id = ?')
      .run(enabled ? 1 : 0, serverId);
  }

  deleteServer(serverId: string) {
    this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(serverId);
  }

  /** Deine geänderten Freigaben für einen Server (Tool-Name → Freigabe). */
  listPermissions(serverId: string): Record<string, ToolPermission> {
    const rows = this.db
      .prepare(
        'SELECT tool_name, permission FROM mcp_tool_permissions WHERE server_id = ?',
      )
      .all(serverId) as { tool_name: string; permission: string }[];
    const result: Record<string, ToolPermission> = {};
    for (const row of rows) {
      if (isToolPermission(row.permission))
        result[row.tool_name] = row.permission;
    }
    return result;
  }

  /** Setzt eine Freigabe; `null` heißt „zurück auf Standard“. */
  setPermission(
    serverId: string,
    toolName: string,
    permission: ToolPermission | null,
  ): boolean {
    if (permission === null) {
      this.db
        .prepare(
          'DELETE FROM mcp_tool_permissions WHERE server_id = ? AND tool_name = ?',
        )
        .run(serverId, toolName);
      return true;
    }
    if (!isToolPermission(permission) || !this.getServer(serverId))
      return false;
    this.db
      .prepare(
        `INSERT INTO mcp_tool_permissions (server_id, tool_name, permission) VALUES (?, ?, ?)
         ON CONFLICT(server_id, tool_name) DO UPDATE SET permission = excluded.permission`,
      )
      .run(serverId, toolName, permission);
    return true;
  }
}

/**
 * Prüft Name und Ordner. Ordner müssen absolute Pfade sein; ein ganzes
 * Laufwerk (z. B. „C:\“) ist zu weit gefasst und wird abgelehnt.
 */
export function checkInput(input: unknown): Result<{
  id: string;
  name: string;
  folders: string[];
  kind: 'filesystem' | 'artcraft';
  app?: ArtcraftApp;
  allowWrite?: boolean;
}> {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: tr('error.invalidInput') };
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id === '') {
    return { ok: false, error: tr('mcp.noId') };
  }
  if (raw.kind !== 'filesystem' && raw.kind !== 'artcraft') {
    return { ok: false, error: tr('mcp.unknownKind') };
  }
  if (raw.kind === 'artcraft' && !isArtcraftApp(raw.app)) {
    return { ok: false, error: tr('mcp.unknownKind') };
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return { ok: false, error: tr('error.serverNameMissing') };

  const folders = Array.isArray(raw.folders)
    ? [
        ...new Set(
          raw.folders.filter((f): f is string => typeof f === 'string'),
        ),
      ]
    : [];
  const needsFolder =
    raw.kind === 'filesystem' ||
    (isArtcraftApp(raw.app) && ARTCRAFT_APPS[raw.app].roots);
  if (folders.length === 0 && needsFolder) {
    return { ok: false, error: tr('mcp.needFolder') };
  }
  if (folders.length > MAX_FOLDERS) {
    return { ok: false, error: tr('mcp.maxFolders', { max: MAX_FOLDERS }) };
  }
  for (const folder of folders) {
    if (!path.win32.isAbsolute(folder)) {
      return {
        ok: false,
        error: tr('error.fullPathMissing', { path: folder }),
      };
    }
    if (isDriveRoot(folder)) {
      return {
        ok: false,
        error: tr('error.driveTooBig', { path: folder }),
      };
    }
  }
  return {
    ok: true,
    value: {
      id: raw.id,
      name: name.slice(0, NAME_MAX_LENGTH),
      folders,
      kind: raw.kind,
      ...(raw.kind === 'artcraft' && {
        app: raw.app as ArtcraftApp,
        allowWrite: raw.allowWrite === true,
      }),
    },
  };
}

export function isDriveRoot(folder: string): boolean {
  const normalized = path.win32.normalize(folder);
  return path.win32.parse(normalized).root === normalized;
}

function toConfig(row: ServerRow): McpServerConfig | null {
  if (row.kind !== 'filesystem' && row.kind !== 'artcraft') return null; // unbekannte Art (z. B. aus einer neueren Version)
  let folders: string[] = [];
  let app: ArtcraftApp | undefined;
  let allowWrite = false;
  try {
    const config = JSON.parse(row.config_json) as {
      folders?: unknown;
      app?: unknown;
      allowWrite?: unknown;
    };
    if (isArtcraftApp(config.app)) app = config.app;
    allowWrite = config.allowWrite === true;
    if (Array.isArray(config.folders)) {
      folders = config.folders.filter(
        (f): f is string => typeof f === 'string',
      );
    }
  } catch {
    // kaputtes JSON → keine Ordner → Server startet nicht
  }
  if (row.kind === 'artcraft' && !app) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    folders,
    enabled: row.enabled === 1,
    ...(row.kind === 'artcraft' && { app, allowWrite }),
  };
}
