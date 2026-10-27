import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, FolderOpen, TriangleAlert } from 'lucide-react';
import type { ObsidianStatus } from '../../../shared/api';
import { MemoryList } from './MemoryList';
import { Field } from './SettingsFields';

const DEFAULT_FOLDER = 'LocalDesk';

/** Abschnitt „Obsidian“ in den Einstellungen: Vault und eigener Unterordner. */
export function ObsidianSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ObsidianStatus | null | undefined>();
  const [editing, setEditing] = useState(false);
  const [vaultPath, setVaultPath] = useState('');
  const [folder, setFolder] = useState(DEFAULT_FOLDER);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.api.getObsidian().then(setStatus);
  }, []);

  const startEdit = () => {
    setVaultPath(status?.vaultPath ?? '');
    setFolder(status?.folder ?? DEFAULT_FOLDER);
    setError(null);
    setEditing(true);
  };

  const pick = async () => {
    const [picked] = await window.api.pickFolders();
    if (picked) setVaultPath(picked);
  };

  const save = async () => {
    const result = await window.api.setObsidian(vaultPath, folder);
    if (result.ok) {
      setStatus(result);
      setEditing(false);
      setError(null);
    } else {
      setError(result.error ?? t('obsidian.invalid'));
    }
  };

  const remove = async () => {
    if (!window.confirm(t('obsidian.confirmRemove'))) return;
    await window.api.clearObsidian();
    setStatus(null);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{t('obsidian.title')}</h2>
        <p className="mt-1 text-xs text-muted">{t('obsidian.intro')}</p>
      </div>

      {status && !editing && (
        <div className="space-y-2 rounded border border-border bg-surface p-4">
          <p className="font-mono text-xs break-all">{status.vaultPath}</p>
          {!status.ok ? (
            <p className="flex items-center gap-1.5 text-xs text-error">
              <TriangleAlert size={13} />
              {status.error}
            </p>
          ) : status.looksLikeVault ? (
            <p className="flex items-center gap-1.5 text-xs text-ok">
              <CircleCheck size={13} />
              {t('obsidian.recognized')}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-warn">
              <TriangleAlert size={13} />
              {t('obsidian.noObsidianFolder')}
            </p>
          )}
          <p className="text-xs text-muted">
            {t('obsidian.writesTo', {
              path: `${status.vaultPath}\\${status.folder}`,
            })}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={startEdit}
              className="rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
            >
              {t('obsidian.change')}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
            >
              {t('obsidian.remove')}
            </button>
          </div>
        </div>
      )}

      {status?.ok && !editing && <MemoryList />}

      {(editing || status === null) &&
        (editing ? (
          <div className="space-y-4 rounded border border-border bg-surface p-4">
            <Field label={t('obsidian.vault')} hint={t('obsidian.vaultHint')}>
              <div className="flex gap-2">
                <input
                  value={vaultPath}
                  onChange={(e) => setVaultPath(e.target.value)}
                  placeholder="C:\\Users\\…\\Obsidian\\Mein Vault"
                  className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => void pick()}
                  className="flex shrink-0 items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
                >
                  <FolderOpen size={13} />
                  {t('obsidian.pick')}
                </button>
              </div>
            </Field>
            <Field label={t('obsidian.folder')} hint={t('obsidian.folderHint')}>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
              />
            </Field>
            {error && <p className="text-xs text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-border px-3 py-1 hover:bg-surface-hover"
              >
                {t('mcp.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!vaultPath.trim()}
                className="rounded bg-accent px-3 py-1 text-white disabled:opacity-40"
              >
                {t('mcp.save')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
          >
            <FolderOpen size={15} />
            {t('obsidian.setUp')}
          </button>
        ))}
    </section>
  );
}
