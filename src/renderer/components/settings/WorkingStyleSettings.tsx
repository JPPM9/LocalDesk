import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { workingStylePrompt } from '../../../shared/working-style';

/** Abschnitt „Arbeitsweise“: ein kurzer Block, den jeder Chat vor seinen Anweisungen mitschickt. */
export function WorkingStyleSettings() {
  const { t } = useTranslation();
  const [on, setOn] = useState<boolean | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(() => {
    try {
      return localStorage.getItem('localdesk.autoConfirm') !== '0';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    void window.api.getWorkingStyle().then(setOn);
  }, []);

  const change = (value: boolean) => {
    setOn(value);
    void window.api.setWorkingStyle(value);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{t('workingStyle.title')}</h2>
        <p className="mt-1 text-xs text-muted">{t('workingStyle.intro')}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={on ?? true}
          disabled={on === null}
          onChange={(e) => change(e.target.checked)}
          className="accent-[var(--ld-accent)]"
        />
        {t('workingStyle.enable')}
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoConfirm}
          onChange={(e) => {
            setAutoConfirm(e.target.checked);
            try {
              localStorage.setItem(
                'localdesk.autoConfirm',
                e.target.checked ? '1' : '0',
              );
            } catch {
              // ohne Speicher gilt es nur bis zum Schließen
            }
          }}
          className="mt-1 accent-[var(--ld-accent)]"
        />
        <span>
          {t('auto.setting')}
          <span className="block text-xs text-muted">
            {t('auto.settingHint')}
          </span>
        </span>
      </label>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">
          {t('workingStyle.show')}
        </summary>
        <p className="mt-2 whitespace-pre-line">{workingStylePrompt()}</p>
      </details>
    </section>
  );
}
