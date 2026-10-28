import {
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Inbox,
  Pencil,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { ChatFolder } from '../../../shared/api';
import { CHAT_DRAG_TYPE, IconButton } from './ChatRow';

interface FolderSectionProps {
  /** null = Bereich „ohne Ordner“ (kein Umbenennen/Löschen). */
  folder: ChatFolder | null;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  /** Ein Chat wurde hierher gezogen. */
  onDropChat: (chatId: string) => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  children: ReactNode;
}

/** Ordner-Kopf mit seinen Chats; zum Ein-/Ausklappen und als Ziel beim Ziehen. */
export function FolderSection({
  folder,
  count,
  collapsed,
  onToggle,
  onDropChat,
  onRename,
  onDelete,
  children,
}: FolderSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const acceptsDrop = (event: DragEvent) =>
    event.dataTransfer.types.includes(CHAT_DRAG_TYPE);

  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      if (!acceptsDrop(event)) return;
      event.preventDefault(); // erst das erlaubt das Loslassen hier
      event.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    },
    onDragLeave: (event: DragEvent) => {
      // Nur beim Verlassen des ganzen Bereichs, nicht beim Wechsel auf ein Kind-Element
      if (!event.currentTarget.contains(event.relatedTarget as Node))
        setDragOver(false);
    },
    onDrop: (event: DragEvent) => {
      setDragOver(false);
      const chatId = event.dataTransfer.getData(CHAT_DRAG_TYPE);
      if (chatId) {
        event.preventDefault();
        onDropChat(chatId);
      }
    },
  };

  const finishEdit = (save: boolean) => {
    if (save && draft.trim()) onRename?.(draft);
    setEditing(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') finishEdit(true);
    if (event.key === 'Escape') {
      event.preventDefault();
      finishEdit(false);
    }
  };

  const name = folder?.name ?? t('folders.unfiled');
  const FolderIcon = folder ? (collapsed ? Folder : FolderOpen) : Inbox;

  return (
    <section
      {...dropHandlers}
      className={`rounded-lg ${dragOver ? 'bg-accent-soft/60 ring-1 ring-accent' : ''}`}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => finishEdit(true)}
          aria-label={t('folders.rename')}
          className="my-0.5 w-full rounded border border-accent bg-surface px-2 py-1 outline-none"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onClick={onToggle}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
          className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-text select-none hover:bg-surface-hover"
        >
          <FolderIcon size={15} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate">{name}</span>
          {/* Punkt: Dieses Projekt hat Anweisungen oder eigene Dokumente. */}
          {(folder?.instructions || folder?.collectionId) && (
            <span
              title={t('folders.hasSetup')}
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent group-hover:hidden"
            />
          )}
          <span className="text-xs font-normal text-subtle tabular-nums group-hover:hidden">
            {count}
          </span>
          <ChevronRight
            size={14}
            className={`shrink-0 text-subtle transition-transform group-hover:hidden ${collapsed ? '' : 'rotate-90'}`}
          />
          {folder && (
            <span className="hidden shrink-0 gap-0.5 group-hover:flex">
              <IconButton
                label={t('folders.open')}
                onClick={() => navigate(`/projects/${folder.id}`)}
              >
                <Settings2 size={12} />
              </IconButton>
              <IconButton
                label={t('folders.rename')}
                onClick={() => {
                  setDraft(folder.name);
                  setEditing(true);
                }}
              >
                <Pencil size={12} />
              </IconButton>
              <IconButton
                label={t('folders.delete')}
                onClick={() => onDelete?.()}
              >
                <Trash2 size={12} />
              </IconButton>
            </span>
          )}
        </div>
      )}
      {!collapsed && (
        <div className="pl-5">
          {count === 0 ? (
            <p className="px-2.5 py-1 text-xs text-subtle">
              {t('folders.empty')}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}
