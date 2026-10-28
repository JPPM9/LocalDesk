import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import { effectivePermission } from '../../../shared/permissions';
import { useMcpServers } from '../../hooks/useMcpServers';

interface McpServerPickerProps {
  /** IDs der gewählten Server. */
  selected: string[];
  onChange: (serverIds: string[]) => void;
  /**
   * Kann das gewählte Modell überhaupt Tools nutzen? (Fähigkeit „tools“ laut Ollama)
   * undefined = unbekannt, z. B. im Vorlagen-Editor ohne festes Modell.
   */
  modelSupportsTools?: boolean;
}

const STATE_DOT: Record<string, string> = {
  stopped: 'bg-muted',
  starting: 'bg-warn animate-pulse',
  running: 'bg-ok',
  error: 'bg-error',
};

/** Häkchen-Liste der eingerichteten MCP-Server – genutzt im Chat und im Vorlagen-Editor. */
export function McpServerPicker({
  selected,
  onChange,
  modelSupportsTools,
}: McpServerPickerProps) {
  const { t } = useTranslation();
  const servers = useMcpServers();

  if (!servers)
    return <p className="text-xs text-muted">{t('status.loading')}</p>;

  if (servers.length === 0) {
    return (
      <p className="text-xs text-muted">
        {t('mcpPicker.none')}{' '}
        <Link to="/settings" className="text-accent-text underline">
          {t('mcpPicker.toSettings')}
        </Link>
      </p>
    );
  }

  const toggle = (serverId: string, on: boolean) => {
    onChange(
      on ? [...selected, serverId] : selected.filter((id) => id !== serverId),
    );
  };

  return (
    <div className="space-y-2">
      {modelSupportsTools === false && selected.length > 0 && (
        <p className="flex gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1.5 text-xs">
          <TriangleAlert size={13} className="mt-0.5 shrink-0 text-warn" />
          {t('mcpPicker.modelNoTools')}
        </p>
      )}
      <ul className="space-y-1">
        {servers.map(({ config, status, permissions }) => {
          const usable = status.tools.filter(
            (tool) => effectivePermission(tool, permissions) !== 'off',
          ).length;
          return (
            <li key={config.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-surface-hover">
                <input
                  type="checkbox"
                  checked={selected.includes(config.id)}
                  onChange={(e) => toggle(config.id, e.target.checked)}
                  className="mt-1 accent-[var(--ld-accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATE_DOT[status.state]}`}
                    />
                    <span className="truncate">{config.name}</span>
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {!config.enabled
                      ? t('mcpPicker.disabled')
                      : status.state === 'running'
                        ? t('mcpPicker.tools', { count: usable })
                        : t(`mcp.state.${status.state}`)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
