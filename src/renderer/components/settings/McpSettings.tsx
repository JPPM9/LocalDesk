import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Pencil, Plus, RotateCw, Trash2, X } from 'lucide-react';
import type { McpServerInput, McpServerView } from '../../../shared/api';
import { useMcpServers } from '../../hooks/useMcpServers';
import { Field } from './SettingsFields';

/** Abschnitt „MCP-Server“ in den Einstellungen. */
export function McpSettings() {
  const { t } = useTranslation();
  const servers = useMcpServers();
  const [form, setForm] = useState<McpServerInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!form) return;
    const result = await window.api.saveMcpServer(form);
    if (result.ok) {
      setForm(null);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const addFolders = async () => {
    if (!form) return;
    const picked = await window.api.pickFolders();
    if (picked.length) {
      setForm({ ...form, folders: [...new Set([...form.folders, ...picked])] });
    }
  };

  const remove = async (server: McpServerView) => {
    if (!window.confirm(t('mcp.confirmDelete', { name: server.config.name })))
      return;
    await window.api.deleteMcpServer(server.config.id);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{t('mcp.title')}</h2>
        <p className="mt-1 text-xs text-muted">{t('mcp.intro')}</p>
      </div>

      {servers?.map((server) => (
        <ServerCard
          key={server.config.id}
          server={server}
          onEdit={() =>
            setForm({
              id: server.config.id,
              name: server.config.name,
              kind: 'filesystem',
              folders: server.config.folders,
            })
          }
          onDelete={() => void remove(server)}
        />
      ))}

      {form ? (
        <div className="space-y-4 rounded border border-border bg-surface p-4">
          <Field label={t('mcp.name')}>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
            />
          </Field>
          <Field label={t('mcp.folders')} hint={t('mcp.foldersHint')}>
            <ul className="space-y-1">
              {form.folders.map((folder) => (
                <li
                  key={folder}
                  className="flex items-center gap-2 rounded border border-border bg-bg px-2 py-1"
                >
                  <FolderOpen size={14} className="shrink-0 text-muted" />
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-xs"
                    title={folder}
                  >
                    {folder}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        folders: form.folders.filter((f) => f !== folder),
                      })
                    }
                    aria-label={t('mcp.removeFolder')}
                    className="rounded p-0.5 text-muted hover:text-text"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void addFolders()}
              className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
            >
              <Plus size={13} />
              {t('mcp.addFolder')}
            </button>
          </Field>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setError(null);
              }}
              className="rounded border border-border px-3 py-1 hover:bg-surface-hover"
            >
              {t('mcp.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="rounded bg-accent px-3 py-1 text-white"
            >
              {t('mcp.save')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            setForm({
              id: crypto.randomUUID(),
              name: t('mcp.defaultName'),
              kind: 'filesystem',
              folders: [],
            })
          }
          className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
        >
          <Plus size={15} />
          {t('mcp.addFilesystem')}
        </button>
      )}
    </section>
  );
}

const STATE_DOT: Record<string, string> = {
  stopped: 'bg-muted',
  starting: 'bg-warn animate-pulse',
  running: 'bg-ok',
  error: 'bg-error',
};

function ServerCard({
  server,
  onEdit,
  onDelete,
}: {
  server: McpServerView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { config, status } = server;
  const readOnlyCount = status.tools.filter((tool) => tool.readOnly).length;

  return (
    <article className="space-y-3 rounded border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT[status.state]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{config.name}</span>
            <span className="text-xs text-muted">
              {t(`mcp.state.${status.state}`)}
            </span>
          </div>
          <div
            className="truncate font-mono text-xs text-muted"
            title={config.folders.join('\n')}
          >
            {config.folders.join(' · ')}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) =>
              void window.api.setMcpServerEnabled(config.id, e.target.checked)
            }
            className="accent-[var(--ld-accent)]"
          />
          {t('mcp.enabled')}
        </label>
        <IconButton
          label={t('mcp.restart')}
          onClick={() => void window.api.restartMcpServer(config.id)}
          disabled={!config.enabled}
        >
          <RotateCw size={14} />
        </IconButton>
        <IconButton label={t('mcp.edit')} onClick={onEdit}>
          <Pencil size={14} />
        </IconButton>
        <IconButton label={t('mcp.delete')} onClick={onDelete}>
          <Trash2 size={14} />
        </IconButton>
      </div>

      {status.state === 'starting' && (
        <p className="text-xs text-muted">{t('mcp.startingHint')}</p>
      )}

      {status.state === 'error' && (
        <div className="space-y-1">
          <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
            {status.error}
          </p>
          {status.log.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted">
                {t('mcp.log')}
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-bg p-2 font-mono text-[11px] whitespace-pre-wrap">
                {status.log.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}

      {status.tools.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">
            {t('mcp.toolsSummary', {
              count: status.tools.length,
              readOnly: readOnlyCount,
              writing: status.tools.length - readOnlyCount,
            })}
          </summary>
          <ul className="mt-2 divide-y divide-border rounded border border-border">
            {status.tools.map((tool) => (
              <li
                key={tool.name}
                className="flex items-start gap-2 px-3 py-1.5"
              >
                <span className="w-44 shrink-0 font-mono">{tool.name}</span>
                <span
                  className="min-w-0 flex-1 text-muted line-clamp-2"
                  title={tool.description}
                >
                  {tool.description}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 text-[11px] ${
                    tool.readOnly
                      ? 'bg-accent-soft text-accent'
                      : tool.destructive
                        ? 'bg-error/10 text-error'
                        : 'bg-warn/10 text-warn'
                  }`}
                >
                  {t(
                    tool.readOnly
                      ? 'mcp.readOnly'
                      : tool.destructive
                        ? 'mcp.destructive'
                        : 'mcp.writing',
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}
