import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Library, Plus, Trash2 } from 'lucide-react';
import type { CollectionView, KnowledgeSource } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import {
  DocumentList,
  IndexButton,
  isRunning,
  ProgressBox,
  SourcesEditor,
  useModelMissing,
} from '../components/knowledge/CollectionEditor';
import { useCollections } from '../hooks/useCollections';

export function KnowledgePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const collectionId = useParams().collectionId ?? null;
  // Projekt-Dokumente werden auf der Projekt-Seite verwaltet, nicht hier.
  const collections = useCollections()?.filter((c) => !c.config.projectId);
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

function CollectionDetail({ view }: { view: CollectionView }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config } = view;
  const [name, setName] = useState(config.name);
  const [error, setError] = useState<string | null>(null);
  const modelMissing = useModelMissing(config.embeddingModel);
  const [searchParams] = useSearchParams();
  // Frisch angelegt → Namensfeld gleich zum Überschreiben bereit.
  const isNew = searchParams.has('neu');

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

  const remove = async () => {
    if (!window.confirm(t('knowledge.confirmDelete', { name: config.name })))
      return;
    await window.api.deleteCollection(config.id);
    navigate('/knowledge');
  };

  return (
    <>
      <PageHeader
        title={config.name}
        actions={
          <>
            <IndexButton
              view={view}
              disabled={modelMissing}
              onError={setError}
            />
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

          <SourcesEditor
            sources={config.sources}
            disabled={isRunning(view)}
            onChange={(sources) => void save({ sources })}
          />
          <ProgressBox view={view} />
          <DocumentList view={view} />

          <p className="text-[11px] text-muted">
            {t('knowledge.modelInfo', { model: config.embeddingModel })}
          </p>
        </div>
      </div>
    </>
  );
}
