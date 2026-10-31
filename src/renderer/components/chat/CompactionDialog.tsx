import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';
import type { CompactionDraft } from '../../../shared/compaction';
import { COMPACTION_SUMMARY_MAX } from '../../../shared/compaction';
import { estimateTokens } from '../../../shared/context';
import { messageLocale } from '../../../shared/messages';

interface CompactionDialogProps {
  chatId: string;
  model: string;
  onClose: () => void;
  /** Nach „Übernehmen“: Der Chat ist verdichtet. */
  onApplied: () => void;
}

/**
 * „Älteren Teil verdichten“: Das Modell schreibt eine Zusammenfassung, du prüfst und
 * bearbeitest sie, erst „Übernehmen“ ändert, was ans Modell geht.
 */
export function CompactionDialog({
  chatId,
  model,
  onClose,
  onApplied,
}: CompactionDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CompactionDraft | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'working' | 'applying'>('working');
  const started = useRef(false);

  const run = async () => {
    setBusy('working');
    setError(null);
    setDraft(null);
    const result = await window.api.compactChat(chatId, model);
    setBusy('applying');
    if (result.ok) {
      setDraft(result.value);
      setText(result.value.summary);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // Nur beim Öffnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    void window.api.cancelCompaction(chatId);
    onClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        void window.api.cancelCompaction(chatId);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [chatId, onClose]);

  const apply = async () => {
    if (!draft || !text.trim()) return;
    setBusy('applying');
    const result = await window.api.applyCompaction(chatId, {
      summary: text,
      upToMessageId: draft.upToMessageId,
    });
    if (result.ok) onApplied();
    else setError(result.error);
  };

  const working = draft === null && error === null;
  // Die Zahl nach dem Bearbeiten: Der Unterschied zum Vorschlag wird dazugerechnet.
  const tokensAfter = draft
    ? Math.max(
        0,
        draft.tokensAfter +
          estimateTokens(text) -
          estimateTokens(draft.summary),
      )
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compact-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="compact-title" className="font-semibold">
          {t('compact.title')}
        </h2>

        {working && (
          <div className="space-y-1 py-6 text-center text-sm text-muted">
            <p className="flex items-center justify-center gap-2">
              <LoaderCircle size={16} className="animate-spin" />
              {t('compact.working')}
            </p>
            <p className="text-xs">{t('compact.workingHint')}</p>
          </div>
        )}

        {draft && (
          <>
            <p className="text-sm text-muted">{t('compact.review')}</p>
            <textarea
              value={text}
              maxLength={COMPACTION_SUMMARY_MAX}
              onChange={(event) => setText(event.target.value)}
              rows={12}
              className="min-h-40 w-full resize-y rounded border border-border bg-bg px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-accent"
            />
            <p className="text-xs text-muted">
              {t('compact.covered', { count: draft.messagesCovered })}{' '}
              {t('compact.tokens', {
                before: draft.tokensBefore.toLocaleString(messageLocale()),
                after: tokensAfter.toLocaleString(messageLocale()),
              })}
            </p>
            <p className="text-xs text-subtle">{t('compact.limits')}</p>
          </>
        )}

        {error && (
          <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {error && (
            <button
              type="button"
              onClick={() => void run()}
              className="rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm hover:bg-surface-hover"
            >
              {t('compact.retry')}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm hover:bg-surface-hover"
          >
            {t('compact.cancel')}
          </button>
          {draft && (
            <button
              type="button"
              onClick={() => void apply()}
              disabled={!text.trim()}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('compact.apply')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
