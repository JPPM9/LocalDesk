import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_CHOICES } from '../../../shared/appearance';
import {
  LANGUAGE_CHOICES,
  type LanguageChoice,
} from '../../../shared/language';
import { useTheme } from '../../hooks/useTheme';
import { applyLanguage } from '../../i18n';

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
const LANGUAGE_LABELS = {
  system: 'appearance.languageSystem',
  de: 'appearance.languageDe',
  en: 'appearance.languageEn',
} as const;

/** Farbschema und Sprache wählen – wirkt sofort. */
export function AppearanceSettings() {
  const { t } = useTranslation();
  const [theme, choose] = useTheme();
  const [language, setLanguage] = useState<LanguageChoice | null>(null);

  useEffect(() => {
    void window.api.getLanguage().then((state) => setLanguage(state.choice));
  }, []);

  const chooseLanguage = async (choice: LanguageChoice) => {
    setLanguage(choice);
    await applyLanguage(await window.api.setLanguage(choice));
  };

  return (
    <section>
      <h2 className="mb-1 font-semibold">{t('appearance.title')}</h2>
      <p className="mb-3 text-xs text-muted">{t('appearance.intro')}</p>
      <div
        role="radiogroup"
        aria-label={t('appearance.theme')}
        className="inline-flex gap-1 rounded-lg bg-surface-2 p-1"
      >
        {THEME_CHOICES.map((choice) => {
          const Icon = ICONS[choice];
          const active = theme === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(choice)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-surface text-text shadow-card'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Icon size={15} />
              {t(`appearance.${choice}`)}
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 mb-1 font-semibold">{t('appearance.language')}</h2>
      <p className="mb-3 text-xs text-muted">{t('appearance.languageIntro')}</p>
      <div
        role="radiogroup"
        aria-label={t('appearance.language')}
        className="inline-flex gap-1 rounded-lg bg-surface-2 p-1"
      >
        {LANGUAGE_CHOICES.map((choice) => {
          const active = language === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void chooseLanguage(choice)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-surface text-text shadow-card'
                  : 'text-muted hover:text-text'
              }`}
            >
              {t(LANGUAGE_LABELS[choice])}
            </button>
          );
        })}
      </div>
    </section>
  );
}
