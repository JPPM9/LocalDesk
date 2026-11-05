import { useTranslation } from 'react-i18next';
import { Telescope } from 'lucide-react';

interface ResearchButtonProps {
  /** An: Die nächste Nachricht wird als Rechercheauftrag ausgeführt. */
  armed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** Knopf „Recherche“ im Eingabefeld: gilt nur für die nächste Nachricht, danach springt er von selbst aus. */
export function ResearchButton({
  armed,
  onToggle,
  disabled,
}: ResearchButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={armed}
      title={t('research.buttonTitle')}
      aria-label={t('research.buttonTitle')}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] disabled:opacity-40 ${
        armed
          ? 'border-transparent bg-accent-soft text-accent-text'
          : 'border-border bg-surface text-muted hover:text-text'
      }`}
    >
      <Telescope size={14} />
      {t('research.button')}
    </button>
  );
}
