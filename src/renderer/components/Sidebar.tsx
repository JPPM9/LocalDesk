import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BookMarked,
  Boxes,
  ChevronRight,
  FolderCode,
  FolderOpen,
  History,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import appIcon from '../../../assets/icon.png';
import type { ChatFolder, ChatSummary } from '../../shared/api';
import type { useChatList } from '../chat/useChatList';
import { useCollapsedFolders } from '../chat/useCollapsedFolders';
import { useOllamaStatus } from '../hooks/useOllamaStatus';
import { useConfirm } from './ConfirmDialog';
import { ChatRow, CHAT_DRAG_TYPE } from './chat/ChatRow';
import { RowMenu } from './RowMenu';
import { StatusPill } from './StatusPill';
import type { PaletteScope } from './CommandPalette';

const MAX_PROJECTS = 5;
const MAX_CHATS = 8;
const PROJECTS_KEY = '__projects__';
const RECENT_KEY = '__recent__';

const AREAS: {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  tip?: string;
}[] = [
  {
    to: '/chat',
    labelKey: 'nav.chat',
    icon: MessageSquare,
    tip: 'sidebar.newChatTip',
  },
  { to: '/templates', labelKey: 'nav.templates', icon: BookMarked },
  { to: '/code', labelKey: 'nav.code', icon: FolderCode },
  { to: '/models', labelKey: 'nav.sectionModels', icon: Boxes },
];

const rowClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-[38px] items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm ${
    isActive
      ? 'bg-surface-active font-medium text-[var(--text-on-tint)]'
      : 'text-muted hover:bg-surface-hover hover:text-text'
  }`;

interface Props {
  /** Schmale Leiste (nur Symbole). */
  collapsed: boolean;
  onToggle: () => void;
  onOpenPalette: (scope: PaletteScope) => void;
  chatList: ReturnType<typeof useChatList>;
  /** Zählt hoch, wenn „Neues Projekt“ (Palette) das Namensfeld öffnen soll. */
  newProjectTick: number;
}

/** Eine Leiste für alles: Bereiche, Projekte, letzte Chats, Modellstatus (JOURNEY.md Fläche 1). */
export function Sidebar({
  collapsed,
  onToggle,
  onOpenPalette,
  chatList,
  newProjectTick,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const status = useOllamaStatus();
  const { isCollapsed, toggle } = useCollapsedFolders();
  const { chats, folders } = chatList;
  const [newName, setNewName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (newProjectTick > 0) setNewName('');
  }, [newProjectTick]);

  const currentChatId = /^\/chat\/([^/]+)/.exec(location.pathname)?.[1];

  // Projekte: zuletzt benutzt zuerst (jüngster Chat darin).
  const projects = useMemo(() => {
    const last = new Map<string, number>();
    for (const c of chats)
      if (c.folderId)
        last.set(c.folderId, Math.max(last.get(c.folderId) ?? 0, c.updatedAt));
    return [...folders].sort(
      (a, b) => (last.get(b.id) ?? 0) - (last.get(a.id) ?? 0),
    );
  }, [chats, folders]);
  const recent = useMemo(
    () => [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [chats],
  );

  const createProject = async () => {
    if (newName === null) return;
    if (!newName.trim()) {
      setNewName(null);
      return;
    }
    const result = await chatList.createFolder(newName);
    if (result.ok) {
      setNewName(null);
      setError(null);
    } else setError(result.error);
  };

  const deleteChat = async (target: ChatSummary) => {
    const ok = await confirm({
      message: t('chat.confirmDelete', { title: target.title }),
      confirmLabel: t('dialog.delete'),
      danger: true,
    });
    if (!ok) return;
    await chatList.remove(target.id);
    if (target.id === currentChatId) navigate('/chat');
  };
  const deleteProject = async (folder: ChatFolder) => {
    const ok = await confirm({
      message: t('folders.confirmDelete', { name: folder.name }),
      confirmLabel: t('dialog.delete'),
      danger: true,
    });
    if (ok) await chatList.deleteFolder(folder.id);
  };

  const dot = !status ? 'bg-subtle' : status.online ? 'bg-ok' : 'bg-error';

  if (collapsed) {
    const iconBtn = 'icon-btn !h-10 !w-10';
    return (
      <aside className="flex w-16 shrink-0 flex-col items-center gap-1 py-2">
        <button
          type="button"
          onClick={onToggle}
          title={t('sidebar.expandTip')}
          aria-label={t('nav.expand')}
          className={iconBtn}
        >
          <img src={appIcon} alt="" className="h-7 w-7 rounded-[8px]" />
        </button>
        <button
          type="button"
          onClick={() => onOpenPalette('all')}
          title={t('sidebar.searchTip')}
          aria-label={t('sidebar.search')}
          className={iconBtn}
        >
          <Search size={19} />
        </button>
        <nav aria-label={t('nav.main')} className="mt-2 flex flex-col gap-1">
          {AREAS.map(({ to, labelKey, icon: Icon, tip }) => (
            <NavLink
              key={to}
              to={to}
              title={t(tip ?? labelKey)}
              aria-label={t(labelKey)}
              className={({ isActive }) =>
                `${iconBtn} ${isActive ? '!bg-surface-active !text-[var(--text-on-tint)]' : ''}`
              }
            >
              <Icon size={19} />
            </NavLink>
          ))}
        </nav>
        <div className="mt-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onOpenPalette('projects')}
            title={t('sidebar.projects')}
            aria-label={t('sidebar.projects')}
            className={iconBtn}
          >
            <FolderOpen size={19} />
          </button>
          <button
            type="button"
            onClick={() => onOpenPalette('chats')}
            title={t('sidebar.recent')}
            aria-label={t('sidebar.recent')}
            className={iconBtn}
          >
            <History size={19} />
          </button>
        </div>
        <span className="flex-1" />
        <NavLink
          to="/status"
          title={
            status?.online
              ? t('status.online', { version: status.version })
              : t('status.offline')
          }
          aria-label={t('nav.status')}
          className={iconBtn}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        </NavLink>
        <NavLink
          to="/settings"
          title={t('sidebar.settingsTip')}
          aria-label={t('nav.settings')}
          className={({ isActive }) =>
            `${iconBtn} ${isActive ? '!bg-surface-active !text-[var(--text-on-tint)]' : ''}`
          }
        >
          <Settings size={19} />
        </NavLink>
      </aside>
    );
  }

  const head = (key: string, label: string, action?: React.ReactNode) => (
    <div className="flex items-center pr-1 pl-3">
      <button
        type="button"
        aria-expanded={!isCollapsed(key)}
        onClick={() => toggle(key)}
        className="flex h-8 min-w-0 flex-1 items-center gap-1 text-xs font-medium text-muted hover:text-text"
      >
        <ChevronRight
          size={13}
          className={`transition-transform ${isCollapsed(key) ? '' : 'rotate-90'}`}
        />
        {label}
      </button>
      {action}
    </div>
  );
  const showAll = (scope: PaletteScope, label: string) => (
    <button
      type="button"
      onClick={() => onOpenPalette(scope)}
      className="h-8 w-full rounded-[var(--radius-md)] px-3 text-left text-xs text-muted hover:bg-surface-hover hover:text-text"
    >
      {label}
    </button>
  );

  return (
    <aside className="flex w-[272px] shrink-0 flex-col">
      <div className="flex items-center gap-2 px-3 py-2">
        <img src={appIcon} alt="" className="h-7 w-7 rounded-[8px]" />
        <span className="flex-1 text-sm font-semibold">LocalDesk</span>
        <button
          type="button"
          onClick={onToggle}
          title={t('sidebar.collapseTip')}
          aria-label={t('nav.collapse')}
          className="icon-btn"
        >
          <PanelLeftClose size={17} />
        </button>
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => onOpenPalette('all')}
          className="flex h-9 w-full items-center gap-2 rounded-[var(--radius-md)] bg-surface-hover px-3 text-sm text-muted hover:text-text"
        >
          <Search size={15} />
          <span className="flex-1 text-left">{t('sidebar.search')}</span>
          <kbd className="text-xs">Strg+K</kbd>
        </button>
      </div>
      <nav aria-label={t('nav.main')} className="space-y-0.5 px-3 pb-2">
        {AREAS.map(({ to, labelKey, icon: Icon, tip }) => (
          <NavLink
            key={to}
            to={to}
            title={tip ? t(tip) : undefined}
            className={rowClass}
          >
            <Icon size={17} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-2">
        <section>
          {head(
            PROJECTS_KEY,
            t('sidebar.projects'),
            <button
              type="button"
              onClick={() => setNewName('')}
              title={t('folders.new')}
              aria-label={t('folders.new')}
              className="icon-btn !h-7 !w-7"
            >
              <Plus size={15} />
            </button>,
          )}
          {!isCollapsed(PROJECTS_KEY) && (
            <div className="space-y-0.5">
              {newName !== null && (
                <div>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void createProject();
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setNewName(null);
                        setError(null);
                      }
                    }}
                    onBlur={() => void createProject()}
                    placeholder={t('folders.namePlaceholder')}
                    aria-label={t('folders.new')}
                    className="field w-full text-sm"
                  />
                  {error && <p className="mt-1 text-xs text-error">{error}</p>}
                </div>
              )}
              {projects.length === 0 && newName === null && (
                <div className="px-3 py-1 text-xs text-muted">
                  <p>{t('sidebar.emptyProjects')}</p>
                  <button
                    type="button"
                    onClick={() => setNewName('')}
                    className="btn btn-secondary mt-2"
                  >
                    {t('folders.new')}
                  </button>
                </div>
              )}
              {projects.slice(0, MAX_PROJECTS).map((folder) => (
                <ProjectRow
                  key={folder.id}
                  folder={folder}
                  onRename={(name) =>
                    void chatList.renameFolder(folder.id, name)
                  }
                  onDelete={() => void deleteProject(folder)}
                  onDropChat={(chatId) =>
                    void chatList.moveChat(chatId, folder.id)
                  }
                />
              ))}
              {projects.length > MAX_PROJECTS &&
                showAll(
                  'projects',
                  t('sidebar.showAllCount', { count: projects.length }),
                )}
            </div>
          )}
        </section>

        <section>
          {head(RECENT_KEY, t('sidebar.recent'))}
          {!isCollapsed(RECENT_KEY) && (
            <div className="space-y-0.5">
              {recent.length === 0 && (
                <div className="px-3 py-1 text-xs text-muted">
                  <p>{t('sidebar.emptyChats')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="btn btn-secondary mt-2"
                  >
                    {t('chat.newChat')}
                  </button>
                </div>
              )}
              {recent.slice(0, MAX_CHATS).map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  folders={folders}
                  onRename={(id, title) => void chatList.rename(id, title)}
                  onDelete={(target) => void deleteChat(target)}
                  onMove={(id, folderId) =>
                    void chatList.moveChat(id, folderId)
                  }
                />
              ))}
              {recent.length > MAX_CHATS &&
                showAll('chats', t('sidebar.showAll'))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-1 px-3 py-3">
        <StatusPill />
        <NavLink
          to="/settings"
          title={t('sidebar.settingsTip')}
          className={rowClass}
        >
          <Settings size={17} />
          {t('nav.settings')}
        </NavLink>
      </div>
    </aside>
  );
}

/** Eine Projektzeile: Link zur Projektseite, Ziel für gezogene Chats, Menü „Mehr“. */
function ProjectRow({
  folder,
  onRename,
  onDelete,
  onDropChat,
}: {
  folder: ChatFolder;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDropChat: (chatId: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [over, setOver] = useState(false);

  const finish = (save: boolean) => {
    if (save && draft.trim()) onRename(draft);
    setEditing(false);
  };

  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(true);
          if (e.key === 'Escape') {
            e.preventDefault();
            finish(false);
          }
        }}
        onBlur={() => finish(true)}
        aria-label={t('folders.rename')}
        className="field w-full text-sm"
      />
    );

  const accepts = (event: DragEvent) =>
    event.dataTransfer.types.includes(CHAT_DRAG_TYPE);

  return (
    <NavLink
      to={`/projects/${folder.id}`}
      onDragOver={(event) => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const chatId = event.dataTransfer.getData(CHAT_DRAG_TYPE);
        if (chatId) {
          event.preventDefault();
          onDropChat(chatId);
        }
      }}
      className={(state) =>
        `group ${rowClass(state)} ${over ? 'ring-2 ring-[var(--focus-ring)]' : ''}`
      }
    >
      <FolderOpen size={16} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{folder.name}</span>
      {(folder.instructions || folder.collectionId) && (
        <span
          title={t('folders.hasSetup')}
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
        />
      )}
      <span className="shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
        <RowMenu
          name={folder.name}
          items={[
            {
              label: t('folders.rename'),
              onClick: () => {
                setDraft(folder.name);
                setEditing(true);
              },
            },
            { label: t('folders.delete'), danger: true, onClick: onDelete },
          ]}
        />
      </span>
    </NavLink>
  );
}
