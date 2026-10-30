import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleAlert,
  FileText,
  FolderOpen,
  RefreshCw,
  Square,
  X,
} from 'lucide-react';
import type {
  CollectionView,
  DocumentStatus,
  KnowledgeDocument,
  KnowledgeSource,
} from '../../../shared/api';
import { formatBytes } from '../../utils/format';

// Bausteine zum Bearbeiten einer Sammlung – genutzt auf der Seite „Wissen“ und
// für die Projekt-Dokumente auf der Projekt-Seite.

/** Mehr Zeilen zeigt die Dateiliste nicht auf einmal (große Code-Ordner). */
const MAX_ROWS = 500;

export function isRunning(view: CollectionView | undefined) {
  return (
    view?.progress?.phase === 'scanning' || view?.progress?.phase === 'indexing'
  );
}

/** Ist das Embedding-Modell auf dem aktiven Server installiert? */
export function useModelMissing(model: string | undefined) {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!model) return;
    void window.api.listModels().then((result) => {
      if (result.ok) setMissing(!result.value.some((m) => m.name === model));
    });
  }, [model]);
  return missing;
}

/** Liste der Quellen mit „Ordner/Dateien hinzufügen“ und Entfernen. */
export function SourcesEditor({
  sources,
  disabled,
  onChange,
}: {
  sources: KnowledgeSource[];
  disabled: boolean;
  onChange: (sources: KnowledgeSource[]) => void;
}) {
  const { t } = useTranslation();

  const add = async (kind: KnowledgeSource['kind']) => {
    const picked =
      kind === 'folder'
        ? await window.api.pickFolders()
        : await window.api.pickFiles();
    if (picked.length > 0) {
      onChange([...sources, ...picked.map((path) => ({ kind, path }))]);
    }
  };

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-medium text-muted">
          {t('knowledge.sources')}
        </h3>
        <p className="text-[11px] text-muted">{t('knowledge.sourcesHint')}</p>
      </div>
      <ul className="space-y-1">
        {sources.map((source) => (
          <li
            key={source.path}
            className="flex items-center gap-2 rounded border border-border bg-surface px-2 py-1"
          >
            {source.kind === 'folder' ? (
              <FolderOpen size={14} className="shrink-0 text-muted" />
            ) : (
              <FileText size={14} className="shrink-0 text-muted" />
            )}
            <span
              className="min-w-0 flex-1 truncate font-mono text-xs"
              title={source.path}
            >
              {source.path}
            </span>
            <button
              type="button"
              onClick={() => onChange(sources.filter((s) => s !== source))}
              disabled={disabled}
              aria-label={t('knowledge.removeSource')}
              title={t('knowledge.removeSource')}
              className="grid h-7 w-7 place-items-center rounded text-muted hover:text-text disabled:opacity-40"
            >
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void add('folder')}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-40"
        >
          <FolderOpen size={13} />
          {t('knowledge.addFolder')}
        </button>
        <button
          type="button"
          onClick={() => void add('file')}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-40"
        >
          <FileText size={13} />
          {t('knowledge.addFiles')}
        </button>
      </div>
    </section>
  );
}

/** „Einlesen“ / „Neu einlesen“ – oder „Abbrechen“, solange es läuft. */
export function IndexButton({
  view,
  disabled,
  onError,
}: {
  view: CollectionView;
  disabled: boolean;
  onError: (error: string | null) => void;
}) {
  const { t } = useTranslation();
  if (isRunning(view)) {
    return (
      <button
        type="button"
        onClick={() => void window.api.cancelIndexing(view.config.id)}
        className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
      >
        <Square size={13} />
        {t('knowledge.cancel')}
      </button>
    );
  }
  const start = async () => {
    const result = await window.api.indexCollection(view.config.id);
    onError(result.ok ? null : result.error);
  };
  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={disabled || view.config.sources.length === 0}
      className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-xs text-white disabled:opacity-40"
    >
      <RefreshCw size={13} />
      {view.stats.indexedAt ? t('knowledge.reindex') : t('knowledge.index')}
    </button>
  );
}

