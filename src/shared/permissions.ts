import type { McpToolInfo, ToolPermission } from './api';

const PERMISSIONS: readonly ToolPermission[] = ['always', 'ask', 'off'];

export function isToolPermission(value: unknown): value is ToolPermission {
  return (
    typeof value === 'string' &&
    (PERMISSIONS as readonly string[]).includes(value)
  );
}

/**
 * Standard-Freigabe (vereinbart): Was der Server als „nur lesend“ kennzeichnet,
 * läuft sofort – alles andere fragt vorher.
 */
export function defaultPermission(
  tool: Pick<McpToolInfo, 'readOnly'>,
): ToolPermission {
  return tool.readOnly ? 'always' : 'ask';
}

/**
 * Die Freigabe, die wirklich gilt: deine Einstellung, sonst der Standard.
 * Main-Prozess (beim Ausführen) und Oberfläche (beim Anzeigen) rechnen beide hiermit.
 */
export function effectivePermission(
  tool: Pick<McpToolInfo, 'name' | 'readOnly'>,
  overrides: Record<string, ToolPermission>,
): ToolPermission {
  const own = overrides[tool.name];
  return isToolPermission(own) ? own : defaultPermission(tool);
}
