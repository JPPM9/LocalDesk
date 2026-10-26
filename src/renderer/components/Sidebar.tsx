import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BookMarked,
  Boxes,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { StatusPill } from './StatusPill';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

// Aufbau wie bei LocalAI: Bereiche mit Überschrift. Neue Seiten kommen hier dazu,
// sobald ihre Phase gebaut wird (z. B. Agents in Phase 4).
const sections: NavSection[] = [
  {
    titleKey: 'nav.sectionChat',
    items: [
      { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
      { to: '/templates', labelKey: 'nav.templates', icon: BookMarked },
    ],
  },
  {
    titleKey: 'nav.sectionModels',
    items: [{ to: '/models', labelKey: 'nav.models', icon: Boxes }],
  },
  {
    titleKey: 'nav.sectionSystem',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings }],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      <div className="flex h-12 items-center justify-between px-3">
        {!collapsed && (
          <span className="font-semibold tracking-tight">LocalDesk</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={t(collapsed ? 'nav.expand' : 'nav.collapse')}
          aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
          className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-text"
        >
          <ToggleIcon size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        {sections.map((section) => (
          <div key={section.titleKey}>
            {!collapsed && (
              <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                {t(section.titleKey)}
              </div>
            )}
            {section.items.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? t(labelKey) : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded px-2 py-1.5 ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-text hover:bg-surface-hover'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{t(labelKey)}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Geladenes Modell, VRAM und GPU-Last kommen in Phase 3 dazu. */}
      <div className="border-t border-border px-3 py-2.5">
        <StatusPill compact={collapsed} />
      </div>
    </aside>
  );
}
