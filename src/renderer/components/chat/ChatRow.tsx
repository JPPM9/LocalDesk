import { useState, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FolderInput, Pencil, Trash2 } from 'lucide-react';
import type { ChatFolder, ChatSummary } from '../../../shared/api';
import { MoveMenu } from './MoveMenu';

/** Datentyp beim Ziehen – so erkennen Ordner, dass ein Chat ankommt. */
export const CHAT_DRAG_TYPE = 'application/x-localdesk-chat';

interface ChatRowProps {
  chat: ChatSummary;
  folders: ChatFolder[];
  onRename: (chatId: string, title: string) => void;
  onDelete: (chat: ChatSummary) => void;
  onMove: (chatId: string, folderId: string | null) => void;
}

/** Ein Chat in der Liste: Link, Umbenennen, Verschieben, Löschen – und ziehbar. */
export function ChatRow({
  chat,
  folders,
  onRename,
  onDelete,
  onMove,
}: ChatRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const finishEdit = (save: boolean) => {
    if (save && draft.trim()) onRename(chat.id, draft);
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') finishEdit(true);
    if (event.key === 'Escape') {
      event.preventDefault(); // Esc gehört dem Umbenennen, nicht dem „Stopp“-Kürzel
      finishEdit(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => finishEdit(true)}
        aria-label={t('chat.rename')}
        className="my-0.5 w-full rounded border border-accent bg-surface px-2 py-1.5 outline-none"
      />
    );
  }

  return (
    <div className="relative">
      <NavLink
        to={`/chat/${chat.id}`}
        title={new Date(chat.updatedAt).toLocaleString('de-DE')}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(CHAT_DRAG_TYPE, chat.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        className={({ isActive }) =>
          `group my-0.5 flex items-center gap-1 rounded px-2 py-1.5 ${
            isActive ? 'bg-accent-soft text-accent' : 'hover:bg-surface-hover'
          }`
        }
      >
        <span className="min-w-0 flex-1 truncate">{chat.title}</span>
        <span
          className={`shrink-0 gap-0.5 group-hover:flex ${menuOpen ? 'flex' : 'hidden'}`}
        >
          <IconButton
            label={t('folders.moveTo')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <FolderInput size={13} />
          </IconButton>
          <IconButton
            label={t('chat.rename')}
            onClick={() => {
              setDraft(chat.title);
              setEditing(true);
            }}
          >
            <Pencil size={13} />
          </IconButton>
          <IconButton label={t('chat.delete')} onClick={() => onDelete(chat)}>
            <Trash2 size={13} />
          </IconButton>
        </span>
      </NavLink>
      {menuOpen && (
        <MoveMenu
          folders={folders}
          currentFolderId={chat.folderId}
          onPick={(folderId) => {
            setMenuOpen(false);
            onMove(chat.id, folderId);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        // Der Knopf liegt im Link – ohne das würde der Klick auch den Chat öffnen.
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="rounded p-1 text-muted hover:bg-surface hover:text-text"
    >
      {children}
    </button>
  );
}
