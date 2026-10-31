import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, TriangleAlert } from 'lucide-react';
import type { GithubSkill } from '../../../shared/github';

interface GithubSkillDialogProps {
  onLoaded: (skill: GithubSkill) => void;
  onClose: () => void;
}

/**
 * Link von GitHub einfügen → LocalDesk holt die SKILL.md (nur den Text) und legt
 * sie als Entwurf in den Editor. Gespeichert wird erst, wenn du es dort tust.
 */
export function GithubSkillDialog({
  onLoaded,
  onClose,
}: GithubSkillDialogProps) {
  const { t } = useTranslation();
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const load = async () => {
    if (busy || !link.trim()) return;
    setBusy(true);
    setError(null);
    const result = await window.api.fetchGithubSkill(link.trim());
    setBusy(false);
    if (result.ok) onLoaded(result.value);
    else setError(result.error);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-skill-title"
        className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="github-skill-title" className="font-semibold">
          {t('skills.github.title')}
        </h2>
        <p className="text-sm text-muted">{t('skills.github.intro')}</p>
        <input
          ref={inputRef}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void load();
          }}
          placeholder={t('skills.github.placeholder')}
          aria-label={t('skills.github.title')}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[13px]"
        />
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <TriangleAlert size={13} className="mt-0.5 shrink-0 text-warn" />
          {t('skills.github.warning')}
        </p>
        {error && (
          <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm hover:bg-surface-hover"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy || !link.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Download size={15} />
            {busy ? t('skills.github.loading') : t('skills.github.load')}
          </button>
        </div>
      </div>
    </div>
  );
}
