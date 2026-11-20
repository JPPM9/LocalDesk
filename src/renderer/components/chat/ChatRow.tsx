import { useState, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ChatFolder, ChatSummary } from '../../../shared/api';
import { MoveMenu } from './MoveMenu';
import { RowMenu } from '../RowMenu';
import { messageLocale } from '../../../shared/messages';

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
        className="my-0.5 w-full rounded border border-accent bg-surface px-2 py-2 outline-none"
      />
    );
  }

  return (
    <div className="relative">
      <NavLink
        to={`/chat/${chat.id}`}
        title={new Date(chat.updatedAt).toLocaleString(messageLocale())}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(CHAT_DRAG_TYPE, chat.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        className={({ isActive }) =>
          `group my-px flex h-[38px] items-center gap-1 rounded-[var(--radius-md)] px-3 text-sm ${
            isActive
              ? 'bg-surface-active font-medium text-[var(--text-on-tint)]'
              : 'text-muted hover:bg-surface-hover hover:text-text'
          }`
        }
      >
        <span className="min-w-0 flex-1 truncate">{chat.title}</span>
        <span className="shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
          <RowMenu
            name={chat.title}
            items={[
              { label: t('folders.moveTo'), onClick: () => setMenuOpen(true) },
              {
                label: t('chat.rename'),
                onClick: () => {
                  setDraft(chat.title);
                  setEditing(true);
                },
              },
              {
                label: t('chat.delete'),
                danger: true,
                onClick: () => onDelete(chat),
              },
            ]}
          />
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
