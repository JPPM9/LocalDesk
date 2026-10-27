import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, NotebookPen } from 'lucide-react';

interface SaveNoteButtonProps {
  chatId: string;
  /** Nur diese Antwort (mit Frage); fehlt = ganzer Chat. */
  answerId?: string;
  /** „icon“ im Chat-Kopf, „text“ unter einer Antwort. */
  variant: 'icon' | 'text';
}

type State =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; path: string }
  | { kind: 'error'; error: string };

/**
 * Speichert Chat oder Antwort als Notiz im Obsidian-Vault. Jeder Klick legt eine
 * neue Notiz an (gleicher Name → „(2)“) – überschrieben wird nie etwas.
 */
export function SaveNoteButton({
  chatId,
  answerId,
  variant,
}: SaveNoteButtonProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: 'idle' });

  // Die Rückmeldung verschwindet nach ein paar Sekunden wieder.
  useEffect(() => {
    if (state.kind !== 'saved' && state.kind !== 'error') return;
    const timer = setTimeout(() => setState({ kind: 'idle' }), 6000);
    return () => clearTimeout(timer);
  }, [state]);

  const save = async () => {
    setState({ kind: 'saving' });
    const result = await window.api.saveChatNote(chatId, answerId);
    setState(
      result.ok
        ? { kind: 'saved', path: result.value }
        : { kind: 'error', error: result.error },
    );
  };

  const label = answerId ? t('chatNote.saveAnswer') : t('chatNote.saveChat');
  const message =
    state.kind === 'saved'
      ? t('chatNote.saved', { path: state.path })
      : state.kind === 'error'
        ? t('chatNote.error', { error: state.error })
        : null;

  if (variant === 'icon') {
    return (
      <div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={state.kind === 'saving'}
          title={label}
          aria-label={label}
          className="rounded border border-border px-2 py-1 hover:bg-surface-hover disabled:opacity-50"
        >
          <StateIcon state={state} />
        </button>
        {/* Fest unten rechts – der Chat-Kopf schneidet Überstehendes ab. */}
        {message && (
          <p
            role="status"
            className={`fixed right-6 bottom-24 z-50 max-w-md rounded border border-border bg-surface px-3 py-2 text-xs shadow-lg ${
              state.kind === 'error' ? 'text-error' : 'text-ok'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  return message ? (
    <span
      role="status"
      className={`flex items-center gap-1 text-[11px] ${
        state.kind === 'error' ? 'text-error' : 'text-ok'
      }`}
    >
      <StateIcon state={state} size={12} />
      {message}
    </span>
  ) : (
    <button
      type="button"
      onClick={() => void save()}
      disabled={state.kind === 'saving'}
      title={label}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-hover hover:text-text focus:opacity-100 disabled:opacity-50"
    >
      <NotebookPen size={12} />
      {t('chatNote.toObsidian')}
    </button>
  );
}

function StateIcon({ state, size = 15 }: { state: State; size?: number }) {
  if (state.kind === 'saved')
    return <Check size={size} className="shrink-0 text-ok" />;
  if (state.kind === 'error')
    return <CircleAlert size={size} className="shrink-0 text-error" />;
  return <NotebookPen size={size} className="shrink-0" />;
}