export function ProgressBox({ view }: { view: CollectionView }) {
  const { t } = useTranslation();
  const { progress, stats } = view;

  if (
    progress &&
    (progress.phase === 'scanning' || progress.phase === 'indexing')
  ) {
    const percent =
      progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;
    return (
      <div className="space-y-1.5 rounded-xl border border-border bg-surface px-3 py-2.5">
        <div className="flex justify-between text-xs">
          <span>
            {progress.phase === 'scanning'
              ? t('knowledge.scanning')
              : t('knowledge.indexing', {
                  done: progress.done,
                  total: progress.total,
                })}
          </span>
          {progress.phase === 'indexing' && (
            <span className="tabular-nums">{percent} %</span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-bg">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        {progress.current && (
          <p
            className="truncate font-mono text-[11px] text-muted"
            title={progress.current}
          >
            {progress.current}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>{t('knowledge.statFiles', { count: stats.documents })}</span>
        <span>{t('knowledge.statChunks', { count: stats.chunks })}</span>
        <span className="text-muted">
          {stats.indexedAt
            ? t('knowledge.indexedAt', {
                date: new Date(stats.indexedAt).toLocaleString('de-DE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }),
              })
            : t('knowledge.neverIndexed')}
        </span>
      </div>
      {progress?.phase === 'done' && (
        <p className="text-muted">
          {t('knowledge.result', {
            added: progress.added ?? 0,
            updated: progress.updated ?? 0,
            removed: progress.removed ?? 0,
            unchanged: progress.unchanged ?? 0,
          })}
        </p>
      )}
      {progress?.phase === 'aborted' && (
        <p className="text-muted">{t('knowledge.aborted')}</p>
      )}
      {progress?.error && (
        <p className="flex items-start gap-1.5 text-error">
          <CircleAlert size={13} className="mt-0.5 shrink-0" />
          {progress.error}
        </p>
      )}
    </div>
  );
}

/** Eingelesene Dateien mit Stand; lädt neu, sobald sich die Sammlung ändert. */
export function DocumentList({ view }: { view: CollectionView }) {
  const { t } = useTranslation();
  const { config, stats } = view;
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [onlyProblems, setOnlyProblems] = useState(false);

  useEffect(() => {
    void window.api.listDocuments(config.id).then(setDocuments);
  }, [config.id, stats.documents, stats.chunks, stats.indexedAt]);

  const shown = documents.filter(
    (d) => !onlyProblems || d.status === 'error' || d.status === 'skipped',
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted">
          {t('knowledge.files', { count: stats.documents })}
        </h3>
        {stats.problems > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={onlyProblems}
              onChange={(e) => setOnlyProblems(e.target.checked)}
            />
            {t('knowledge.onlyProblems', { count: stats.problems })}
          </label>
        )}
      </div>
      {documents.length === 0 ? (
        <p className="text-xs text-muted">{t('knowledge.noFiles')}</p>
      ) : (
        <ul className="divide-y divide-border rounded border border-border bg-surface text-xs">
          {shown.slice(0, MAX_ROWS).map((doc) => (
            <DocumentRow key={doc.id} doc={doc} sources={config.sources} />
          ))}
          {shown.length > MAX_ROWS && (
            <li className="px-3 py-1.5 text-muted">
              {t('knowledge.moreFiles', { count: shown.length - MAX_ROWS })}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

const STATUS_CLASS: Record<DocumentStatus, string> = {
  ok: 'text-ok',
  empty: 'text-muted',
  skipped: 'text-warn',
  error: 'text-error',
};

function DocumentRow({
  doc,
  sources,
}: {
  doc: KnowledgeDocument;
  sources: KnowledgeSource[];
}) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center gap-3 px-3 py-1.5" title={doc.path}>
      <span className="min-w-0 flex-1 truncate font-mono">
        {shortPath(doc.path, sources)}
      </span>
      {doc.error && (
        <span className="max-w-[40%] truncate text-muted" title={doc.error}>
          {doc.error}
        </span>
      )}
      <span className="shrink-0 text-muted">
        {doc.status === 'ok'
          ? t('knowledge.chunks', { count: doc.chunkCount })
          : formatBytes(doc.sizeBytes)}
      </span>
      <span className={`w-20 shrink-0 text-right ${STATUS_CLASS[doc.status]}`}>
        {t(`knowledge.status.${doc.status}`)}
      </span>
    </li>
  );
}

/** Pfad relativ zum Quellordner – „notizen\a.md“ statt des ganzen Pfads. */
function shortPath(filePath: string, sources: KnowledgeSource[]): string {
  const folder = sources.find(
    (s) =>
      s.kind === 'folder' &&
      filePath.toLowerCase().startsWith(s.path.toLowerCase() + '\\'),
  );
  return folder ? filePath.slice(folder.path.length + 1) : filePath;
}
