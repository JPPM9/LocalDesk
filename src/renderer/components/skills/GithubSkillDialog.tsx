import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  LoaderCircle,
  Search,
  Star,
  TriangleAlert,
} from 'lucide-react';
import type { GithubOpenResult } from '../../../shared/github';
import { messageLocale } from '../../../shared/messages';
import {
  SKILL_IMPORT_LIMITS,
  type SkillImportPreview,
} from '../../../shared/skill-import';
import type { SkillView } from '../../../shared/skills';
import { formatBytes, formatDate } from '../../utils/format';
import { SkillImportDialog } from './SkillImportDialog';

type Hits = Extract<GithubOpenResult, { kind: 'search' }>;
type SkillList = Extract<GithubOpenResult, { kind: 'skills' }>;

interface GithubSkillDialogProps {
  /** Nach dem Hinzufügen: die neuen Skills. */
  onInstalled: (skills: SkillView[]) => void;
  onClose: () => void;
}

const BUTTON =
  'rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm hover:bg-surface-hover';

/**
 * „Von GitHub“: Suchbegriff → Projekte → Skills darin → Auswahl → Vorschau mit
 * Sicherheitsprüfung (derselbe Dialog wie beim Ablegen von Dateien). GitHub wird nur
 * auf deinen Klick gefragt; gespeichert wird erst in der Vorschau mit „Hinzufügen“.
 */
export function GithubSkillDialog({
  onInstalled,
  onClose,
}: GithubSkillDialogProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<'opening' | 'checking' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<Hits | null>(null);
  const [list, setList] = useState<SkillList | null>(null);
  // Die Liste wurde aus den Treffern geöffnet – nur dann gibt es ein „Zurück zu den Treffern“.
  const [fromHits, setFromHits] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<SkillImportPreview | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const open = async (text: string, viaHit: boolean) => {
    if (busy || !text.trim()) return;
    setBusy('opening');
    setError(null);
    try {
      const result = await window.api.openGithub(text.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const value = result.value;
      if (value.kind === 'search') {
        setHits(value);
        setList(null);
      } else if (value.kind === 'skills') {
        setList(value);
        setFromHits(viaHit);
        // Ein einziger Skill ist gleich ausgewählt.
        setPicked(new Set(value.skills.length === 1 ? [0] : []));
      } else {
        setPreview(value.preview);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    if (busy || !list || picked.size === 0) return;
    setBusy('checking');
    setError(null);
    try {
      const result = await window.api.inspectGithub(list.listId, [...picked]);
      if (result.ok) setPreview(result.value);
      else setError(result.error);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(null);
    }
  };

  const toggle = (index: number) => {
    const next = new Set(picked);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setPicked(next);
  };

  if (preview) {
    return (
      <SkillImportDialog
        key={preview.importId}
        initialFiles={[]}
        initialPreview={preview}
        onBack={() => setPreview(null)}
        onClose={onClose}
        onInstalled={onInstalled}
      />
    );
  }

  const limit = SKILL_IMPORT_LIMITS.skills;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-skill-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="github-skill-title" className="font-medium">
          {t('skills.github.title')}
        </h2>
        <p className="text-sm text-muted">{t('skills.github.intro')}</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void open(input, false);
            }}
            placeholder={t('skills.github.placeholder')}
            aria-label={t('skills.github.title')}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px]"
          />
          <button
            type="button"
            onClick={() => void open(input, false)}
            disabled={busy !== null || !input.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'opening' ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            {busy === 'opening'
              ? t('skills.github.loading')
              : t('skills.github.go')}
          </button>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted">
          <TriangleAlert size={13} className="mt-0.5 shrink-0 text-warn" />
          {t('skills.github.warning')}
        </p>
        {error && (
          <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {list ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {fromHits && hits && (
                  <button
                    type="button"
                    onClick={() => setList(null)}
                    className="flex items-center gap-1 text-sm text-accent-text hover:underline"
                  >
                    <ArrowLeft size={14} />
                    {t('skills.github.backHits')}
                  </button>
                )}
                <span className="font-mono text-sm">{list.label}</span>
                <span className="text-xs text-muted">
                  {t('skills.github.skills', { count: list.skills.length })}
                </span>
              </div>
              {list.notices.map((notice, index) => (
                <p
                  key={index}
                  className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs"
                >
                  {notice}
                </p>
              ))}
              {picked.size >= limit && (
                <p className="text-xs text-muted">
                  {t('skills.github.pickLimit', { max: limit })}
                </p>
              )}
              <ul className="space-y-2">
                {list.skills.map((skill) => {
                  const checked = picked.has(skill.index);
                  return (
                    <li key={skill.index}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && picked.size >= limit}
                          onChange={() => toggle(skill.index)}
                          className="mt-1 accent-accent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {skill.name}
                          </span>
                          <span className="block truncate font-mono text-xs text-subtle">
                            {skill.path || '/'}
                          </span>
                          <span className="block text-xs text-subtle">
                            {t('skills.github.mdSize', {
                              size: formatBytes(skill.mdBytes),
                            })}
                            {skill.files > 0 &&
                              ` · ${t('skills.import.files', { count: skill.files })}`}
                            {skill.skipped > 0 &&
                              ` · ${t('skills.import.skipped', { count: skill.skipped })}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : hits ? (
            <>
              <p className="text-sm text-muted">
                {hits.hits.length === 0
                  ? t('skills.github.noHits')
                  : t('skills.github.hits', { count: hits.total })}
              </p>
              {hits.total > hits.hits.length && hits.hits.length > 0 && (
                <p className="text-xs text-subtle">
                  {t('skills.github.moreHits', { shown: hits.hits.length })}
                </p>
              )}
              <ul className="space-y-2">
                {hits.hits.map((hit) => (
                  <li
                    key={hit.fullName}
                    className="flex items-start gap-3 rounded-xl border border-border bg-bg px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{hit.fullName}</p>
                      <p className="text-sm text-muted">
                        {hit.description || t('skills.github.noDescription')}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-subtle">
                        <span
                          className="flex items-center gap-1"
                          title={t('skills.github.stars')}
                        >
                          <Star size={12} />
                          {hit.stars.toLocaleString(messageLocale())}
                        </span>
                        {hit.pushedAt && (
                          <span>
                            {t('skills.github.updated', {
                              date: formatDate(`${hit.pushedAt}T12:00:00`),
                            })}
                          </span>
                        )}
                        <span>
                          {hit.license
                            ? t('skills.github.license', {
                                license: hit.license,
                              })
                            : t('skills.github.noLicense')}
                        </span>
                        {hit.archived && (
                          <span className="text-warn">
                            {t('skills.github.archived')}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void open(hit.fullName, true)}
                      disabled={busy !== null}
                      className={`${BUTTON} shrink-0 disabled:opacity-50`}
                    >
                      {t('skills.github.viewSkills')}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={BUTTON}>
            {t('dialog.cancel')}
          </button>
          {list && (
            <button
              type="button"
              onClick={() => void check()}
              disabled={busy !== null || picked.size === 0}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'checking' && (
                <LoaderCircle size={15} className="animate-spin" />
              )}
              {busy === 'checking'
                ? t('skills.github.checking')
                : t('skills.github.check', { count: picked.size })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
