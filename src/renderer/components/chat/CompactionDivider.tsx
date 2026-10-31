import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import type { ChatCompaction } from '../../../shared/compaction';
import { messageLocale } from '../../../shared/messages';

interface CompactionDividerProps {
  compaction: ChatCompaction;
  /** Verdichtung aufheben – fehlt, solange eine Antwort läuft. */
  onClear?: () => void;
}

/**
 * Trennlinie im Chat: Bis hierher stehen die Nachrichten nur noch als Zusammenfassung im
 * Verlauf, den das Modell bekommt. Aufklappen zeigt die Zusammenfassung.
 */
export function CompactionDivider({
  compaction,
  onClear,
}: CompactionDividerProps) {
  const { t } = useTranslation();
  const saved = Math.max(0, compaction.tokensBefore - compaction.tokensAfter);
  return (
    <div className="my-1 space-y-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
      <div className="flex items-center gap-2">
        <Layers size={13} className="shrink-0 text-accent-text" />
        <span className="min-w-0 flex-1">
          {t('compact.divider', {
            count: compaction.messagesCovered,
            saved: saved.toLocaleString(messageLocale()),
          })}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded border border-border px-2 py-0.5 hover:bg-surface-hover hover:text-text"
          >
            {t('compact.clear')}
          </button>
        )}
      </div>
      <details>
        <summary className="cursor-pointer select-none">
          {t('compact.show')}
        </summary>
        <p className="mt-1.5 whitespace-pre-wrap text-text">
          {compaction.summary}
        </p>
      </details>
    </div>
  );
}
