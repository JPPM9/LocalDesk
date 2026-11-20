import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { ChatFolder, ChatSummary } from '../../shared/api';
import type { ThemeChoice } from '../../shared/appearance';
import { splitHighlights } from '../../shared/search';
import { useChatSearch } from '../chat/useChatSearch';
import {
  groupItems,
  loadRecent,
  matches,
  pushRecent,
  type PaletteGroup,
  type PaletteItem,
} from '../palette/commands';
import { useChatRunning } from '../chat/runningState';
import { triggerShortcut } from '../shortcuts/useShortcut';

export type PaletteScope = 'all' | 'projects' | 'chats';

const MAX_PROJECTS = 5;
const MAX_CHATS = 8;

interface Props {
  scope: PaletteScope;
  chats: ChatSummary[];
  folders: ChatFolder[];
  onClose: () => void;
  onToggleSidebar: () => void;
  onNewProject: () => void;
  onHelp: () => void;
  onTheme: (theme: ThemeChoice) => void;
}

export function CommandPalette(props: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inChat = useLocation().pathname.startsWith('/chat');
  const running = useChatRunning();
  const [scope, setScope] = useState(props.scope);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const search = useChatSearch(scope === 'projects' ? '' : query);

  // Fokus kehrt beim Schließen an die alte Stelle zurück.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => before?.focus?.();
  }, []);

  const base = useMemo<PaletteItem[]>(() => {
    const go = (id: string, label: string, to: string, shortcut?: string) =>
      ({
        id,
        group: 'goTo',
        label,
        shortcut,
        run: () => navigate(to),
      }) as const;
    const items: PaletteItem[] = [
      go('P-01', t('nav.chat'), '/chat'),
      go('P-02', t('nav.templates'), '/templates'),
      go('P-03', t('nav.code'), '/code'),
      go('P-04', t('nav.sectionModels'), '/models'),
      go('P-05', t('palette.manageKnowledge'), '/knowledge'),
      go('P-06', t('palette.manageSkills'), '/skills'),
      go('P-07', t('palette.manageMail'), '/mail'),
      go('P-08', t('nav.status'), '/status'),
      go('P-09', t('nav.settings'), '/settings', 'Strg+,'),
      {
        id: 'P-11',
        group: 'commands',
        label: t('shortcuts.newChat'),
        shortcut: 'Strg+N',
        run: () => {
          navigate('/chat');
          triggerShortcut('focusInput');
        },
      },
      {
        id: 'P-12',
        group: 'commands',
        label: t('folders.new'),
        run: props.onNewProject,
      },
      {
        id: 'P-13',
        group: 'commands',
        label: t('shortcuts.toggleSidebar'),
        shortcut: 'Strg+B',
        run: props.onToggleSidebar,
      },
      {
        id: 'P-19a',
        group: 'appearance',
        label: t('palette.themeLight'),
        run: () => props.onTheme('light'),
      },
      {
        id: 'P-19b',
        group: 'appearance',
        label: t('palette.themeDark'),
        run: () => props.onTheme('dark'),
      },
      {
        id: 'P-19c',
        group: 'appearance',
        label: t('palette.themeSystem'),
        run: () => props.onTheme('system'),
      },
      {
        id: 'P-20',
        group: 'help',
        label: t('palette.showShortcuts'),
        shortcut: 'Strg+/ · F1',
        run: props.onHelp,
      },
      ...(
        [
          ['P-21', 'zoomIn', 'Strg+Plus', 'zoom größer lupe'],
          ['P-22', 'zoomOut', 'Strg+Minus', 'zoom kleiner lupe'],
          ['P-23', 'zoomReset', 'Strg+0', 'zoom 100'],
          ['P-24', 'fullscreen', 'F11', 'vollbild fullscreen'],
          [
            'P-25',
            'devtools',
            'Strg+Umschalt+I',
            'devtools entwickler konsole',
          ],
        ] as const
      ).map(([id, command, shortcut, keywords]): PaletteItem => ({
        id,
        keywords,
        group: 'window',
        label: t(`palette.${command}`),
        shortcut,
        run: () => void window.api.windowCommand(command),
      })),
    ];
    if (inChat) {
      items.push(
        {
          id: 'P-16',
          group: 'inChat',
          label: t('shortcuts.focusInput'),
          shortcut: 'Strg+L',
          run: () => triggerShortcut('focusInput'),
        },
        {
          id: 'P-17',
          group: 'inChat',
          label: t('shortcuts.chatSettings'),
          shortcut: 'Strg+J',
          run: () => triggerShortcut('chatSettings'),
        },
      );
    }
    if (running)
      items.push({
        id: 'P-18',
        group: 'inChat',
        label: t('shortcuts.stop'),
        shortcut: 'Esc',
        run: () => triggerShortcut('stop'),
      });
    return items;
    // props.* sind stabile Rückruf-Funktionen des Rahmens
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [t, navigate, inChat, running]);

  const dynamic = useMemo(() => {
    const projectName = new Map(props.folders.map((f) => [f.id, f.name]));
    // Zuletzt benutzt = jüngste Aktivität eines Chats im Projekt.
    const lastUse = new Map<string, number>();
    for (const chat of props.chats)
      if (chat.folderId)
        lastUse.set(
          chat.folderId,
          Math.max(lastUse.get(chat.folderId) ?? 0, chat.updatedAt),
        );
    const projects: PaletteItem[] = [...props.folders]
      .sort((a, b) => (lastUse.get(b.id) ?? 0) - (lastUse.get(a.id) ?? 0))
      .map((f) => ({
        id: `project:${f.id}`,
        group: 'projects',
        label: f.name,
        run: () => navigate(`/projects/${f.id}`),
      }));
    const chats: PaletteItem[] = [...props.chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((c) => ({
        id: `chat:${c.id}`,
        group: 'chats',
        label: c.title,
        detail: c.folderId ? projectName.get(c.folderId) : undefined,
        run: () => navigate(`/chat/${c.id}`),
      }));
    return { projects, chats };
  }, [props.chats, props.folders, navigate]);

  const sections = useMemo(() => {
    const q = query.trim();
    const cap = (list: PaletteItem[], n: number) =>
      scope === 'all' ? list.slice(0, n) : list;
    const projects = cap(
      dynamic.projects.filter((i) => matches(i, q)),
      MAX_PROJECTS,
    );
    const hits: PaletteItem[] = (search?.hits ?? []).map((hit) => ({
      id: `chat:${hit.chatId}:${hit.messageId}`,
      group: 'chats' as PaletteGroup,
      label: hit.chatTitle,
      detail: splitHighlights(hit.snippet)
        .map((part) => part.text)
        .join(''),
      run: () => navigate(`/chat/${hit.chatId}?m=${hit.messageId}`),
    }));
    const titleHits = cap(
      dynamic.chats.filter((i) => matches(i, q)),
      MAX_CHATS,
    );
    const chats = [...titleHits, ...hits.slice(0, MAX_CHATS)];
    if (scope === 'projects')
      return groupItems(projects).map((g) => ({ ...g, key: g.group }));
    if (scope === 'chats')
      return groupItems(chats).map((g) => ({ ...g, key: g.group }));
    const matched = base.filter((i) => matches(i, q));
    const result: {
      key: string;
      group: PaletteGroup | 'recent';
      items: PaletteItem[];
    }[] = [];
    if (!q) {
      const recent = loadRecent()
        .map((id) => base.find((i) => i.id === id))
        .filter((i): i is PaletteItem => !!i);
      if (recent.length)
        result.push({ key: 'recent', group: 'recent', items: recent });
    }
    for (const g of groupItems([...matched, ...projects, ...chats]))
      result.push({ ...g, key: g.group });
    return result;
  }, [base, dynamic, query, scope, search, navigate]);

  const flat = sections.flatMap((s) => s.items);
  const current = Math.min(active, Math.max(0, flat.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [current, sections]);

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    pushRecent(item.id);
    props.onClose();
    item.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current + 1) % Math.max(1, flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current - 1 + flat.length) % Math.max(1, flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(flat[current]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      props.onClose();
    } else if (event.key === 'Backspace' && !query && scope !== 'all') {
      setScope('all');
    } else if (event.key === 'Tab') {
      event.preventDefault(); // Fokus bleibt im Dialog
    }
  };

  const labelOf = (key: string) => t(`palette.${key}`);
  let index = -1;

  return (
    <div
      className="dialog-scrim fixed inset-0 z-[70] flex justify-center px-6 pt-[12vh]"
      onMouseDown={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        className="dialog flex h-fit w-[640px] max-w-full flex-col overflow-hidden !p-0"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--control-edge)' }}
        >
          <Search size={18} className="shrink-0 text-muted" />
          {scope !== 'all' && (
            <span className="shrink-0 rounded-full bg-surface-active px-3 py-0.5 text-xs text-[var(--text-on-tint)]">
              {t(
                scope === 'projects'
                  ? 'palette.scopeProjects'
                  : 'palette.scopeChats',
              )}
            </span>
          )}
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.title')}
            className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none placeholder:text-muted"
          />
        </div>
        <div
          ref={listRef}
          role="listbox"
          className="max-h-[min(352px,calc(100vh-260px))] overflow-y-auto p-2"
        >
          {flat.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">
              <p>{t('palette.empty', { query })}</p>
              <button
                type="button"
                className="btn btn-secondary mt-3"
                onClick={() => {
                  setQuery('');
                  setScope('all');
                }}
              >
                {t('palette.clear')}
              </button>
            </div>
          )}
          {sections.map((section) => (
            <div key={section.key} role="group" className="mb-1">
              <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted">
                {labelOf(section.group)}
              </div>
              {section.items.map((item) => {
                index += 1;
                const selected = index === current;
                const myIndex = index;
                return (
                  <div
                    key={`${section.key}:${item.id}`}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActive(myIndex)}
                    onClick={() => choose(item)}
                    className={`flex h-11 cursor-pointer items-center gap-3 rounded-[14px] px-3 text-sm ${
                      selected
                        ? 'bg-surface-active text-[var(--text-on-tint)]'
                        : 'text-text'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                      {item.detail && (
                        <span
                          className={`ml-2 text-xs ${selected ? '' : 'text-muted'}`}
                        >
                          {item.detail}
                        </span>
                      )}
                    </span>
                    {item.shortcut && (
                      <kbd className="shrink-0 text-xs opacity-80">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 text-xs text-muted">
          {t('palette.footer')}
        </div>
      </div>
    </div>
  );
}
