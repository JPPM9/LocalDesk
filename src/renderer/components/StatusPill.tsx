import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useOllamaStatus } from '../hooks/useOllamaStatus';
import { useRunningModels } from '../hooks/useRunningModels';
import { formatBytes } from '../utils/format';
import { gpuSplit } from '../utils/running';

interface StatusPillProps {
  /** Bei eingeklappter Seitenleiste nur den farbigen Punkt zeigen. */
  compact: boolean;
}

/** Wie oft die Statusleiste die geladenen Modelle abfragt. */
const RUNNING_POLL_MS = 5000;

/** Unten in der Seitenleiste: Ollama erreichbar? Welches Modell ist geladen? Klick → Status-Seite. */
export function StatusPill({ compact }: StatusPillProps) {
  const { t } = useTranslation();
  const status = useOllamaStatus();
  const running = useRunningModels(RUNNING_POLL_MS);

  let dotClass = 'bg-muted';
  let label = t('status.checking');
  let detail = '';

  if (status?.online) {
    dotClass = 'bg-ok';
    label = t('status.online', { version: status.version });
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
          vram: formatBytes(loaded[0].vramBytes),
        }) +
        (loaded.length > 1
          ? ` ${t('status.loadedMore', { count: loaded.length - 1 })}`
          : '')
      : '';

  const tooltip = [label, detail, loadedText].filter(Boolean).join('\n');

  return (
    <Link
      to="/status"
      title={tooltip}
      className="-mx-1 block rounded px-1 py-0.5 hover:bg-surface-hover"
    >
      <div className="flex items-center gap-2 text-xs" role="status">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`}
        />
        {!compact && (
          <div className="min-w-0">
            <div className="truncate">{label}</div>
            {detail && (
              <div className="truncate font-mono text-[11px] text-muted">
                {detail}
              </div>
            )}
            {loadedText && (
              <div
                className={`truncate font-mono text-[11px] ${partlyOnCpu ? 'text-warn' : 'text-accent'}`}
              >
                {loadedText}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
