import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useOllamaStatus } from '../hooks/useOllamaStatus';
import { useGpuStatus, useRunningModels } from '../hooks/useRunningModels';
import { formatMemory } from '../utils/format';

const POLL_MS = 5000;

/** Startseite „Dein PC“ (JOURNEY.md Fläche 3): zeigt beim Ankommen, was bereit ist. */
export function HomeStatus() {
  const { t } = useTranslation();
  const status = useOllamaStatus();
  const running = useRunningModels(POLL_MS);
  const gpuStatus = useGpuStatus(POLL_MS);

  const loaded = status?.online && running?.ok ? running.value : [];
  const gpu = gpuStatus?.available ? gpuStatus.gpus[0] : undefined;
  const used = gpu?.memoryUsedBytes ?? 0;
  const total = gpu?.memoryTotalBytes ?? 0;
  const share = total > 0 ? Math.round((used / total) * 100) : null;

  let model = t('status.checking');
  if (status && !status.online) model = t('status.offline');
  else if (status?.online)
    model =
      loaded.length > 0
        ? t('status.loadedShort', {
            name: loaded[0].name,
            vram: formatMemory(loaded[0].vramBytes),
          })
        : t('sidebar.noModel');

  const card =
    'card block !p-4 transition-transform hover:-translate-y-0.5 hover:bg-surface-hover';

  return (
    <section className="space-y-5 text-left">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('home.title')}
        </h2>
        <p className="mt-1 text-muted">{t('home.lead')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/status" className={card}>
          <div className="text-xs text-muted">{t('home.modelCard')}</div>
          <div className="mt-1 text-lg font-semibold">{model}</div>
          {loaded.length > 1 && (
            <div className="text-xs text-muted">
              {t('status.loadedMore', { count: loaded.length - 1 })}
            </div>
          )}
        </Link>
        <Link to="/status" className={card}>
          <div className="text-xs text-muted">{t('home.gpuCard')}</div>
          {gpu ? (
            <>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {formatMemory(used)} / {formatMemory(total)}
              </div>
              {share !== null && (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover"
                  role="img"
                  aria-label={`${share} %`}
                >
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${share}%` }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="mt-1 text-sm text-muted">{t('home.gpuNone')}</div>
          )}
        </Link>
      </div>
    </section>
  );
}
