import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { PickerButton } from '../PickerButton';

interface WebButtonProps {
  /** Webseiten lesen. */
  read: boolean;
  onRead: (on: boolean) => void;
  /** Im Web suchen. */
  search: boolean;
  onSearch: (on: boolean) => void;
  /** Ohne Werkzeug-Fähigkeit kann das Modell weder lesen noch suchen. */
  modelSupportsTools: boolean | undefined;
}

/** Schalter „Internet“ im Eingabefeld: Darf das Modell in diesem Chat Webseiten lesen und im Web suchen? */
export function WebButton({
  read,
  onRead,
  search,
  onSearch,
  modelSupportsTools,
}: WebButtonProps) {
  const { t } = useTranslation();
  // Gibt es den Ollama-Schlüssel für die Suche? (null = noch nicht geladen)
  const [keySaved, setKeySaved] = useState<boolean | null>(null);

  useEffect(() => {
    void window.api.getWebSearch().then((s) => setKeySaved(s.configured));
  }, []);

  const on = read || search;
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
      <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-surface-hover">
        <input
          type="checkbox"
          checked={read}
          onChange={(e) => onRead(e.target.checked)}
          className="mt-1 accent-[var(--ld-accent)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block">{t('webChat.switch')}</span>
          <span className="block text-xs text-muted">{t('webChat.hint')}</span>
        </span>
      </label>
      <label
        className={`flex items-start gap-2 rounded px-2 py-1 ${
          keySaved === false
            ? 'opacity-60'
            : 'cursor-pointer hover:bg-surface-hover'
        }`}
      >
        <input
          type="checkbox"
          checked={search}
          disabled={keySaved === false && !search}
          onChange={(e) => onSearch(e.target.checked)}
          className="mt-1 accent-[var(--ld-accent)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block">{t('webChat.searchSwitch')}</span>
          <span className="block text-xs text-muted">
            {t('webChat.searchHint')}
          </span>
        </span>
      </label>
      {keySaved === false && (
        <p className="text-xs text-warn">
          {search ? t('webChat.searchKeyGone') : t('webChat.searchNoKey')}{' '}
          <Link to="/settings" className="text-accent-text underline">
            {t('webChat.toSettings')}
          </Link>
        </p>
      )}
      {modelSupportsTools === false && on && (
        <p className="text-xs text-warn">{t('webChat.noTools')}</p>
      )}
    </PickerButton>
  );
}
