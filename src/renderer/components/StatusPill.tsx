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

  return (
    <Link
      to="/status"
      title={tooltip}
      className="-mx-1.5 block rounded-lg px-1.5 py-1 hover:bg-surface-hover"
    >
      <div className="flex items-start gap-2.5 text-xs" role="status">
        <span
          className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`}
        />
        <div className="min-w-0 space-y-0.5">
          <div className="truncate font-medium">{label}</div>
          {loadedText && (
            <div
              className={`truncate text-[11.5px] ${partlyOnCpu ? 'text-warn' : 'text-muted'}`}
            >
              {loadedText}
            </div>
          )}
          {gpuText && (
            <div className="truncate text-[11.5px] text-subtle tabular-nums">
              {gpuText}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
