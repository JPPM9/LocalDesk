import { useCallback, useEffect, useState } from 'react';
import type { ChatSummary } from '../../shared/api';

/** Die Liste aller gespeicherten Chats, neueste zuerst. */
export function useChatList() {
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const refresh = useCallback(async () => {
    setChats(await window.api.listChats());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rename = useCallback(
    async (chatId: string, title: string) => {
      await window.api.renameChat(chatId, title);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (chatId: string) => {
      await window.api.deleteChat(chatId);
      await refresh();
    },
    [refresh],
  );

  return { chats, refresh, rename, remove };
}
