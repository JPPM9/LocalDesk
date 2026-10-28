import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_CHOICES, type ThemeChoice } from '../../../shared/appearance';

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** Farbschema wählen: wie Windows, hell oder dunkel – wirkt sofort. */
export function AppearanceSettings() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    void window.api.getTheme().then(setTheme);
  }, []);

  const choose = (next: ThemeChoice) => {
    setTheme(next);
    void window.api.setTheme(next);
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
    </section>
  );
}
