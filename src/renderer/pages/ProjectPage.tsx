import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check, MessageSquare, MessageSquarePlus, Trash2 } from 'lucide-react';
import type {
  ChatFolder,
  ChatSummary,
  KnowledgeSource,
} from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { SkillPicker } from '../components/skills/SkillPicker';
import {
  DocumentList,
  IndexButton,
  isRunning,
  ProgressBox,
  SourcesEditor,
  useModelMissing,
} from '../components/knowledge/CollectionEditor';
import { useCollections } from '../hooks/useCollections';

/**
 * Ein Projekt: Anweisungen und Dokumente, die für alle seine Chats gelten.
 * Ohne beides ist es einfach ein Ordner für Chats.
 */
export function ProjectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projectId = useParams().projectId ?? '';
  const [project, setProject] = useState<ChatFolder | null | undefined>();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collections = useCollections();
  const view = collections?.find((c) => c.config.id === project?.collectionId);
  const modelMissing = useModelMissing(view?.config.embeddingModel);

  const load = useCallback(async () => {
    const [folders, allChats] = await Promise.all([
      window.api.listFolders(),
      window.api.listChats(),
    ]);
    const found = folders.find((f) => f.id === projectId) ?? null;
    setProject(found);
    setChats(allChats.filter((c) => c.folderId === projectId));
    return found;
  }, [projectId]);

  useEffect(() => {
    void load().then((found) => {
      setName(found?.name ?? '');
      setInstructions(found?.instructions ?? '');
    });
  }, [load]);

  // Gibt es das Projekt nicht (mehr), zurück zum Chat.
  useEffect(() => {
    if (project === null) navigate('/chat', { replace: true });
  }, [project, navigate]);

  if (!project) return null;

  const rename = async () => {
    if (!name.trim() || name === project.name) return;
    const result = await window.api.renameFolder(project.id, name);
    setError(result.ok ? null : result.error);
    await load();
  };

  const saveInstructions = async () => {
    if (instructions.trim() === (project.instructions ?? '')) return;
    await window.api.setProjectInstructions(project.id, instructions);
    await load();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Die Sammlung für die Projekt-Dokumente entsteht erst, wenn du Quellen hinzufügst.
  const saveSources = async (sources: KnowledgeSource[]) => {
    let collectionId = project.collectionId;
    if (!collectionId) {
      const created = await window.api.ensureProjectCollection(project.id);
      if (!created.ok) return setError(created.error);
      collectionId = created.value.id;
    }
    const result = await window.api.saveCollection({
      id: collectionId,
      name: project.name,
      sources,
    });
    setError(result.ok ? null : result.error);
    await load();
  };

  const remove = async () => {
    if (!window.confirm(t('projects.confirmDelete', { name: project.name })))
      return;
    await window.api.deleteFolder(project.id);
    navigate('/chat');
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={project.name}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(`/chat?project=${project.id}`)}
              className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
            >
              <MessageSquarePlus size={14} />
              {t('projects.newChat')}
            </button>
            {view && (
              <IndexButton
                view={view}
                disabled={modelMissing}
                onError={setError}
              />
            )}
            <button
              type="button"
              onClick={() => void remove()}
              title={t('projects.delete')}
              aria-label={t('projects.delete')}
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

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">
              {t('projects.name')}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void rename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 outline-none focus:border-accent"
            />
          </label>

          <label className="block space-y-1">
            <span className="flex items-center gap-2 text-xs font-medium text-muted">
              {t('projects.instructions')}
              {saved && (
                <span className="flex items-center gap-1 font-normal text-ok">
                  <Check size={12} />
                  {t('projects.saved')}
                </span>
              )}
            </span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onBlur={() => void saveInstructions()}
              rows={5}
              placeholder={t('projects.instructionsPlaceholder')}
              className="w-full resize-y rounded border border-border bg-surface px-2 py-1.5 outline-none focus:border-accent"
            />
            <span className="block text-[11px] text-muted">
              {t('projects.instructionsHint')}
            </span>
          </label>

          <section className="space-y-2">
            <div>
              <h2 className="font-semibold">{t('projects.skills')}</h2>
              <p className="text-xs text-muted">{t('projects.skillsHint')}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <SkillPicker
                selected={project.skills ?? []}
                onChange={(ids) =>
                  void window.api
                    .setProjectSkills(project.id, ids)
                    .then(() => load())
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">{t('projects.documents')}</h2>
              <p className="text-xs text-muted">
                {t('projects.documentsHint')}
              </p>
            </div>
            {modelMissing && view && (
              <p className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
                {t('knowledge.modelMissing', {
                  model: view.config.embeddingModel,
                })}
              </p>
            )}
            <SourcesEditor
              sources={view?.config.sources ?? []}
              disabled={isRunning(view)}
              onChange={(sources) => void saveSources(sources)}
            />
            {view && view.config.sources.length > 0 && (
              <>
                <ProgressBox view={view} />
                <DocumentList view={view} />
              </>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">
              {t('projects.chats', { count: chats.length })}
            </h2>
            {chats.length === 0 ? (
              <p className="text-xs text-muted">{t('projects.noChats')}</p>
            ) : (
              <ul className="space-y-0.5">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <Link
                      to={`/chat/${chat.id}`}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-hover"
                    >
                      <MessageSquare
                        size={14}
                        className="shrink-0 text-muted"
                      />
                      <span className="truncate">{chat.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
