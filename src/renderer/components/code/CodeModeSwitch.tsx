import { useTranslation } from 'react-i18next';
import { ClipboardList, ShieldQuestion } from 'lucide-react';
import { CODE_MODES, type CodeMode } from '../../../shared/code-agent';

const ICONS = { manual: ShieldQuestion, plan: ClipboardList } as const;

interface CodeModeSwitchProps {
  mode: CodeMode;
  onChange: (mode: CodeMode) => void;
  /** Während eine Antwort läuft, gilt der Modus dieser Antwort – umschalten erst danach. */
  disabled?: boolean;
}

/** Arbeitsweise des Code-Agenten: Plan (nur lesen) oder Manuell fragen (alles einzeln bestätigen). */
export function CodeModeSwitch({
  mode,
  onChange,
  disabled = false,
}: CodeModeSwitchProps) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('code.mode.title')}
      className="flex gap-0.5 rounded-full border border-border bg-surface-2 p-0.5"
    >
      {CODE_MODES.map((value) => {
        const Icon = ICONS[value];
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(value)}
            title={t(`code.mode.${value}Hint`)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs disabled:opacity-60 ${
              active
                ? 'bg-accent-soft text-accent-text'
                : 'text-muted hover:text-text'
            }`}
          >
            <Icon size={13} />
            {t(`code.mode.${value}`)}
          </button>
        );
      })}
    </div>
  );
}
