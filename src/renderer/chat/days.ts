import type { ChatSummary } from '../../shared/api';

export type DayGroupKey = 'today' | 'yesterday' | 'week' | 'month' | 'older';

export interface DayGroup {
  key: DayGroupKey;
  chats: ChatSummary[];
}

const ORDER: DayGroupKey[] = ['today', 'yesterday', 'week', 'month', 'older'];

/**
 * Teilt Chats nach dem Tag der letzten Nachricht ein (Kalendertage in Ortszeit):
 * Heute, Gestern, Letzte 7 Tage, Letzte 30 Tage, Älter. Leere Gruppen fallen weg,
 * die Reihenfolge innerhalb einer Gruppe bleibt (neueste zuerst).
 */
export function groupChatsByDay(chats: ChatSummary[], now: Date): DayGroup[] {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const DAY = 24 * 60 * 60 * 1000;
  const keyOf = (time: number): DayGroupKey => {
    if (time >= startOfToday) return 'today';
    if (time >= startOfToday - DAY) return 'yesterday';
    if (time >= startOfToday - 7 * DAY) return 'week';
    if (time >= startOfToday - 30 * DAY) return 'month';
    return 'older';
  };
  const groups = new Map<DayGroupKey, ChatSummary[]>();
  for (const chat of chats) {
    const key = keyOf(chat.updatedAt);
    groups.set(key, [...(groups.get(key) ?? []), chat]);
  }
  return ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    chats: groups.get(key)!,
  }));
}
