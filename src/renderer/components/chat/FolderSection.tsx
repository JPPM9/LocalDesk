import {
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Inbox,
  Pencil,
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
      className={`rounded ${dragOver ? 'bg-accent-soft/60 ring-1 ring-accent' : ''}`}
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
          className="group flex cursor-pointer items-center gap-1 rounded px-1 py-1 text-xs font-semibold text-muted select-none hover:bg-surface-hover hover:text-text"
        >
          <ChevronRight
            size={13}
            className={`shrink-0 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          />
          <FolderIcon size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{name}</span>
          <span className="font-mono font-normal group-hover:hidden">
            {count}
          </span>
          {folder && (
            <span className="hidden shrink-0 gap-0.5 group-hover:flex">
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
        <div className="pl-3">
          {count === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted">
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
