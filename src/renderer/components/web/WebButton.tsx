import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { PickerButton } from '../PickerButton';

interface WebButtonProps {
  on: boolean;
  onChange: (on: boolean) => void;
  /** Ohne Werkzeug-Fähigkeit kann das Modell keine Seiten lesen. */
  modelSupportsTools: boolean | undefined;
}

/** Schalter „Internet“ im Eingabefeld: Darf das Modell in diesem Chat Webseiten lesen? */
export function WebButton({
  on,
  onChange,
  modelSupportsTools,
}: WebButtonProps) {
  const { t } = useTranslation();
  return (
    <PickerButton
      icon={Globe}
      label={t('webChat.button')}
      chipText={t('webChat.chip')}
      count={on ? 1 : 0}
      showCount={false}
      title={t('webChat.title')}
      intro={t('webChat.intro')}
    >
      <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-surface-hover">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 accent-[var(--ld-accent)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block">{t('webChat.switch')}</span>
          <span className="block text-[11px] text-muted">
            {t('webChat.hint')}
          </span>
        </span>
      </label>
      {modelSupportsTools === false && on && (
        <p className="text-[11.5px] text-warn">{t('webChat.noTools')}</p>
      )}
    </PickerButton>
  );
}
