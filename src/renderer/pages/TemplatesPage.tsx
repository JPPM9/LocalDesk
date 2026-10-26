import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, MessageSquarePlus, Save, Trash2 } from 'lucide-react';
import type { TemplateInput } from '../../shared/api';
import { thinkFitsModel } from '../../shared/settings';
import { PageHeader } from '../components/PageHeader';
import { Field, SettingsFields } from '../components/settings/SettingsFields';
import { useChatModels } from '../hooks/useChatModels';
import { useTemplates } from '../templates/useTemplates';

/** Adresse für eine noch nicht gespeicherte Vorlage. */
const NEW = 'new';

export function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const templateId = useParams().templateId ?? null;
  const { templates, loaded, save, remove } = useTemplates();
  const { models } = useChatModels();

  // Bearbeitungsstand – wird erst mit „Speichern“ in die Datenbank geschrieben.
  const [draft, setDraft] = useState<TemplateInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beim Wechsel der Vorlage den Entwurf neu befüllen.
  useEffect(() => {
    setError(null);
    setDirty(false);
    if (templateId === NEW) {
      setDraft({ id: crypto.randomUUID(), name: '', settings: {} });
      return;
    }
    if (!loaded) return;
    const found = templates.find((tpl) => tpl.id === templateId);
    if (found) {
      setDraft({
        id: found.id,
        name: found.name,
        model: found.model,
        settings: found.settings,
      });
    } else if (templateId) {
      navigate('/templates', { replace: true });
    } else {
      setDraft(null);
    }
    // Nur bei Wechsel der Adresse oder nach dem ersten Laden neu befüllen,
    // nicht nach jedem Speichern (sonst springt der Cursor) – daher fehlt
    // `templates` absichtlich in der Liste.
  }, [templateId, loaded]);

  const update = (patch: Partial<TemplateInput>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  };

  const chooseModel = (name: string) => {
    if (!draft) return;
    const model = name || undefined;
    const next = models.find((m) => m.name === model);
    // Wie im Chat: eine Denken-Einstellung, die zum Modell nicht passt, entfernen.
    if (!thinkFitsModel(draft.settings.think, next)) {
      const { think: _dropped, ...rest } = draft.settings;
      update({ model, settings: rest });
    } else {
      update({ model });
    }
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
    if (templateId === NEW)
      navigate(`/templates/${result.value.id}`, { replace: true });
  };

  const onDelete = async () => {
    if (!draft || templateId === NEW) return;
    if (!window.confirm(t('templates.confirmDelete', { name: draft.name })))
      return;
    await remove(draft.id);
    navigate('/templates');
  };

  const isSaved = templateId !== NEW && templateId !== null;
  const selectedModel = models.find((m) => m.name === draft?.model);
  const modelMissing =
    draft?.model !== undefined && !selectedModel && models.length > 0;

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border">
        <div className="p-2">
          <button
            type="button"
            onClick={() => navigate(`/templates/${NEW}`)}
            className="flex w-full items-center gap-2 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
          >
            <BookmarkPlus size={15} />
            {t('templates.new')}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {loaded && templates.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted">
              {t('templates.none')}
            </p>
          )}
          {templates.map((tpl) => (
            <NavLink
              key={tpl.id}
              to={`/templates/${tpl.id}`}
              className={({ isActive }) =>
                `my-0.5 block rounded px-2 py-1.5 ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'hover:bg-surface-hover'
                }`
              }
            >
              <div className="truncate">{tpl.name}</div>
              <div className="truncate font-mono text-[11px] text-muted">
                {tpl.model ?? t('templates.anyModel')}
              </div>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={
            draft ? draft.name || t('templates.untitled') : t('templates.title')
          }
          actions={
            draft && (
              <>
                {isSaved && (
                  <button
                    type="button"
                    onClick={() => navigate(`/chat?template=${draft.id}`)}
                    disabled={dirty}
                    title={dirty ? t('templates.saveFirst') : undefined}
                    className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
                  >
                    <MessageSquarePlus size={14} />
                    {t('templates.startChat')}
                  </button>
                )}
                {isSaved && (
                  <button
                    type="button"
                    onClick={() => void onDelete()}
                    title={t('templates.delete')}
                    aria-label={t('templates.delete')}
                    className="rounded border border-border px-2 py-1 hover:bg-surface-hover"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={!dirty}
                  className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-xs text-white disabled:opacity-40"
                >
                  <Save size={14} />
                  {t('templates.save')}
                </button>
              </>
            )
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {draft ? (
            <div className="mx-auto max-w-xl space-y-5 px-6 py-6">
              {error && (
                <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
                  {error}
                </p>
              )}
              <Field label={t('templates.name')}>
                <input
                  autoFocus={templateId === NEW}
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder={t('templates.namePlaceholder')}
                  className="w-full rounded border border-border bg-surface px-2 py-1.5 outline-none focus:border-accent"
                />
              </Field>

              <Field
                label={t('templates.model')}
                hint={
                  modelMissing
                    ? t('templates.modelMissing')
                    : t('templates.modelHint')
                }
              >
                <select
                  value={draft.model ?? ''}
                  onChange={(e) => chooseModel(e.target.value)}
                  className="w-full rounded border border-border bg-surface px-2 py-1.5 font-mono outline-none focus:border-accent"
                >
                  <option value="">{t('templates.anyModel')}</option>
                  {modelMissing && (
                    <option value={draft.model}>{draft.model}</option>
                  )}
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>

              <SettingsFields
                settings={draft.settings}
                model={selectedModel}
                onChange={(settings) => update({ settings })}
              />
            </div>
          ) : (
            <div className="mx-auto max-w-md px-6 pt-16 text-center text-muted">
              <p>{t('templates.intro')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
