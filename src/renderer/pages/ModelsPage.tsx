import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import type { ModelInfo, Result } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { formatBytes, formatContext, formatDate } from '../utils/format';

// "completion" (Text erzeugen) können alle Chat-Modelle – das Abzeichen wäre nur Rauschen.
const HIDDEN_CAPABILITIES = new Set(['completion']);

export function ModelsPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<Result<ModelInfo[]> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setResult(await window.api.listModels());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshButton = (
    <button
      type="button"
      onClick={load}
      disabled={loading}
      className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      {t('models.refresh')}
    </button>
  );

  return (
    <>
      <PageHeader title={t('models.title')} actions={refreshButton} />
      <div className="p-6">{renderBody()}</div>
    </>
  );

  function renderBody() {
    if (!result) {
      return <p className="text-muted">{t('models.loading')}</p>;
    }
    if (!result.ok) {
      return (
        <div className="rounded border border-error/40 bg-error/10 p-4">
          <p className="font-semibold text-error">{t('models.error')}</p>
          <p className="mt-1 text-muted">{result.error}</p>
        </div>
      );
    }
    if (result.value.length === 0) {
      return <p className="text-muted">{t('models.empty')}</p>;
    }
    return <ModelTable models={result.value} />;
  }
}

function ModelTable({ models }: { models: ModelInfo[] }) {
  const { t } = useTranslation();
  const columns = [
    'name',
    'parameters',
    'quantization',
    'size',
    'context',
    'capabilities',
    'modified',
  ];

  return (
    <div className="overflow-x-auto rounded border border-border bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-3 py-2 font-medium whitespace-nowrap"
              >
                {t(`models.columns.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr
              key={model.name}
              className="border-b border-border last:border-0 hover:bg-surface-hover"
            >
              <td className="px-3 py-2 font-mono whitespace-nowrap">
                {model.name}
              </td>
              <td className="px-3 py-2 font-mono">
                {model.parameterSize ?? '–'}
              </td>
              <td className="px-3 py-2 font-mono">
                {model.quantization ?? '–'}
              </td>
              <td className="px-3 py-2 font-mono whitespace-nowrap">
                {formatBytes(model.sizeBytes)}
              </td>
              <td className="px-3 py-2 font-mono">
                {formatContext(model.contextLength)}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {model.capabilities
                    .filter((c) => !HIDDEN_CAPABILITIES.has(c))
                    .map((capability) => (
                      <span
                        key={capability}
                        className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent"
                      >
                        {t(`models.capability.${capability}`, {
                          defaultValue: capability,
                        })}
                      </span>
                    ))}
                </div>
              </td>
              <td className="px-3 py-2 font-mono whitespace-nowrap text-muted">
                {formatDate(model.modifiedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
