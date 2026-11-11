import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ServerCrash, Undo2 } from 'lucide-react';
import { DEFAULT_SERVER_NAME } from '../../shared/server';
import { useFailover } from '../hooks/useFailover';
import { useOllamaStatus } from '../hooks/useOllamaStatus';

/** „Dieser PC“ wird in der gewählten Sprache angezeigt, alle anderen Namen sind deine. */
function useDisplayName() {
  const { t } = useTranslation();
  return (name: string) =>
    name === DEFAULT_SERVER_NAME ? t('servers.thisPc') : name;
}

/**
 * Hinweis über dem Eingabefeld: Der aktive Server ist nicht erreichbar – andere eingetragene
 * Server stehen zur Wahl, gewechselt wird nur nach deinem Klick. Danach, wenn der frühere
 * Server wieder da ist: „Zurückwechseln“.
 */
export function ServerFailoverBanner({ chatModel }: { chatModel: string }) {
  const { t } = useTranslation();
  const name = useDisplayName();
  const status = useOllamaStatus();
  const failover = useFailover(status, chatModel);
  const [error, setError] = useState<string | null>(null);

  if (!failover.mode) return null;

  const switchTo = async (profileId: string) => {
    setError(null);
    const result = await failover.switchTo(profileId);
    if (!result.ok) setError(result.error);
  };

  if (failover.mode === 'return' && failover.back) {
    const back = failover.back;
    return (
      <div
        role="status"
        className="mb-2 space-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
      >
        <p className="flex items-center gap-2 font-medium">
          <Undo2 size={15} className="shrink-0 text-ok" />
          {t('failover.backOnline', { name: name(back.name) })}
        </p>
        {!back.local && (
          <p className="text-xs text-muted">
            {t('failover.remote', { address: back.baseUrl })}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void switchTo(back.profileId)}
            className="rounded-lg bg-accent px-3 py-1 text-[13px] font-medium text-white hover:opacity-90"
          >
            {t('failover.back', { name: name(back.name) })}
          </button>
          <button
            type="button"
            onClick={failover.stay}
            className="rounded-lg border border-border px-3 py-1 text-[13px] hover:bg-surface-hover"
          >
            {t('failover.stay')}
          </button>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-2 space-y-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm"
    >
      <p className="flex items-start gap-2 font-medium">
        <ServerCrash size={15} className="mt-0.5 shrink-0 text-warn" />
        <span>
          {t('failover.offline', {
            name: failover.active ? name(failover.active.name) : '',
          })}
          {status && !status.online && (
            <span className="font-normal text-muted"> ({status.error})</span>
          )}
        </span>
      </p>

      {failover.probing && (
        <p className="text-xs text-muted">{t('failover.probing')}</p>
      )}
      {!failover.probing && failover.options.length === 0 && (
        <p className="text-xs text-muted">
          {t('failover.noneOnline')}{' '}
          <Link to="/settings" className="text-accent-text underline">
            {t('failover.manage')}
          </Link>
        </p>
      )}

      <ul className="space-y-2">
        {failover.options.map(({ probe, hasModel, hasEmbedding }) => (
          <li key={probe.profileId} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{name(probe.name)}</span>
              <span className="font-mono text-xs text-muted">
                {probe.baseUrl}
              </span>
              <span className="text-xs text-ok">{t('failover.online')}</span>
            </div>
            <ul className="space-y-0.5 text-xs text-muted">
              {hasModel === true && (
                <li>{t('failover.hasModel', { model: chatModel })}</li>
              )}
              {hasModel === false && (
                <li className="text-warn">
                  {t('failover.noModel', { model: chatModel })}
                </li>
              )}
              {!hasEmbedding && (
                <li className="text-warn">{t('failover.noEmbedding')}</li>
              )}
              {!probe.local && (
                <li>{t('failover.remote', { address: probe.baseUrl })}</li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => void switchTo(probe.profileId)}
              className="rounded-lg bg-accent px-3 py-1 text-[13px] font-medium text-white hover:opacity-90"
            >
              {t('failover.switch', { name: name(probe.name) })}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
