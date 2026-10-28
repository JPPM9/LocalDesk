import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Trash2 } from 'lucide-react';
import type { ModelInfo, Result } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { DownloadPanel } from '../components/models/DownloadPanel';
import { useDownloads } from '../hooks/useDownloads';
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

  // Ist ein Download fertig, erscheint das neue Modell sofort in der Tabelle.
  const downloads = useDownloads(() => void load());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** Löschen ist endgültig – deshalb immer mit Rückfrage, die Größe und Folgen nennt. */
  const deleteModel = async (model: ModelInfo) => {
    const question = t('models.confirmDelete', {
      name: model.name,
      size: formatBytes(model.sizeBytes),
    });
    if (!window.confirm(question)) return;
    const result = await window.api.deleteModel(model.name);
    setDeleteError(
      result.ok
        ? null
        : t('models.deleteError', { name: model.name, error: result.error }),
    );
    await load();
  };

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
      <div className="space-y-6 p-6">
        <DownloadPanel downloads={downloads} />
        {deleteError && (
          <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
            {deleteError}
          </p>
        )}
        {renderBody()}
      </div>
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
    return (
      <ModelTable
        models={result.value}
        onDelete={(model) => void deleteModel(model)}
      />
    );
  }
}

function ModelTable({
  models,
  onDelete,
}: {
  models: ModelInfo[];
  onDelete: (model: ModelInfo) => void;
}) {
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
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
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
            <th className="w-10" aria-label={t('models.columns.actions')} />
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr
              key={model.name}
              className="border-b border-border last:border-0 hover:bg-surface-hover"
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {model.name}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {model.parameterSize ?? '–'}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {model.quantization ?? '–'}
              </td>
              <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                {formatBytes(model.sizeBytes)}
              </td>
              <td className="px-3 py-2 tabular-nums">
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
              <td className="px-3 py-2 tabular-nums whitespace-nowrap text-muted">
                {formatDate(model.modifiedAt)}
              </td>
              <td className="px-2 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(model)}
                  title={t('models.delete', { name: model.name })}
                  aria-label={t('models.delete', { name: model.name })}
                  className="rounded p-1 text-muted hover:bg-error/10 hover:text-error"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
