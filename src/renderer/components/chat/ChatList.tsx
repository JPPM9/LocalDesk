import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, Search, SquarePen, X } from 'lucide-react';
import type { ChatFolder, ChatSummary, Result } from '../../../shared/api';
import { groupChatsByFolder } from '../../chat/folders';
import { useChatSearch } from '../../chat/useChatSearch';
import { useCollapsedFolders } from '../../chat/useCollapsedFolders';
import { shortcutLabel } from '../../shortcuts/keymap';
import { useShortcut } from '../../shortcuts/useShortcut';
import { ChatRow } from './ChatRow';
import { FolderSection } from './FolderSection';
import { SearchResults } from './SearchResults';

/** Schlüssel für den Bereich „ohne Ordner“ beim Ein-/Ausklappen. */
const UNFILED_KEY = '__unfiled__';

interface ChatListProps {
  chats: ChatSummary[];
  folders: ChatFolder[];
  onNew: () => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chat: ChatSummary) => void;
  onMove: (chatId: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => Promise<Result<ChatFolder>>;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folder: ChatFolder) => void;
}

export function ChatList(props: ChatListProps) {
  const { chats, folders, onNew } = props;
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const searchResult = useChatSearch(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const { isCollapsed, toggle } = useCollapsedFolders();
  // Eingabe für einen neuen Ordner; null = geschlossen.
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Strg+K: ins Suchfeld springen; vorhandener Suchtext wird markiert.
  useShortcut('search', () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  });

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query) {
      event.preventDefault(); // erst die Suche leeren; ein zweites Esc darf stoppen
      setQuery('');
    }
  };

  const createFolder = async () => {
    if (newFolder === null) return;
    if (!newFolder.trim()) {
      setNewFolder(null);
      return;
    }
    const result = await props.onCreateFolder(newFolder);
    if (result.ok) {
      setNewFolder(null);
      setFolderError(null);
    } else {
      setFolderError(result.error);
    }
  };

  const onNewFolderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') void createFolder();
    if (event.key === 'Escape') {
      event.preventDefault();
      setNewFolder(null);
      setFolderError(null);
    }
  };

  const { groups, unfiled } = groupChatsByFolder(chats, folders);
  const row = (chat: ChatSummary) => (
    <ChatRow
      key={chat.id}
      chat={chat}
      folders={folders}
      onRename={props.onRename}
      onDelete={props.onDelete}
      onMove={props.onMove}
    />
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border">
      <div className="space-y-2 p-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onNew}
            title={shortcutLabel('newChat')}
            className="flex min-w-0 flex-1 items-center gap-2 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
          >
            <SquarePen size={15} />
            {t('chat.newChat')}
          </button>
          <button
            type="button"
            onClick={() => setNewFolder('')}
            title={t('folders.new')}
            aria-label={t('folders.new')}
            className="rounded border border-border px-2 hover:bg-surface-hover"
          >
            <FolderPlus size={15} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2 focus-within:border-accent">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={t('search.placeholder')}
            title={shortcutLabel('search')}
            aria-label={t('search.placeholder')}
            className="min-w-0 flex-1 bg-transparent py-1.5 outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title={t('search.clear')}
              aria-label={t('search.clear')}
              className="rounded p-0.5 text-muted hover:text-text"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {newFolder !== null && (
          <div>
            <input
              autoFocus
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={onNewFolderKeyDown}
              onBlur={() => void createFolder()}
              placeholder={t('folders.namePlaceholder')}
              aria-label={t('folders.new')}
              className="w-full rounded border border-accent bg-surface px-2 py-1.5 outline-none"
            />
            {folderError && (
              <p className="mt-1 text-xs text-error">{folderError}</p>
            )}
          </div>
        )}
      </div>

      {searchResult ? (
        <SearchResults result={searchResult} />
      ) : (
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {chats.length === 0 && folders.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted">
              {t('chat.noChats')}
            </p>
          )}

          {folders.length === 0 ? (
            // Ohne Ordner: schlichte Liste wie bisher.
            unfiled.map(row)
          ) : (
            <>
              {groups.map(({ folder, chats: folderChats }) => (
                <FolderSection
                  key={folder.id}
                  folder={folder}
                  count={folderChats.length}
                  collapsed={isCollapsed(folder.id)}
                  onToggle={() => toggle(folder.id)}
                  onDropChat={(chatId) => props.onMove(chatId, folder.id)}
                  onRename={(name) => props.onRenameFolder(folder.id, name)}
                  onDelete={() => props.onDeleteFolder(folder)}
                >
                  {folderChats.map(row)}
                </FolderSection>
              ))}
              <FolderSection
                folder={null}
                count={unfiled.length}
                collapsed={isCollapsed(UNFILED_KEY)}
                onToggle={() => toggle(UNFILED_KEY)}
                onDropChat={(chatId) => props.onMove(chatId, null)}
              >
                {unfiled.map(row)}
              </FolderSection>
            </>
          )}
        </nav>
      )}
    </aside>
  );
}
