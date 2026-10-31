import type { CodeMode } from '../../shared/code-agent';
import type { OfferedTool } from '../../shared/tools';

/** Was der Agent im Plan-Modus darf: nur ansehen, nie etwas ändern. */
export const PLAN_MODE_TOOLS: readonly string[] = [
  'list_files',
  'read_file',
  'search_text',
  'git_status',
  'git_diff',
];

/** Darf dieses Code-Werkzeug im gewählten Modus laufen? */
export function allowedInMode(mode: CodeMode, toolName: string): boolean {
  return mode === 'manual' || PLAN_MODE_TOOLS.includes(toolName);
}

/** Bietet im Plan-Modus nur die Lese-Werkzeuge an – Ändern, Befehle und Commits fehlen ganz. */
export function filterForMode(
  tools: OfferedTool[],
  mode: CodeMode,
): OfferedTool[] {
  return tools.filter((tool) => allowedInMode(mode, tool.toolName));
}
