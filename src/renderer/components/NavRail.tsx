import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BookMarked,
  Boxes,
  Library,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Settings,
  Sun,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import appIcon from '../../../assets/icon.png';
import type { ThemeChoice } from '../../shared/appearance';
import { useOllamaStatus } from '../hooks/useOllamaStatus';
import { useTheme } from '../hooks/useTheme';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

// Bereiche der App von oben nach unten; Einstellungen stehen gesondert unten.
const ITEMS: NavItem[] = [
  { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { to: '/templates', labelKey: 'nav.templates', icon: BookMarked },
  { to: '/mail', labelKey: 'nav.mail', icon: Mail },
  { to: '/knowledge', labelKey: 'nav.knowledge', icon: Library },
  { to: '/skills', labelKey: 'nav.skills', icon: WandSparkles },
  { to: '/models', labelKey: 'nav.models', icon: Boxes },
  { to: '/status', labelKey: 'nav.status', icon: Activity },
];

const THEME_NEXT: Record<ThemeChoice, ThemeChoice> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${
    isActive
      ? 'bg-accent-soft text-accent-text'
      : 'text-muted hover:bg-surface-hover hover:text-text'
  }`;

/**
 * Schmale Symbolleiste links (Entwurf B „Arbeitsplatz“): alle Bereiche als Symbole,
 * Namen im Tooltip. Der Punkt am Status-Symbol zeigt, ob Ollama erreichbar ist.
 */
export function NavRail() {
  const { t } = useTranslation();
  const status = useOllamaStatus();
  const [theme, setTheme] = useTheme();

  const statusDot = !status
    ? 'bg-subtle'
    : status.online
      ? 'bg-ok'
      : 'bg-error';
  const statusText = !status
    ? t('status.checking')
    : status.online
      ? t('status.online', { version: status.version })
      : t('status.offline');
  const ThemeIcon = THEME_ICON[theme ?? 'system'];

  return (
    <nav
      aria-label={t('nav.main')}
      className="flex w-[60px] shrink-0 flex-col items-center gap-1.5 border-r border-border bg-sidebar py-3"
    >
      <img
        src={appIcon}
        alt="LocalDesk"
        title="LocalDesk"
        className="mb-2 h-8 w-8 rounded-[9px]"
      />
      {ITEMS.map(({ to, labelKey, icon: Icon }) => {
        const label =
          to === '/status' ? `${t(labelKey)} – ${statusText}` : t(labelKey);
        return (
          <NavLink
            key={to}
            to={to}
            title={label}
            aria-label={label}
            className={itemClass}
          >
            <Icon size={19} />
            {to === '/status' && (
              <span
                className={`absolute top-2 right-2 h-2 w-2 rounded-full ring-2 ring-sidebar ${statusDot}`}
              />
            )}
          </NavLink>
        );
      })}

      <span className="flex-1" />

      {theme && (
        <button
          type="button"
          onClick={() => setTheme(THEME_NEXT[theme])}
          title={t('appearance.railHint', {
            current: t(`appearance.${theme}`),
          })}
          aria-label={t('appearance.title')}
          className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-hover hover:text-text"
        >
          <ThemeIcon size={18} />
        </button>
      )}
      <NavLink
        to="/settings"
        title={t('nav.settings')}
        aria-label={t('nav.settings')}
        className={itemClass}
      >
        <Settings size={19} />
      </NavLink>
    </nav>
  );
}
