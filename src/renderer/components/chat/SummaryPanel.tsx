import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, LoaderCircle, ScrollText } from 'lucide-react';
import type { SummaryDraft } from '../../../shared/api';

interface SummaryPanelProps {
  chatId: string;
  model: string;
  /** „suggest“: erst fragen (Vorschlag nach dem Chat); „start“: gleich zusammenfassen. */
  start: 'suggest' | 'start';
  onClose: () => void;
}

type State =
  | { kind: 'suggest' }
  | { kind: 'working' }
  | { kind: 'preview'; draft: SummaryDraft }
  | { kind: 'saving'; draft: SummaryDraft }
  | { kind: 'saved'; path: string }
  | { kind: 'error'; error: string; draft?: SummaryDraft };

/**
 * Zusammenfassung über dem Eingabefeld: Vorschlag → Modell fasst zusammen →
 * du bearbeitest Titel und Text → Speichern in Obsidian. Erst der Klick auf
 * „Zusammenfassen“ belegt die Grafikkarte.
 */
export function SummaryPanel({
  chatId,
  model,
  start,
  onClose,
}: SummaryPanelProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>(
    start === 'suggest' ? { kind: 'suggest' } : { kind: 'working' },
  );

  // Nur das Ergebnis der neuesten Anfrage zählt – eine neue bricht die alte im
  // Main-Prozess ab, deren „Abgebrochen“ soll dann nicht angezeigt werden.
  const latest = useRef(0);
  const summarize = async () => {
    const request = ++latest.current;
    setState({ kind: 'working' });
    const result = await window.api.summarizeChat(chatId, model);
    if (request !== latest.current) return;
    setState(
      result.ok
        ? { kind: 'preview', draft: result.value }
        : { kind: 'error', error: result.error },
    );
  };

  // Über den Knopf „Zusammenfassen“ geht es sofort los – nur einmal, auch wenn
  // React im Entwicklungsmodus Effekte zur Kontrolle doppelt ausführt.
  const started = useRef(false);
  useEffect(() => {
    if (start === 'start' && !started.current) {
      started.current = true;
      void summarize();
    }
    // Nur beim Öffnen – ein Neustart kommt über den Knopf „Erneut versuchen“.
  }, []);

  // Die Erfolgsmeldung schließt sich nach ein paar Sekunden.
  useEffect(() => {
    if (state.kind !== 'saved') return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [state.kind]);

  const dismiss = () => {
    void window.api.dismissSummary(chatId);
    onClose();
  };

  const save = async (draft: SummaryDraft) => {
    setState({ kind: 'saving', draft });
    const result = await window.api.saveSummary(chatId, model, draft);
    setState(
      result.ok
        ? { kind: 'saved', path: result.value }
        : { kind: 'error', error: result.error, draft },
    );
  };

  const frame = (children: React.ReactNode) => (
    <div
      role="group"
      aria-label={t('summary.title')}
      className="mb-3 space-y-2 rounded-xl border border-accent/40 bg-accent-soft/50 px-3.5 py-3 text-sm"
    >
      {children}
    </div>
  );
  const button =
    'rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50';
  const primary =
    'rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50';

  switch (state.kind) {
    case 'suggest':
      return frame(
        <>
          <Title
            icon={
              <ScrollText size={16} className="shrink-0 text-accent-text" />
            }
          >
            {t('summary.suggestTitle')}
          </Title>
          <p className="text-xs text-muted">
            {t('summary.suggestText', { model })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void summarize()}
              className={primary}
            >
              {t('summary.summarize')}
            </button>
            <button type="button" onClick={dismiss} className={button}>
              {t('summary.noThanks')}
            </button>
          </div>
        </>,
      );
    case 'working':
      return frame(
        <div className="flex items-center gap-2">
          <LoaderCircle
            size={16}
            className="shrink-0 animate-spin text-accent-text"
          />
          <span>{t('summary.working', { model })}</span>
          <button
            type="button"
            onClick={() => {
              void window.api.cancelSummary(chatId);
              onClose();
            }}
            className={`${button} ml-auto`}
          >
            {t('summary.cancel')}
          </button>
        </div>,
      );
    case 'preview':
    case 'saving':
      return (
        <DraftEditor
          key="draft"
          draft={state.draft}
          saving={state.kind === 'saving'}
          frame={frame}
          onSave={(draft) => void save(draft)}
          onDiscard={dismiss}
          onRetry={() => void summarize()}
        />
      );
    case 'saved':
      return frame(
        <p role="status" className="flex items-center gap-1.5 text-xs text-ok">
          <Check size={14} className="shrink-0" />
          {t('summary.saved', { path: state.path })}
        </p>,
      );
    case 'error':
      return frame(
        <>
          <p className="flex items-start gap-1.5 text-xs text-error">
            <CircleAlert size={14} className="mt-0.5 shrink-0" />
            {t('summary.error', { error: state.error })}
          </p>
          <div className="flex flex-wrap gap-2">
            {state.draft ? (
              <button
                type="button"
                onClick={() =>
                  setState({ kind: 'preview', draft: state.draft! })
                }
                className={primary}
              >
                {t('summary.backToDraft')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void summarize()}
                className={primary}
              >
                {t('summary.retry')}
              </button>
            )}
            <button type="button" onClick={onClose} className={button}>
              {t('summary.close')}
            </button>
          </div>
        </>,
      );
  }
}

function Title({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 font-medium">
      {icon}
      {children}
    </div>
  );
}

/** Vorschau zum Bearbeiten: Titel (= Dateiname) und Text. */
function DraftEditor({
  draft,
  saving,
  frame,
  onSave,
  onDiscard,
  onRetry,
}: {
  draft: SummaryDraft;
  saving: boolean;
  frame: (children: React.ReactNode) => React.ReactNode;
  onSave: (draft: SummaryDraft) => void;
  onDiscard: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(draft.title);
  const [text, setText] = useState(draft.text);
  const ready = title.trim() !== '' && text.trim() !== '';
  const field =
    'w-full rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent';

  return frame(
    <>
      <Title
        icon={<ScrollText size={16} className="shrink-0 text-accent-text" />}
      >
        {t('summary.previewTitle')}
      </Title>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label={t('summary.noteTitle')}
        maxLength={150}
        className={`${field} font-medium`}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={t('summary.noteText')}
        rows={10}
        className={`${field} max-h-[45vh] resize-y font-mono text-xs`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || saving}
          onClick={() => onSave({ title, text })}
          className="rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('summary.save')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onRetry}
          className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
        >
          {t('summary.again')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onDiscard}
          className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
        >
          {t('summary.discard')}
        </button>
      </div>
    </>,
  );
}
