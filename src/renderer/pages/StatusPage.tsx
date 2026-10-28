import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import type { RunningModel } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { GpuSection } from '../components/status/GpuCard';
import { useGpuStatus, useRunningModels } from '../hooks/useRunningModels';
import { formatContext, formatMemory } from '../utils/format';
import {
  expiresIn,
  gpuSplit,
  gpuSplitLabel,
  totalVram,
} from '../utils/running';

/** Wie oft die Seite neu abfragt – hier darf es schneller sein als in der Statusleiste. */
const POLL_MS = 2000;

export function StatusPage() {
  const { t } = useTranslation();
  const result = useRunningModels(POLL_MS);
  const gpu = useGpuStatus(POLL_MS);
  // Uhr für „wird entladen in …“ – tickt jede Sekunde.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <PageHeader title={t('status.pageTitle')} />
      <div className="max-w-3xl space-y-8 p-6">
        <GpuSection
          status={gpu}
          ollamaVramBytes={result?.ok ? totalVram(result.value) : 0}
        />
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">{t('status.loadedTitle')}</h2>
            <p className="mt-1 text-xs text-muted">{t('status.loadedIntro')}</p>
          </div>
          {renderLoaded()}
        </section>
      </div>
    </>
  );

  function renderLoaded() {
    if (!result) return <p className="text-muted">{t('status.loading')}</p>;
    if (!result.ok) {
      return (
        <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
          {result.error}
        </p>
      );
    }
    if (result.value.length === 0) {
      return (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-muted">
          {t('status.noneLoaded')}
        </p>
      );
    }
    return (
      <>
        <p className="tabular-nums text-xs text-muted">
          {t('status.summary', {
            count: result.value.length,
            vram: formatMemory(totalVram(result.value)),
          })}
        </p>
        {result.value.map((model) => (
          <LoadedModelCard key={model.name} model={model} now={now} />
        ))}
      </>
    );
  }
}

function LoadedModelCard({ model, now }: { model: RunningModel; now: number }) {
  const { t } = useTranslation();
  const { gpu, cpu } = gpuSplit(model);
  const unload = expiresIn(model.expiresAt, now);

  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-semibold">{model.name}</h3>
        <span className="shrink-0 tabular-nums text-xs text-muted">
          {[model.parameterSize, model.quantization]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      {/* Balken: blau = Grafikkarte (schnell), orange = Prozessor (langsam) */}
      <div>
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-bg"
          role="img"
          aria-label={gpuSplitLabel(model)}
        >
          <div className="bg-accent" style={{ width: `${gpu}%` }} />
          <div className="bg-warn" style={{ width: `${cpu}%` }} />
        </div>
        <div className="mt-1 flex justify-between tabular-nums text-xs">
          <span>{gpuSplitLabel(model)}</span>
          <span className="text-muted">
            {t('status.vramOf', {
              vram: formatMemory(model.vramBytes),
              total: formatMemory(model.sizeBytes),
            })}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-[13px]">
        <dt className="text-muted">{t('status.context')}</dt>
        <dd className="tabular-nums">{formatContext(model.contextLength)}</dd>
        {unload && (
          <>
            <dt className="text-muted">{t('status.unloadIn')}</dt>
            <dd className="tabular-nums">{unload}</dd>
          </>
        )}
      </dl>

      {cpu > 0 && (
        <p className="flex gap-2 rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warn" />
          {t('status.cpuWarning')}
        </p>
      )}
    </article>
  );
}
