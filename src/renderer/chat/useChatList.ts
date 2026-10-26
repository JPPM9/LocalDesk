import { useCallback, useEffect, useState } from 'react';
import type { ChatFolder, ChatSummary, Result } from '../../shared/api';

/** Alle gespeicherten Chats (neueste zuerst) und alle Ordner (alphabetisch). */
export function useChatList() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);

  const refresh = useCallback(async () => {
    const [nextChats, nextFolders] = await Promise.all([
      window.api.listChats(),
      window.api.listFolders(),
    ]);
    setChats(nextChats);
    setFolders(nextFolders);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Jede Änderung lädt danach die Liste neu – so zeigt sie immer den Datenbank-Stand.
  const andRefresh = useCallback(
    <A extends unknown[], R>(action: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const result = await action(...args);
        await refresh();
        return result;
      },
    [refresh],
  );

  return {
    chats,
    folders,
    refresh,
    rename: andRefresh(window.api.renameChat),
    remove: andRefresh(window.api.deleteChat),
    moveChat: andRefresh(window.api.moveChat),
    createFolder: andRefresh(
      window.api.createFolder as (name: string) => Promise<Result<ChatFolder>>,
    ),
    renameFolder: andRefresh(window.api.renameFolder),
    deleteFolder: andRefresh(window.api.deleteFolder),
  };
}
