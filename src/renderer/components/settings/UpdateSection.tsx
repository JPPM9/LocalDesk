import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleAlert,
  CircleCheck,
  Download,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import type { UpdateState } from '../../../shared/update';

/**
 * „Nach Updates suchen“ – nur auf Knopfdruck. Eine neue Version wird erst nach
 * deinem Klick geladen und erst beim Neustart installiert.
 */
export function UpdateSection({ version }: { version: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState | null>(null);

  useEffect(() => {
    void window.api.getUpdateState().then(setState);
    return window.api.onUpdateChanged(setState);
  }, []);

  if (!state) return null;

  const button =
    'flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50';
  const primary =
    'flex items-center gap-1.5 rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90';
  const check = (
    <button
      type="button"
      onClick={() => void window.api.checkForUpdates()}
      className={button}
    >
      <RefreshCw size={13} />
      {t('update.check')}
    </button>
  );

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
      {state.kind === 'dev' && (
        <p className="text-xs text-muted">{t('update.dev')}</p>
      )}

      {state.kind === 'idle' && check}

      {state.kind === 'checking' && (
        <p className="flex items-center gap-2 text-xs">
          <LoaderCircle size={14} className="animate-spin text-accent" />
          {t('update.checking')}
        </p>
      )}

      {state.kind === 'latest' && (
        <>
          <p className="flex items-center gap-1.5 text-xs text-ok">
            <CircleCheck size={14} />
            {t('update.latest', { version: state.version })}
          </p>
          {check}
        </>
      )}

      {state.kind === 'error' && (
        <>
          <p className="flex items-start gap-1.5 text-xs text-error">
            <CircleAlert size={14} className="mt-0.5 shrink-0" />
            {state.error}
          </p>
          {check}
        </>
      )}

      {state.kind === 'available' && (
        <>
          <p className="font-medium">
            {t('update.available', {
              version: state.version,
              current: version,
            })}
          </p>
          {state.date && (
            <p className="text-xs text-muted">
              {t('update.released', {
                date: new Date(state.date).toLocaleDateString('de-DE'),
              })}
            </p>
          )}
          {state.notes && (
            <pre className="max-h-60 overflow-auto rounded bg-bg px-3 py-2 font-sans text-xs whitespace-pre-wrap">
              {state.notes}
            </pre>
          )}
          <p className="text-xs text-muted">{t('update.dataSafe')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void window.api.downloadUpdate()}
              className={primary}
            >
              <Download size={13} />
              {t('update.download')}
            </button>
          </div>
        </>
      )}

      {state.kind === 'downloading' && (
        <>
          <p className="text-xs">
            {t('update.downloading', {
              version: state.version,
              done: megabytes(state.transferred),
              total: megabytes(state.total),
            })}
          </p>
          <div
            role="progressbar"
            aria-valuenow={Math.round(state.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded bg-bg"
          >
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${state.percent}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => void window.api.cancelUpdate()}
            className={button}
          >
            {t('update.cancel')}
          </button>
        </>
      )}

      {state.kind === 'ready' && (
        <>
          <p className="flex items-center gap-1.5 text-xs text-ok">
            <CircleCheck size={14} />
            {t('update.ready', { version: state.version })}
          </p>
          <p className="text-xs text-muted">{t('update.restartHint')}</p>
          <button
            type="button"
            onClick={() => void window.api.installUpdate()}
            className={primary}
          >
            <RotateCcw size={13} />
            {t('update.install')}
          </button>
        </>
      )}
    </div>
  );
}

function megabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  });
}
