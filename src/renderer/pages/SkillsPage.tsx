import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  CircleAlert,
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';
import { OLLAMA_DEFAULT_CONTEXT } from '../../shared/context';
import {
  SKILL_BODY_MAX,
  SKILL_DESCRIPTION_MAX,
  SKILL_NAME_MAX,
  skillContextAdvice,
  skillDescriptionHint,
  type SkillInput,
  type SkillView,
} from '../../shared/skills';
import type { SkillFinding } from '../../shared/skill-import';
import { formatBytes } from '../utils/format';
import type { GithubSkill } from '../../shared/github';
import { PageHeader } from '../components/PageHeader';
import { GithubSkillDialog } from '../components/skills/GithubSkillDialog';
import { SkillFindings } from '../components/skills/SkillFindings';
import { SkillImportDialog } from '../components/skills/SkillImportDialog';
import { EmptyState } from '../components/EmptyState';
import { Field } from '../components/settings/SettingsFields';
import { useSkills } from '../skills/useSkills';
import { useConfirm } from '../components/ConfirmDialog';
import { messageLocale } from '../../shared/messages';

/** Adresse für einen noch nicht gespeicherten Skill. */
const NEW = 'new';

const ICON_BTN =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-hover hover:text-text';
const SIDEBAR_BTN =
  'grid h-8 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-hover hover:text-text';
const FIELD =
  'w-full rounded border border-border bg-bg px-2.5 py-1.5 outline-none focus:border-accent';

