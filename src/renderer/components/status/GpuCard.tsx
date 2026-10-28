import { useTranslation } from 'react-i18next';
import { MonitorCog } from 'lucide-react';
import type { GpuInfo, GpuStatus } from '../../../shared/api';
import { formatMemory } from '../../utils/format';

interface GpuSectionProps {
  status: GpuStatus | null;
  /** VRAM, den die geladenen Ollama-Modelle belegen (aus /api/ps). */
  ollamaVramBytes: number;
}

/** Abschnitt „Grafikkarte“: Auslastung, VRAM (Ollama / andere / frei), Temperatur, Strom. */
export function GpuSection({ status, ollamaVramBytes }: GpuSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t('gpu.title')}</h2>
      {renderBody()}
    </section>
  );

  function renderBody() {
    if (!status) return <p className="text-muted">{t('status.loading')}</p>;
    if (!status.available) {
      return (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-muted">
          {status.reason === 'remote'
            ? t('gpu.remote')
            : status.reason === 'no-nvidia'
              ? t('gpu.noNvidia')
              : t('gpu.error', { error: status.error })}
        </p>
      );
    }
    // Bei mehreren Karten rechnet Ollama ggf. auf allen – den Ollama-Anteil
    // ordnen wir der Einfachheit halber der ersten Karte zu.
    return status.gpus.map((gpu, i) => (
      <GpuCard
        key={gpu.index}
        gpu={gpu}
        ollamaVramBytes={i === 0 ? ollamaVramBytes : 0}
      />
    ));
  }
}

function GpuCard({
  gpu,
  ollamaVramBytes,
}: {
  gpu: GpuInfo;
  ollamaVramBytes: number;
}) {
  const { t } = useTranslation();
  const total = gpu.memoryTotalBytes ?? 0;
  const used = gpu.memoryUsedBytes ?? 0;
  // Was nicht Ollama gehört, belegen andere Programme (Windows, Browser, Spiele …).
  const ollama = Math.min(ollamaVramBytes, used);
  const others = Math.max(used - ollama, 0);
  const percent = (bytes: number) => (total > 0 ? (bytes / total) * 100 : 0);
  const util = gpu.utilizationPercent;

  return (
    <article className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <MonitorCog size={16} className="text-muted" />
        <h3 className="truncate font-semibold">{gpu.name}</h3>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">{t('gpu.utilization')}</span>
          <span className="tabular-nums">
            {util !== undefined ? `${util} %` : '–'}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${util ?? 0}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">{t('gpu.vram')}</span>
          <span className="tabular-nums">
            {t('gpu.vramUsed', {
              used: formatMemory(used),
              total: formatMemory(total),
            })}
          </span>
        </div>
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-bg"
          role="img"
          aria-label={t('gpu.vramUsed', {
            used: formatMemory(used),
            total: formatMemory(total),
          })}
        >
          <div className="bg-accent" style={{ width: `${percent(ollama)}%` }} />
          <div className="bg-muted" style={{ width: `${percent(others)}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 tabular-nums text-xs">
          <Legend
            className="bg-accent"
            label={t('gpu.ollama')}
            value={formatMemory(ollama)}
          />
          <Legend
            className="bg-muted"
            label={t('gpu.others')}
            value={formatMemory(others)}
          />
          <Legend
            className="border border-border bg-bg"
            label={t('gpu.free')}
            value={formatMemory(Math.max(total - used, 0))}
          />
        </div>
      </div>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-[13px]">
        <dt className="text-muted">{t('gpu.temperature')}</dt>
        <dd className="tabular-nums">
          {gpu.temperatureC !== undefined ? `${gpu.temperatureC} °C` : '–'}
        </dd>
        <dt className="text-muted">{t('gpu.power')}</dt>
        <dd className="tabular-nums">
          {gpu.powerWatts !== undefined
            ? `${Math.round(gpu.powerWatts)} W` +
              (gpu.powerLimitWatts
                ? ` / ${Math.round(gpu.powerLimitWatts)} W`
                : '')
            : '–'}
        </dd>
      </dl>
    </article>
  );
}

function Legend({
  className,
  label,
  value,
}: {
  className: string;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-sm ${className}`} />
      <span className="text-muted">{label}</span>
      {value}
    </span>
  );
}
