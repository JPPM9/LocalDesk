import { useState, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Pencil, SquarePen, Trash2 } from 'lucide-react';
import type { ChatSummary } from '../../../shared/api';

interface ChatListProps {
  chats: ChatSummary[];
  onNew: () => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chat: ChatSummary) => void;
}

export function ChatList({ chats, onNew, onRename, onDelete }: ChatListProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startEdit = (chat: ChatSummary) => {
    setEditingId(chat.id);
    setDraft(chat.title);
  };

  const finishEdit = (save: boolean) => {
    if (save && editingId && draft.trim()) onRename(editingId, draft);
    setEditingId(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') finishEdit(true);
    if (event.key === 'Escape') finishEdit(false);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border">
      <div className="p-2">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
        >
          <SquarePen size={15} />
          {t('chat.newChat')}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {chats.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted">
            {t('chat.noChats')}
          </p>
        )}
        {chats.map((chat) =>
          editingId === chat.id ? (
            <input
              key={chat.id}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => finishEdit(true)}
              aria-label={t('chat.rename')}
              className="my-0.5 w-full rounded border border-accent bg-surface px-2 py-1.5 outline-none"
            />
          ) : (
            <NavLink
              key={chat.id}
              to={`/chat/${chat.id}`}
              title={new Date(chat.updatedAt).toLocaleString('de-DE')}
              className={({ isActive }) =>
                `group my-0.5 flex items-center gap-1 rounded px-2 py-1.5 ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'hover:bg-surface-hover'
                }`
              }
            >
              <span className="min-w-0 flex-1 truncate">{chat.title}</span>
              <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                <IconButton
                  label={t('chat.rename')}
                  onClick={() => startEdit(chat)}
                >
                  <Pencil size={13} />
                </IconButton>
                <IconButton
                  label={t('chat.delete')}
                  onClick={() => onDelete(chat)}
                >
                  <Trash2 size={13} />
                </IconButton>
              </span>
            </NavLink>
          ),
        )}
      </nav>
    </aside>
  );
}

function IconButton({
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
