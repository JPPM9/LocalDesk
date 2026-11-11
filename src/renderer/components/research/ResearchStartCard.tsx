import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Telescope, TriangleAlert } from 'lucide-react';
import { ANSWER_RESERVE, suggestContextLength } from '../../../shared/context';
import {
  contextFits,
  RESEARCH_DEFAULT_DEPTH,
  RESEARCH_DEPTH_LIST,
  RESEARCH_DEPTHS,
  type ResearchDepth,
} from '../../../shared/research';
import { formatContext } from '../../utils/format';

interface ResearchStartCardProps {
  /** Der Rechercheauftrag (der Text im Eingabefeld). */
  question: string;
  context: {
    /** Kontextlänge des Chats. */
    length: number;
    /** Größte Kontextlänge, die das Modell kann. */
    modelMax?: number;
    onRaise: (length: number) => void;
  };
  onStart: (depth: ResearchDepth) => void;
  onCancel: () => void;
}

/**
 * Die Karte vor einer Recherche: Stufe wählen, sehen, was passiert (Suchanfragen gehen an
 * ollama.com, Seiten werden gelesen), dann „Starten“ – das ist die Zustimmung. Ohne Schlüssel
 * oder bei zu kleinem Kontext bleibt „Starten“ gesperrt.
 */
export function ResearchStartCard({
  question,
  context,
  onStart,
  onCancel,
}: ResearchStartCardProps) {
  const { t } = useTranslation();
  const [depth, setDepth] = useState<ResearchDepth>(RESEARCH_DEFAULT_DEPTH);
  // Gibt es den Ollama-Schlüssel für die Suche? (null = noch nicht geladen)
  const [keySaved, setKeySaved] = useState<boolean | null>(null);

  useEffect(() => {
    void window.api.getWebSearch().then((s) => setKeySaved(s.configured));
  }, []);

  const spec = RESEARCH_DEPTHS[depth];
  const fits = contextFits(depth, context.length);
  // Ziel: mindestens `minContext` – `suggestContextLength` rechnet den Platz für die Antwort dazu.
  const raiseTo = fits
    ? null
    : suggestContextLength(
        spec.minContext - ANSWER_RESERVE,
        context.length,
        context.modelMax,
      );
  const canStart = keySaved === true && fits && question !== '';

  return (
    <div
      role="group"
      aria-label={t('research.cardTitle')}
      className="mb-2 space-y-3 rounded-xl border border-accent/40 bg-accent-soft/50 px-4 py-3"
    >
      <div className="flex items-center gap-2 font-medium">
        <Telescope size={16} className="shrink-0 text-accent-text" />
        {t('research.cardTitle')}
      </div>
      <p className="line-clamp-2 text-[13px] break-words whitespace-pre-wrap">
        {question}
      </p>

      <fieldset className="space-y-1">
        <legend className="mb-1 text-xs font-medium">
          {t('research.depthLabel')}
        </legend>
        {RESEARCH_DEPTH_LIST.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
              depth === value
                ? 'border-accent/60 bg-surface'
                : 'border-transparent hover:bg-surface-hover'
            }`}
          >
            <input
              type="radio"
              name="research-depth"
              checked={depth === value}
              onChange={() => setDepth(value)}
              className="mt-1 accent-[var(--ld-accent)]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px]">
                {t(`research.depth.${value}`)}
              </span>
              <span className="block text-xs text-muted">
                {t('research.depthHint', {
                  searches: RESEARCH_DEPTHS[value].searches,
                  pages: RESEARCH_DEPTHS[value].pages,
                  time: t(`research.time.${value}`),
                })}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="text-xs text-muted">{t('research.privacy')}</p>

      {keySaved === false && (
        <p className="flex items-start gap-2 text-xs text-warn">
          <TriangleAlert size={14} className="mt-px shrink-0" />
          <span>
            {t('research.noKey')}{' '}
            <Link to="/settings" className="text-accent-text underline">
              {t('research.toSettings')}
            </Link>
          </span>
        </p>
      )}
      {!fits && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
          <TriangleAlert size={14} className="shrink-0 text-warn" />
          <span className="min-w-0 flex-1">
            {t('research.contextTight', {
              min: formatContext(spec.minContext),
              length: formatContext(context.length),
            })}
            {raiseTo === null && (
              <>
                {' '}
                {t('research.noRaise', {
                  length: formatContext(context.modelMax ?? context.length),
                })}
              </>
            )}
          </span>
          {raiseTo !== null && (
            <button
              type="button"
              onClick={() => context.onRaise(raiseTo)}
              className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              {t('research.raise', { length: formatContext(raiseTo) })}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStart(depth)}
          disabled={!canStart}
          className="rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-40"
        >
          {t('research.start')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover"
        >
          {t('research.cancel')}
        </button>
      </div>
    </div>
  );
}
