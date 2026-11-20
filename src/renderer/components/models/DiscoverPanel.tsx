import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Download, Search } from 'lucide-react';
import type { CatalogFile, CatalogModel } from '../../../shared/api';
import { ollamaNameFor } from '../../../shared/catalog';
import { fitModel, type FitLevel } from '../../../shared/model-fit';
import { formatBytes } from '../../utils/format';

interface PcInfo {
  ramBytes: number;
  vramBytes: number | null;
  gpuName: string | null;
}

const FIT_STYLE: Record<FitLevel, string> = {
  gpu: 'text-ok',
  partial: 'text-warn',
  cpu: 'text-warn',
  no: 'text-error',
};

/** Reiter „Entdecken“: Hugging Face durchsuchen, Größen vergleichen, nach „passt auf deinen PC“ laden. */
export function DiscoverPanel() {
  const { t, i18n } = useTranslation();
  const [pc, setPc] = useState<PcInfo | null>(null);
  const [query, setQuery] = useState('');
  const [models, setModels] = useState<CatalogModel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, CatalogFile[] | string>>(
    {},
  );
  const [onlyFitting, setOnlyFitting] = useState(false);
  const [started, setStarted] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [memory, gpu] = await Promise.all([
        window.api.getSystemMemory(),
        window.api.getGpuStatus(),
      ]);
      const cards = gpu.available ? gpu.gpus : [];
      const vram = cards.reduce((sum, g) => sum + (g.memoryTotalBytes ?? 0), 0);
      setPc({
        ramBytes: memory.totalBytes,
        vramBytes: vram > 0 ? vram : null,
        gpuName: cards[0]?.name ?? null,
      });
    })();
  }, []);

  const number = useMemo(
    () => new Intl.NumberFormat(i18n.language, { notation: 'compact' }),
    [i18n.language],
  );

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setOpen(null);
    const result = await window.api.searchCatalog(query);
    setLoading(false);
    if (result.ok) setModels(result.value);
    else setError(result.error);
  };

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (files[id]) return;
    const result = await window.api.listCatalogFiles(id);
    setFiles((current) => ({
      ...current,
      [id]: result.ok ? result.value : result.error,
    }));
  };

  const download = async (id: string, quant: string) => {
    const name = ollamaNameFor(id, quant);
    const result = await window.api.startDownload(name);
    setStarted(result.ok ? name : null);
    setError(result.ok ? null : result.error);
  };

  const hardware = pc && { vramBytes: pc.vramBytes, ramBytes: pc.ramBytes };

  return (
    <section className="space-y-4">
      <div className="card !p-4 text-sm">
        <div className="text-xs text-muted">{t('discover.pc')}</div>
        <div className="mt-1 font-medium tabular-nums">
          {pc
            ? [
                t('discover.ram', { size: formatBytes(pc.ramBytes) }),
                pc.vramBytes
                  ? t('discover.vram', {
                      name: pc.gpuName ?? 'GPU',
                      size: formatBytes(pc.vramBytes),
                    })
                  : t('discover.noVram'),
              ].join(' · ')
            : t('models.loading')}
        </div>
        <p className="mt-2 text-xs text-muted">{t('discover.estimate')}</p>
      </div>

      <form onSubmit={(e) => void search(e)} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('discover.placeholder')}
          aria-label={t('discover.placeholder')}
          className="field min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Search size={15} />
          {t('discover.search')}
        </button>
      </form>
      <p className="text-xs text-muted">{t('discover.privacy')}</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyFitting}
          onChange={(e) => setOnlyFitting(e.target.checked)}
        />
        {t('discover.onlyFitting')}
      </label>

      {error && (
        <p role="alert" className="text-sm text-error">
          {t('discover.error', { error })}
        </p>
      )}
      {started && (
        <p role="status" className="text-sm text-ok">
          {t('discover.started', { name: started })}
        </p>
      )}
      {loading && <p className="text-muted">{t('discover.loading')}</p>}
      {models && models.length === 0 && !loading && (
        <p className="text-muted">{t('discover.none')}</p>
      )}

      <ul className="space-y-3">
        {models?.map((model) => {
          const entry = files[model.id];
          return (
            <li key={model.id} className="card !p-4">
              <button
                type="button"
                onClick={() => void toggle(model.id)}
                aria-expanded={open === model.id}
                className="flex w-full items-center gap-2 text-left"
              >
                <ChevronRight
                  size={15}
                  className={`shrink-0 transition-transform ${open === model.id ? 'rotate-90' : ''}`}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {model.id}
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {t('discover.stats', {
                    downloads: number.format(model.downloads),
                    likes: number.format(model.likes),
                  })}
                </span>
              </button>
              {open === model.id && (
                <div className="mt-3">
                  {entry === undefined && (
                    <p className="text-sm text-muted">
                      {t('discover.loading')}
                    </p>
                  )}
                  {typeof entry === 'string' && (
                    <p className="text-sm text-error">
                      {t('discover.error', { error: entry })}
                    </p>
                  )}
                  {Array.isArray(entry) && entry.length === 0 && (
                    <p className="text-sm text-muted">
                      {t('discover.noFiles')}
                    </p>
                  )}
                  {Array.isArray(entry) && entry.length > 0 && (
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-muted">
                        <tr>
                          <th className="py-1 font-medium">
                            {t('models.columns.quantization')}
                          </th>
                          <th className="py-1 font-medium">
                            {t('models.columns.size')}
                          </th>
                          <th className="py-1 font-medium">
                            {t('discover.fits')}
                          </th>
                          <th className="w-24" />
                        </tr>
                      </thead>
                      <tbody>
                        {entry
                          .map((file) => ({
                            file,
                            fit: hardware
                              ? fitModel(file.sizeBytes, hardware)
                              : null,
                          }))
                          .filter(
                            ({ fit }) =>
                              !onlyFitting || (fit && fit.level !== 'no'),
                          )
                          .map(({ file, fit }) => (
                            <tr key={file.quant}>
                              <td className="py-1.5 tabular-nums">
                                {file.quant}
                              </td>
                              <td className="py-1.5 tabular-nums">
                                {formatBytes(file.sizeBytes)}
                              </td>
                              <td
                                className={`py-1.5 ${fit ? FIT_STYLE[fit.level] : 'text-muted'}`}
                              >
                                {fit
                                  ? t(`discover.fit.${fit.level}`, {
                                      need: formatBytes(fit.needBytes),
                                    })
                                  : '–'}
                              </td>
                              <td className="py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void download(model.id, file.quant)
                                  }
                                  aria-label={t('discover.downloadFor', {
                                    name: `${model.id} ${file.quant}`,
                                  })}
                                  className="btn btn-secondary !min-h-8 flex items-center gap-1"
                                >
                                  <Download size={13} />
                                  {t('downloads.start')}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
