import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  CircleAlert,
  FileText,
  FolderOpen,
  Library,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CollectionView,
  DocumentStatus,
  KnowledgeDocument,
  KnowledgeSource,
} from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { useCollections } from '../hooks/useCollections';
import { formatBytes } from '../utils/format';

/** Mehr Zeilen zeigt die Dateiliste nicht auf einmal (große Code-Ordner). */
const MAX_ROWS = 500;

export function KnowledgePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const collectionId = useParams().collectionId ?? null;
  const collections = useCollections();
  const selected = collections?.find((c) => c.config.id === collectionId);

  // Gibt es die Sammlung nicht (mehr), zurück zur Übersicht.
  useEffect(() => {
    if (collections && collectionId && !selected) {
      navigate('/knowledge', { replace: true });
    }
  }, [collections, collectionId, selected, navigate]);

  const create = async () => {
    const id = crypto.randomUUID();
    const result = await window.api.saveCollection({
      id,
      name: t('knowledge.defaultName'),
      sources: [],
    });
    if (result.ok) navigate(`/knowledge/${id}?neu=1`);
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border">
        <div className="p-2">
          <button
            type="button"
            onClick={() => void create()}
            className="flex w-full items-center gap-2 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
          >
            <Plus size={15} />
            {t('knowledge.new')}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {collections?.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted">
              {t('knowledge.none')}
            </p>
          )}
          {collections?.map((c) => (
            <NavLink
              key={c.config.id}
              to={`/knowledge/${c.config.id}`}
              className={({ isActive }) =>
                `my-0.5 block rounded px-2 py-1.5 ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'hover:bg-surface-hover'
                }`
              }
            >
              <div className="truncate">{c.config.name}</div>
              <div className="truncate text-[11px] text-muted">
                {isRunning(c)
                  ? t('knowledge.indexingShort', {
                      done: c.progress?.done ?? 0,
                      total: c.progress?.total ?? 0,
                    })
                  : t('knowledge.summary', {
                      count: c.stats.documents,
                      chunks: c.stats.chunks,
                    })}
              </div>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <CollectionDetail key={selected.config.id} view={selected} />
        ) : (
          <>
            <PageHeader title={t('knowledge.title')} />
            <div className="mx-auto max-w-md space-y-3 px-6 pt-16 text-center text-muted">
              <Library size={32} className="mx-auto" />
              <p>{t('knowledge.intro')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function isRunning(view: CollectionView) {
  return (
    view.progress?.phase === 'scanning' || view.progress?.phase === 'indexing'
  );
}

function CollectionDetail({ view }: { view: CollectionView }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config, stats, progress } = view;
  const running = isRunning(view);
  const [name, setName] = useState(config.name);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [modelMissing, setModelMissing] = useState(false);
  const [searchParams] = useSearchParams();
  // Frisch angelegt → Namensfeld gleich zum Überschreiben bereit.
  const isNew = searchParams.has('neu');

  // Dokumentliste neu laden, wenn sich der Stand ändert (Einlesen fertig, Datei weg …).
  useEffect(() => {
    void window.api.listDocuments(config.id).then(setDocuments);
  }, [config.id, stats.documents, stats.chunks, stats.indexedAt]);

  // Ist das Embedding-Modell überhaupt installiert?
  useEffect(() => {
    void window.api.listModels().then((result) => {
      if (result.ok) {
        setModelMissing(
          !result.value.some((m) => m.name === config.embeddingModel),
        );
      }
    });
  }, [config.embeddingModel]);

  const save = async (patch: {
    name?: string;
    sources?: KnowledgeSource[];
  }) => {
    const result = await window.api.saveCollection({
      id: config.id,
      name: patch.name ?? config.name,
      sources: patch.sources ?? config.sources,
    });
    setError(result.ok ? null : result.error);
  };

  const addSources = async (kind: KnowledgeSource['kind']) => {
    const picked =
      kind === 'folder'
        ? await window.api.pickFolders()
        : await window.api.pickFiles();
    if (picked.length === 0) return;
    await save({
      sources: [...config.sources, ...picked.map((path) => ({ kind, path }))],
    });
  };

  const removeSource = (source: KnowledgeSource) =>
    void save({ sources: config.sources.filter((s) => s !== source) });

  const startIndexing = async () => {
    const result = await window.api.indexCollection(config.id);
    setError(result.ok ? null : result.error);
  };

  const remove = async () => {
    if (!window.confirm(t('knowledge.confirmDelete', { name: config.name })))
      return;
    await window.api.deleteCollection(config.id);
    navigate('/knowledge');
  };

  const shown = documents.filter(
    (d) => !onlyProblems || d.status === 'error' || d.status === 'skipped',
  );

  return (
    <>
      <PageHeader
        title={config.name}
        actions={
          <>
            {running ? (
              <button
                type="button"
                onClick={() => void window.api.cancelIndexing(config.id)}
                className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
              >
                <Square size={13} />
                {t('knowledge.cancel')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startIndexing()}
                disabled={config.sources.length === 0 || modelMissing}
                className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-xs text-white disabled:opacity-40"
              >
                <RefreshCw size={13} />
                {stats.indexedAt
                  ? t('knowledge.reindex')
                  : t('knowledge.index')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void remove()}
              title={t('knowledge.delete')}
              aria-label={t('knowledge.delete')}
              className="rounded border border-border px-2 py-1 hover:bg-surface-hover"
            >
              <Trash2 size={14} />
            </button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          {error && (
            <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
              {error}
            </p>
          )}
          {modelMissing && (
            <p className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
              {t('knowledge.modelMissing', { model: config.embeddingModel })}
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">
              {t('knowledge.name')}
            </span>
            <input
              autoFocus={isNew}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim() && name !== config.name) void save({ name });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 outline-none focus:border-accent"
            />
          </label>

          <section className="space-y-2">
            <div>
              <h3 className="text-xs font-medium text-muted">
                {t('knowledge.sources')}
              </h3>
              <p className="text-[11px] text-muted">
                {t('knowledge.sourcesHint')}
              </p>
            </div>
            <ul className="space-y-1">
              {config.sources.map((source) => (
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
                    onClick={() => removeSource(source)}
                    disabled={running}
                    aria-label={t('knowledge.removeSource')}
                    title={t('knowledge.removeSource')}
                    className="rounded p-0.5 text-muted hover:text-text disabled:opacity-40"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void addSources('folder')}
                disabled={running}
                className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-40"
              >
                <FolderOpen size={13} />
                {t('knowledge.addFolder')}
              </button>
              <button
                type="button"
                onClick={() => void addSources('file')}
                disabled={running}
                className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-40"
              >
                <FileText size={13} />
                {t('knowledge.addFiles')}
              </button>
            </div>
          </section>

          <ProgressBox view={view} />

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
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    sources={config.sources}
                  />
                ))}
                {shown.length > MAX_ROWS && (
                  <li className="px-3 py-1.5 text-muted">
                    {t('knowledge.moreFiles', {
                      count: shown.length - MAX_ROWS,
                    })}
                  </li>
                )}
              </ul>
            )}
          </section>

          <p className="text-[11px] text-muted">
            {t('knowledge.modelInfo', { model: config.embeddingModel })}
          </p>
        </div>
      </div>
    </>
  );
}

function ProgressBox({ view }: { view: CollectionView }) {
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
      <div className="space-y-1.5 rounded border border-border bg-surface px-3 py-2.5">
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
            <span className="font-mono">{percent} %</span>
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
    <div className="space-y-1 rounded border border-border bg-surface px-3 py-2.5 text-xs">
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
