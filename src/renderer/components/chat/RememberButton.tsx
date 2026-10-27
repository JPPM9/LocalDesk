import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Check } from 'lucide-react';
import { MemoryEditor } from './MemoryEditor';

interface RememberButtonProps {
  /** Vorschlag für den Text – meist die ganze Nachricht, du kürzt ihn. */
  text: string;
  project?: { id: string; name: string };
  align?: 'start' | 'end';
}

/** Knopf „Merken“ an einer Nachricht: öffnet den Editor, speichert erst nach Bestätigung. */
export function RememberButton({
  text,
  project,
  align = 'start',
}: RememberButtonProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'editing' | 'saved'>('idle');

  if (state === 'editing') {
    return (
      <MemoryEditor
        title={t('memories.rememberTitle')}
        initialText={text}
        projectName={project?.name}
        onSave={async (newText, scope) => {
          const result = await window.api.addMemory(
            newText,
            scope === 'projekt' && project ? project.id : null,
          );
          if (!result.ok) return result.error;
          setState('saved');
          return null;
        }}
        onCancel={() => setState('idle')}
        cancelLabel={t('memories.cancel')}
      />
    );
  }

  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : ''}`}>
      {state === 'saved' ? (
        <span className="flex items-center gap-1 text-[11px] text-ok">
          <Check size={12} />
          {t('memories.saved')}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setState('editing')}
          title={t('memories.rememberHint')}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-hover hover:text-text focus:opacity-100"
        >
          <Brain size={12} />
          {t('memories.add')}
        </button>
      )}
    </div>
  );
}
