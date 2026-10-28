import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { SourceRef } from '../../../shared/api';
import { sourceLabel } from '../../../shared/knowledge';

interface SourceListProps {
  sources: SourceRef[];
  /** Diese Quelle aufklappen (Klick auf [n] im Text); ändert sich mit jedem Klick. */
  focus: { n: number; at: number } | null;
  /** Alle Textstellen gleich aufgeklappt zeigen (Seitenbereich). */
  expanded?: boolean;
}

/** Quellen unter einer Antwort: Nummer, Datei, Seite – aufklappbar mit Textstelle. */
export function SourceList({ sources, focus, expanded }: SourceListProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(expanded ? sources.map((s) => s.n) : []),
  );
  const [error, setError] = useState<string | null>(null);
  const refs = useRef(new Map<number, HTMLLIElement>());

  // Klick auf [n] im Text: Quelle aufklappen und hinscrollen.
  useEffect(() => {
    if (!focus) return;
    setOpen((current) => new Set(current).add(focus.n));
    refs.current.get(focus.n)?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  const toggle = (n: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const openFile = async (source: SourceRef) => {
    const result = await window.api.openDocument(source.documentId);
    setError(result.ok ? null : result.error);
  };

  return (
    <div className="space-y-1 text-[13px]">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <BookOpen size={12} />
        {t('sources.title', { count: sources.length })}
      </div>
      <ul className="space-y-1">
        {sources.map((source) => (
          <li
            key={source.n}
            ref={(el) => {
              if (el) refs.current.set(source.n, el);
            }}
            className="rounded-xl bg-surface-2"
          >
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => toggle(source.n)}
                aria-expanded={open.has(source.n)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-md bg-accent-soft px-1 text-[11px] font-semibold text-accent-text">
                  {source.n}
                </span>
                <span
                  className="truncate text-[13px] font-medium"
                  title={source.path}
                >
                  {sourceLabel(source)}
                </span>
                <span className="shrink-0 truncate text-xs text-subtle">
                  {source.collectionName}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void openFile(source)}
                title={t('sources.open')}
                aria-label={t('sources.open')}
                className="shrink-0 rounded-md p-1 text-subtle hover:bg-surface hover:text-text"
              >
                <ExternalLink size={13} />
              </button>
            </div>
            {open.has(source.n) && (
              <div className="space-y-1 border-t border-border px-3 py-2">
                {source.heading && (
                  <p className="text-[11px] text-muted">{source.heading}</p>
                )}
                <p className="max-h-60 overflow-auto text-xs whitespace-pre-wrap">
                  {source.text}
                </p>
                <p className="text-[10px] text-muted">
                  {t('sources.score', {
                    score: source.score.toLocaleString('de-DE', {
                      maximumFractionDigits: 2,
                    }),
                  })}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
