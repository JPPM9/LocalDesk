import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import { MEMORY_TEXT_MAX } from '../../../shared/memory';

export type MemoryScope = 'global' | 'projekt';

interface MemoryEditorProps {
  title: string;
  initialText: string;
  initialScope?: MemoryScope;
  /** Nur im Projekt-Chat: Wahl „für alle Chats“ oder „nur dieses Projekt“. */
  projectName?: string;
  /** Liefert einen Fehlertext, wenn das Speichern nicht geklappt hat. */
  onSave: (text: string, scope: MemoryScope) => Promise<string | null> | void;
  onCancel: () => void;
  cancelLabel: string;
}

/**
 * Bearbeitbarer Vorschlag für eine Erinnerung – im Chat als Rückfrage des Modells
 * und für den Knopf „Merken“. Gespeichert wird erst, wenn du bestätigst.
 */
export function MemoryEditor({
  title,
  initialText,
  initialScope = 'global',
  projectName,
  onSave,
  onCancel,
  cancelLabel,
}: MemoryEditorProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText.slice(0, MEMORY_TEXT_MAX));
  const [scope, setScope] = useState<MemoryScope>(
    projectName ? initialScope : 'global',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = text.trim();

  const save = async () => {
    setBusy(true);
    setError(null);
    const failed = await onSave(trimmed, scope);
    if (failed) {
      setError(failed);
      setBusy(false);
    }
  };

  return (
    <div
      role="group"
      aria-label={title}
      className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft/50 px-3.5 py-3 text-sm"
    >
      <div className="flex items-center gap-2 font-medium">
        <Brain size={16} className="shrink-0 text-accent-text" />
        {title}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MEMORY_TEXT_MAX}
        rows={2}
        aria-label={t('memories.text')}
        className="w-full resize-y rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        {projectName && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            {t('memories.scope')}
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as MemoryScope)}
              className="rounded border border-border bg-bg px-2 py-1 text-xs outline-none focus:border-accent"
            >
              <option value="global">{t('memories.global')}</option>
              <option value="projekt">
                {t('memories.project', { name: projectName })}
              </option>
            </select>
          </label>
        )}
        <span className="ml-auto text-[11px] text-muted">
          {text.length}/{MEMORY_TEXT_MAX}
        </span>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!trimmed || busy}
          onClick={() => void save()}
          className="rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('memories.save')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
