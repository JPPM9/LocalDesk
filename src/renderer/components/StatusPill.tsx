import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useOllamaStatus } from '../hooks/useOllamaStatus';
import { useGpuStatus, useRunningModels } from '../hooks/useRunningModels';
import { formatMemory } from '../utils/format';
import { gpuSplit } from '../utils/running';

/** Wie oft die Statusleiste die geladenen Modelle abfragt. */
const RUNNING_POLL_MS = 5000;

/** Unten in der Chatliste: Ollama erreichbar? Welches Modell ist geladen? Klick → Status-Seite. */
export function StatusPill() {
  const { t } = useTranslation();
  const status = useOllamaStatus();
  const running = useRunningModels(RUNNING_POLL_MS);
  const gpuStatus = useGpuStatus(RUNNING_POLL_MS);

  let dotClass = 'bg-subtle';
  let label = t('status.checking');
  let detail = '';

  if (status?.online) {
    dotClass = 'bg-ok';
    label =
      status.version === 'OpenAI API'
        ? status.version
        : t('status.online', { version: status.version });
    detail = status.baseUrl;
  } else if (status) {
    dotClass = 'bg-error';
    label = t('status.offline');
    detail = `${status.baseUrl} – ${status.error}`;
  }

  // Geladene Modelle nur zeigen, wenn Ollama erreichbar ist.
  const loaded = status?.online && running?.ok ? running.value : [];
  const partlyOnCpu = loaded.some((model) => gpuSplit(model).cpu > 0);
  const loadedText =
    loaded.length > 0
      ? t('status.loadedShort', {
          name: loaded[0].name,
          vram: formatMemory(loaded[0].vramBytes),
        }) +
        (loaded.length > 1
          ? ` ${t('status.loadedMore', { count: loaded.length - 1 })}`
          : '')
      : '';

  // Erste Grafikkarte in Kurzform, z. B. „GPU 29 % · 1,3 GB / 16,0 GB“
  const gpu = gpuStatus?.available ? gpuStatus.gpus[0] : undefined;
  const gpuText = gpu
    ? t('status.gpuShort', {
        util: gpu.utilizationPercent ?? '–',
        used: formatMemory(gpu.memoryUsedBytes),
        total: formatMemory(gpu.memoryTotalBytes),
      })
    : '';

  const tooltip = [label, detail, loadedText, gpuText]
    .filter(Boolean)
    .join('\n');

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={tooltip}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-mx-2 block w-full rounded-[var(--radius-md)] px-2 py-1 text-left hover:bg-surface-hover"
      >
        <div className="flex items-start gap-3 text-xs" role="status">
          <span
            className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`}
          />
          <div className="min-w-0 space-y-0.5">
            <div className="truncate font-medium">{label}</div>
            {loadedText && (
              <div
                className={`truncate text-xs ${partlyOnCpu ? 'text-warn' : 'text-muted'}`}
              >
                {loadedText}
              </div>
            )}
            {gpuText && (
              <div className="truncate text-xs text-muted tabular-nums">
                {gpuText}
              </div>
            )}
          </div>
        </div>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('statusPopup.title')}
          className="dialog absolute bottom-full left-0 z-40 mb-2 w-[300px] space-y-3 !p-4 text-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('statusPopup.title')}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-quiet !min-h-8 !px-3"
            >
              {t('status.close')}
            </button>
          </div>
          {status && !status.online ? (
            <p className="text-muted">
              {t('statusPopup.offline', { name: status.baseUrl })}
            </p>
          ) : loaded.length === 0 ? (
            <p className="text-muted">{t('statusPopup.noneLoaded')}</p>
          ) : (
            <ul className="space-y-1">
              {loaded.map((m) => (
                <li key={m.name} className="flex justify-between gap-3">
                  <span className="truncate">{m.name}</span>
                  <span className="text-muted tabular-nums">
                    {formatMemory(m.vramBytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted tabular-nums">
            {gpuText || t('statusPopup.noGpu')}
          </p>
          <Link
            to="/status"
            onClick={() => setOpen(false)}
            className="btn btn-secondary w-full"
          >
            {t('status.openPage')}
          </Link>
        </div>
      )}
    </div>
  );
}
