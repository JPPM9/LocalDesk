import type { ChatFolder, ChatSummary } from '../../shared/api';

export interface FolderGroup {
  folder: ChatFolder;
  chats: ChatSummary[];
}

/**
 * Ordnet die Chats ihren Ordnern zu. Reihenfolge der Ordner und der Chats darin
 * bleibt, wie sie geliefert wurde (Ordner alphabetisch, Chats neueste zuerst).
 * Ein Chat mit unbekanntem Ordner landet sicherheitshalber bei „ohne Ordner“.
 */
export function groupChatsByFolder(
  chats: ChatSummary[],
  folders: ChatFolder[],
): { groups: FolderGroup[]; unfiled: ChatSummary[] } {
  const groups = folders.map((folder) => ({
    folder,
    chats: [] as ChatSummary[],
  }));
  const byId = new Map(groups.map((group) => [group.folder.id, group]));
  const unfiled: ChatSummary[] = [];
  for (const chat of chats) {
    const group = chat.folderId ? byId.get(chat.folderId) : undefined;
    if (group) group.chats.push(chat);
    else unfiled.push(chat);
  }
  return { groups, unfiled };
}