export function SkillsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const skillId = useParams().skillId ?? null;
  const {
    skills,
    loaded,
    error: listError,
    reload,
    save,
    remove,
  } = useSkills();

  // Bearbeitungsstand – wird erst mit „Speichern“ in die SKILL.md geschrieben.
  const [draft, setDraft] = useState<SkillInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = skills.find((s) => s.id === skillId);
  // „Von GitHub laden“: Der geladene Text kommt als Entwurf in den Editor (nichts ist gespeichert).
  const [githubOpen, setGithubOpen] = useState(false);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  const pendingImport = useRef<GithubSkill | null>(null);
  const [importedFindings, setImportedFindings] = useState<SkillFinding[]>([]);
  // „Skill hinzufügen“: Dateien aus dem Dialog oder auf die Seite gezogen (null = Dialog zu).
  const [importFiles, setImportFiles] = useState<File[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Beim Wechsel des Skills (oder nach „Neu laden“) den Entwurf neu befüllen.
  const fill = () => {
    setError(null);
    setDirty(false);
    setImportedFrom(null);
    setImportedFindings([]);
    if (skillId === NEW) {
      const imported = pendingImport.current;
      pendingImport.current = null;
      if (imported) {
        const { source, findings, ...skill } = imported;
        setDraft(skill);
        setImportedFrom(source);
        setImportedFindings(findings);
        setDirty(true); // Erst „Speichern“ legt die Datei an.
        return;
      }
      setDraft({ name: '', description: '', body: t('skills.bodyTemplate') });
      return;
    }
    if (!loaded) return;
    if (selected) {
      setDraft({
        id: selected.id,
        name: selected.name,
        description: selected.description,
        body: selected.body,
      });
    } else if (skillId) {
      navigate('/skills', { replace: true });
    } else {
      setDraft(null);
    }
  };
  // Nicht nach jedem Speichern neu befüllen (sonst springt der Cursor).
  useEffect(fill, [skillId, loaded]);

  const onImported = (skill: GithubSkill) => {
    setGithubOpen(false);
    pendingImport.current = skill;
    if (skillId === NEW) fill();
    else navigate(`/skills/${NEW}`);
  };

  const onInstalled = async (installed: SkillView[]) => {
    setImportFiles(null);
    await reload();
    setNotice(t('skills.import.done', { count: installed.length }));
    if (installed[0]) navigate(`/skills/${installed[0].id}`);
  };

  // Dateien auf die Seite ziehen öffnet „Skill hinzufügen“ (Ablegen ist nirgends sonst erlaubt).
  const carriesFiles = (event: React.DragEvent) =>
    importFiles === null && event.dataTransfer.types.includes('Files');

  // Passt der Skill in den Standard-Kontext von Ollama? Sonst Hinweis, was einzustellen ist.
  const advice = draft ? skillContextAdvice(draft.body) : null;

  const update = (patch: Partial<SkillInput>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  };

  const onSave = async () => {
    if (!draft) return;
    const result = await save(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setDirty(false);
    if (skillId !== result.value.id) {
      navigate(`/skills/${result.value.id}`, { replace: true });
    }
  };

  const onReload = async () => {
    if (
      dirty &&
      !(await confirm({
        message: t('skills.confirmReload'),
        confirmLabel: t('dialog.discardReload'),
      }))
    )
      return;
    const result = await reload();
    if (result.ok) {
      const fresh = result.value.find((s) => s.id === skillId);
      if (fresh) {
        setDraft({
          id: fresh.id,
          name: fresh.name,
          description: fresh.description,
          body: fresh.body,
        });
        setDirty(false);
        setError(null);
      }
    }
  };

  const onDelete = async () => {
    if (!draft?.id) return;
    const fileCount = selected?.files?.length ?? 0;
    if (
      !(await confirm({
        message:
          fileCount > 0
            ? t('skills.confirmDeleteFiles', {
                name: draft.name,
                count: fileCount,
              })
            : t('skills.confirmDelete', { name: draft.name }),
        confirmLabel: t('dialog.delete'),
        danger: true,
      }))
    )
      return;
    const result = await remove(draft.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/skills');
  };

  return (
    <div
      className="relative flex h-full"
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0) setImportFiles(files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-40 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-accent-soft/70 text-sm font-medium">
          {t('skills.dropHere')}
        </div>
      )}
      <aside className="flex w-[270px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex gap-1.5 px-2.5 pt-3 pb-2">
          <button
            type="button"
            onClick={() => navigate(`/skills/${NEW}`)}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            {t('skills.new')}
          </button>
          <button
            type="button"
            onClick={() => setGithubOpen(true)}
            title={t('skills.github.title')}
            aria-label={t('skills.github.title')}
            className={SIDEBAR_BTN}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            onClick={() => setImportFiles([])}
            title={t('skills.addFiles')}
            aria-label={t('skills.addFiles')}
            className={SIDEBAR_BTN}
          >
            <Upload size={16} />
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            title={t('skills.reload')}
            aria-label={t('skills.reload')}
            className={SIDEBAR_BTN}
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => void window.api.openSkillFolder()}
            title={t('skills.openFolder')}
            aria-label={t('skills.openFolder')}
            className={SIDEBAR_BTN}
          >
            <FolderOpen size={16} />
          </button>
        </div>
        {notice && (
          <p className="mx-2.5 mb-2 rounded-lg border border-ok/40 bg-ok/10 px-2.5 py-1.5 text-xs">
            {notice}
          </p>
        )}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
          {listError && (
            <p className="px-2 py-2 text-xs text-error">{listError}</p>
          )}
          {loaded && skills.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted">
              {t('skills.none')}
            </p>
          )}
          {skills.map((skill) => (
            <NavLink
              key={skill.id}
              to={`/skills/${skill.id}`}
              className={({ isActive }) =>
                `my-px block rounded-lg px-2.5 py-2 ${
                  isActive
                    ? 'bg-surface-hover font-medium text-text'
                    : 'text-muted hover:bg-surface-hover hover:text-text'
                }`
              }
            >
              <div className="flex items-center gap-1.5 truncate">
                {skill.error && (
                  <CircleAlert size={13} className="shrink-0 text-error" />
                )}
                <span className="truncate">{skill.name}</span>
              </div>
              <div className="truncate text-xs font-normal text-subtle">
                {skill.error ??
                  (skill.description || t('skills.noDescription'))}
              </div>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={draft ? draft.name || t('skills.untitled') : t('skills.title')}
          actions={
            draft && (
              <>
                {draft.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => void onReload()}
                      title={t('skills.reloadOne')}
                      aria-label={t('skills.reloadOne')}
                      className={ICON_BTN}
                    >
                      <RefreshCw size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void window.api.openSkillFolder(draft.id)}
                      title={t('skills.openSkillFolder')}
                      aria-label={t('skills.openSkillFolder')}
                      className={ICON_BTN}
                    >
                      <FolderOpen size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete()}
                      title={t('skills.delete')}
                      aria-label={t('skills.delete')}
                      className={ICON_BTN}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={!dirty}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  <Save size={15} />
                  {t('skills.save')}
                </button>
              </>
            )
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {draft ? (
            <div className="mx-auto max-w-3xl space-y-5 px-7 py-6">
              {(error || selected?.error) && (
                <p className="rounded-xl border border-error/40 bg-error/10 px-3.5 py-2.5 text-error">
                  {error ?? t('skills.broken', { error: selected?.error })}
                </p>
              )}
              {importedFrom && !draft.id && (
                <p className="rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-sm">
                  {t('skills.github.imported', { source: importedFrom })}
                </p>
              )}
              {importedFrom && !draft.id && (
                <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5">
                  <SkillFindings findings={importedFindings} />
                </div>
              )}
              <Field label={t('skills.name')}>
                <input
                  autoFocus={skillId === NEW}
                  value={draft.name}
                  maxLength={SKILL_NAME_MAX}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder={t('skills.namePlaceholder')}
                  className={FIELD}
                />
              </Field>
              <Field
                label={t('skills.description')}
                hint={t('skills.descriptionHint')}
              >
                {skillDescriptionHint(draft.description) && (
                  <p className="mb-1.5 text-xs text-warn">
                    {t(
                      skillDescriptionHint(draft.description) === 'missing'
                        ? 'skills.descMissing'
                        : 'skills.descShort',
                    )}
                  </p>
                )}
                <textarea
                  value={draft.description}
                  maxLength={SKILL_DESCRIPTION_MAX}
                  rows={2}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder={t('skills.descriptionPlaceholder')}
                  className={`${FIELD} resize-y`}
                />
              </Field>
              <Field
                label={t('skills.body')}
                hint={t('skills.bodyHint', {
                  count: draft.body.length.toLocaleString(messageLocale()),
                  max: SKILL_BODY_MAX.toLocaleString(messageLocale()),
                  tokens: (advice?.tokens ?? 0).toLocaleString(messageLocale()),
                })}
              >
                <textarea
                  value={draft.body}
                  maxLength={SKILL_BODY_MAX}
                  rows={20}
                  onChange={(e) => update({ body: e.target.value })}
                  spellCheck={false}
                  className={`${FIELD} resize-y font-mono text-[13px] leading-relaxed`}
                />
              </Field>
              {advice && !advice.fits && advice.suggested !== null && (
                <p className="rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-sm">
                  {t('skills.tooBig', {
                    context:
                      OLLAMA_DEFAULT_CONTEXT.toLocaleString(messageLocale()),
                    suggested: advice.suggested.toLocaleString(messageLocale()),
                  })}
                </p>
              )}
              {draft.id && selected?.files && selected.files.length > 0 && (
                <Field label={t('skills.files')} hint={t('skills.filesHint')}>
                  <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                    {selected.files.map((file) => (
                      <li
                        key={file.path}
                        className="flex items-center gap-3 px-3 py-1.5 text-xs"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono">
                          {file.path}
                        </span>
                        <span className="shrink-0 text-subtle">
                          {formatBytes(file.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Field>
              )}
              {draft.id && (
                <p className="text-xs text-subtle">
                  {t('skills.fileHint')}{' '}
                  <span className="font-mono">{`skills\\${draft.id}\\SKILL.md`}</span>
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              icon={WandSparkles}
              text={t('skills.intro')}
              hint={t('skills.introSafe')}
            />
          )}
        </div>
      </div>
      {importFiles !== null && (
        <SkillImportDialog
          initialFiles={importFiles}
          onClose={() => setImportFiles(null)}
          onInstalled={(installed) => void onInstalled(installed)}
        />
      )}
      {githubOpen && (
        <GithubSkillDialog
          onLoaded={onImported}
          onClose={() => setGithubOpen(false)}
        />
      )}
    </div>
  );
}
