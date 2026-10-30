import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  CircleAlert,
  FileMinus,
  FilePen,
  FilePlus,
  Undo2,
} from 'lucide-react';
import type { CodeChangeState } from '../../../shared/code';
import type { ToolCallRecord } from '../../../shared/api';
import { DiffView } from './DiffView';

/**
 * Eine Datei-Änderung des Agenten im Verlauf: eingeklappt mit Pfad, aufgeklappt
 * mit Vorher/Nachher – und „Rückgängig“, solange es die Sicherung gibt.
 */
export function CodeChangeRow({ call }: { call: ToolCallRecord }) {
  const { t } = useTranslation();
  const [state, setState] = useState<CodeChangeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const path =
    typeof call.arguments.path === 'string' ? call.arguments.path : '';
  const done = call.status === 'done';

  useEffect(() => {
    if (done) void window.api.codeChangeState(call.id).then(setState);
  }, [call.id, done]);

  const undo = async (force = false) => {
    setError(null);
    const result = await window.api.undoCodeChange(call.id, force);
    if (result.ok) {
      setState('undone');
    } else if (
      result.conflict &&
      window.confirm(t('code.undoConflict', { error: result.error }))
    ) {
      await undo(true);
    } else if (!result.conflict) {
      setError(result.error);
    }
  };

  const Icon =
    call.toolName === 'write_file'
      ? FilePlus
      : call.toolName === 'delete_file'
        ? FileMinus
        : FilePen;

  return (
    <details className="group rounded-xl border border-border text-[13px]">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-muted select-none hover:text-text">
        {call.status === 'error' ? (
          <CircleAlert size={14} className="shrink-0 text-error" />
        ) : call.status === 'denied' || call.status === 'cancelled' ? (
          <Ban size={14} className="shrink-0" />
        ) : (
          <Icon size={14} className="shrink-0 text-ok" />
        )}
        <span>
          {t(`code.change.${call.toolName}`, { defaultValue: call.toolName })}
        </span>
        <span className="min-w-0 truncate font-mono text-[12.5px]">{path}</span>
        <span className="ml-auto shrink-0 text-xs text-subtle">
          {state === 'undone'
            ? t('code.undone')
            : t(`toolCall.status.${call.status}`)}
        </span>
        {done && state === 'applied' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void undo();
            }}
            className="flex shrink-0 items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs text-text hover:bg-surface-hover"
          >
            <Undo2 size={12} />
            {t('code.undo')}
          </button>
        )}
      </summary>
      <div className="space-y-2 border-t border-border px-3 py-2">
        {error && <p className="text-xs text-error">{error}</p>}
        {call.preview ? (
          <DiffView text={call.preview} />
        ) : (
          <p className="text-xs text-muted">{call.result}</p>
        )}
        {call.status === 'error' && call.result && (
          <p className="text-xs text-error">{call.result}</p>
        )}
      </div>
    </details>
  );
}
