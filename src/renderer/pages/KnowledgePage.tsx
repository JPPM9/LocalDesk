import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { useTranslation } from 'react-i18next';
import { Library, Plus, Trash2 } from 'lucide-react';
import type { CollectionView, KnowledgeSource } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import {
  DocumentList,
  IndexButton,
  isRunning,
  ProgressBox,
  SourcesEditor,
  useModelMissing,
} from '../components/knowledge/CollectionEditor';
import { useCollections } from '../hooks/useCollections';
import { useConfirm } from '../components/ConfirmDialog';

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
      <aside className="flex w-[270px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-2.5 pt-3 pb-2">
          <button
            type="button"
            onClick={() => void create()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            <Plus size={15} />
            {t('knowledge.new')}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
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
                `my-px block rounded-lg px-2.5 py-2 ${
                  isActive
                    ? 'bg-surface-hover font-medium text-text'
                    : 'text-muted hover:bg-surface-hover hover:text-text'
                }`
              }
            >
              <div className="truncate">{c.config.name}</div>
              <div className="truncate text-xs font-normal text-subtle">
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
            <EmptyState icon={Library} text={t('knowledge.intro')} />
          </>
        )}
      </div>
    </div>
  );
}

function CollectionDetail({ view }: { view: CollectionView }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { config } = view;
  const [name, setName] = useState(config.name);
  const [error, setError] = useState<string | null>(null);
  const modelMissing = useModelMissing(config.embeddingModel);
  const [searchParams] = useSearchParams();
  // Frisch angelegt → Namensfeld gleich zum Überschreiben bereit.
  const isNew = searchParams.has('neu');
  // Die Sammlung „Obsidian“ pflegt LocalDesk selbst (Einstellungen → Obsidian).
  const managed = config.kind === 'obsidian';

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
    if (
      !(await confirm({
        message: t('knowledge.confirmDelete', { name: config.name }),
        confirmLabel: t('dialog.delete'),
        danger: true,
      }))
    )
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
            {!managed && (
              <button
                type="button"
                onClick={() => void remove()}
                title={t('knowledge.delete')}
                aria-label={t('knowledge.delete')}
                className="rounded border border-border px-2 py-1 hover:bg-surface-hover"
              >
                <Trash2 size={14} />
              </button>
            )}
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

          {managed && (
            <p className="rounded border border-border bg-surface px-3 py-2 text-xs text-muted">
              {t('knowledge.obsidianManaged')}{' '}
              <Link to="/settings" className="text-accent-text hover:underline">
                {t('knowledge.obsidianSettings')}
              </Link>
            </p>
          )}
          {!managed && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted">
                  {t('knowledge.name')}
                </span>
                <input
                  autoFocus={isNew}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    if (name.trim() && name !== config.name)
                      void save({ name });
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
            </>
          )}
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
