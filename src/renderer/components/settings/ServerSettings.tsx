import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  ProviderStatus,
  ServerProfile,
  ServerProfileInput,
} from '../../../shared/api';
import type { ServerKind } from '../../../shared/api';
import { DEFAULT_SERVER_NAME, isPrivateHost } from '../../../shared/server';
import { clearFailoverFrom } from '../../failover';
import { notifyServerChanged } from '../../serverEvents';
import { Field } from './SettingsFields';
import { useConfirm } from '../ConfirmDialog';

/** Abschnitt „Ollama-Server“ in den Einstellungen: Profile anlegen, testen, umschalten. */
export function ServerSettings() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const displayName = (name: string) =>
    name === DEFAULT_SERVER_NAME ? t('servers.thisPc') : name;
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  // Formular zum Anlegen/Bearbeiten; null = geschlossen.
  const [form, setForm] = useState<ServerProfileInput | null>(null);
  // Beim Bearbeiten: Es ist schon ein Schlüssel gespeichert (leeres Feld = unverändert).
  const [formHasKey, setFormHasKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setProfiles(await window.api.listServers());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activate = async (profile: ServerProfile) => {
    // Du wählst selbst: Ein früherer Failover-Wechsel gilt nicht mehr („Zurückwechseln“ entfällt).
    clearFailoverFrom();
    const result = await window.api.setActiveServer(profile.id);
    if (!result.ok) setError(result.error);
    await refresh();
    notifyServerChanged();
  };

  const remove = async (profile: ServerProfile) => {
    if (
      !(await confirm({
        message: t('servers.confirmDelete', {
          name: displayName(profile.name),
        }),
        confirmLabel: t('dialog.delete'),
        danger: true,
      }))
    )
      return;
    const result = await window.api.deleteServer(profile.id);
    setError(result.ok ? null : result.error);
    await refresh();
    notifyServerChanged();
  };

  const save = async () => {
    if (!form) return;
    const result = await window.api.saveServer(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setForm(null);
    await refresh();
    notifyServerChanged();
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{t('servers.title')}</h2>
        <p className="mt-1 text-xs text-muted">{t('servers.intro')}</p>
      </div>

      <ul className="divide-y divide-border rounded-xl bg-surface shadow-card">
        {profiles.map((profile) => (
          <li key={profile.id} className="flex items-center gap-3 px-3 py-3">
            {/* Größere Klickfläche um den kleinen Radio-Knopf (mind. 24 px). */}
            <label className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center">
              <input
                type="radio"
                name="active-server"
                checked={profile.active}
                onChange={() => void activate(profile)}
                aria-label={t('servers.useThis', {
                  name: displayName(profile.name),
                })}
                className="h-4 w-4 accent-[var(--ld-accent)]"
              />
            </label>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {displayName(profile.name)}
                </span>
                {profile.active && (
                  <span className="rounded bg-accent-soft px-2 text-xs text-accent-text">
                    {t('servers.active')}
                  </span>
                )}
              </div>
              <div className="truncate tabular-nums text-xs text-muted">
                {profile.baseUrl}
              </div>
              {profile.kind === 'openai' && !isPrivateHost(profile.baseUrl) && (
                <div className="text-xs text-warn">
                  {t('servers.cloudBadge')}
                </div>
              )}
            </div>
            <TestButton address={profile.baseUrl} kind={profile.kind} />
            <IconButton
              label={t('servers.edit')}
              onClick={() => {
                setFormHasKey(profile.hasKey);
                setForm({
                  id: profile.id,
                  name: profile.name,
                  address: profile.baseUrl,
                  kind: profile.kind,
                });
              }}
            >
              <Pencil size={14} />
            </IconButton>
            <IconButton
              label={t('servers.delete')}
              onClick={() => void remove(profile)}
              disabled={profiles.length <= 1}
            >
              <Trash2 size={14} />
            </IconButton>
          </li>
        ))}
      </ul>

      {error && (
        <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
          {error}
        </p>
      )}

      {form ? (
        <div className="space-y-4 rounded-xl bg-surface p-4 shadow-card">
          <Field label={t('servers.kind')}>
            <select
              value={form.kind ?? 'ollama'}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as ServerKind })
              }
              className="field w-full"
            >
              <option value="ollama">{t('servers.kinds.ollama')}</option>
              <option value="openai">{t('servers.kinds.openai')}</option>
            </select>
          </Field>
          <Field label={t('servers.name')}>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('servers.namePlaceholder')}
              className="field w-full"
            />
          </Field>
          <Field
            label={t('servers.address')}
            hint={t(
              form.kind === 'openai'
                ? 'servers.addressHintOpenai'
                : 'servers.addressHint',
            )}
          >
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={
                form.kind === 'openai'
                  ? 'http://localhost:1234/v1'
                  : '192.168.1.20'
              }
              className="field w-full tabular-nums"
            />
          </Field>
          {form.kind === 'openai' && (
            <>
              <Field label={t('servers.apiKey')} hint={t('servers.apiKeyHint')}>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.apiKey ?? ''}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={
                    formHasKey && form.apiKey === undefined
                      ? t('servers.apiKeySaved')
                      : ''
                  }
                  className="field w-full tabular-nums"
                />
              </Field>
              {form.address.trim() &&
                !isPrivateHost(
                  /^[a-z]+:\/\//i.test(form.address)
                    ? form.address
                    : `http://${form.address}`,
                ) && (
                  <p role="note" className="text-sm text-warn">
                    {t('servers.cloudWarning')}
                  </p>
                )}
            </>
          )}
          <div className="flex items-center gap-2">
            <TestButton
              address={form.address}
              kind={form.kind ?? 'ollama'}
              apiKey={form.apiKey}
            />
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setError(null);
              }}
              className="btn btn-secondary"
            >
              {t('servers.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="btn btn-primary"
            >
              {t('servers.save')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setFormHasKey(false);
            setForm({
              id: crypto.randomUUID(),
              name: '',
              address: '',
              kind: 'ollama',
            });
          }}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Plus size={15} />
          {t('servers.add')}
        </button>
      )}

      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">
          {t('servers.lanHelpTitle')}
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t('servers.lanHelp1')}</li>
          <li>{t('servers.lanHelp2')}</li>
          <li>{t('servers.lanHelp3')}</li>
          <li>{t('servers.lanHelp4')}</li>
        </ol>
      </details>
    </section>
  );
}

/** „Testen“ mit Ergebnis daneben (grün mit Version oder rot mit Grund). */
function TestButton({
  address,
  kind,
  apiKey,
}: {
  address: string;
  kind?: ServerKind;
  apiKey?: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ProviderStatus | 'testing' | null>(null);

  // Neue Adresse → altes Ergebnis gilt nicht mehr.
  useEffect(() => setStatus(null), [address, kind, apiKey]);

  const test = async () => {
    setStatus('testing');
    setStatus(await window.api.testServer(address, kind, apiKey));
  };

  return (
    <div className="flex items-center gap-2">
      {status && status !== 'testing' && (
        <span
          className={`max-w-56 truncate text-xs ${status.online ? 'text-ok' : 'text-error'}`}
          title={status.online ? undefined : status.error}
        >
          {status.online
            ? kind === 'openai'
              ? t('servers.testOkGeneric')
              : t('servers.testOk', { version: status.version })
            : status.error}
        </span>
      )}
      <button
        type="button"
        onClick={() => void test()}
        disabled={status === 'testing' || !address.trim()}
        className="rounded px-2 py-1 text-xs hover:bg-surface-hover disabled:opacity-50 bg-surface-hover"
      >
        {status === 'testing' ? t('servers.testing') : t('servers.test')}
      </button>
    </div>
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
      className="icon-btn"
    >
      {children}
    </button>
  );
}
