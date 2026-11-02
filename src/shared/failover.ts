/**
 * Failover: Ist der aktive Ollama-Server nicht erreichbar, bietet der Chat einen anderen
 * eingetragenen Server an – nie von selbst (deine Chats gehen sonst ohne dein Wissen an
 * einen anderen Rechner), sondern nach deinem Klick.
 */

/** Ergebnis der Abfrage eines eingetragenen Servers. */
export interface ServerProbe {
  profileId: string;
  name: string;
  baseUrl: string;
  /** Dieser PC? Sonst gehen Chats, Dokumente und Mails an einen anderen Rechner. */
  local: boolean;
  online: boolean;
  version?: string;
  error?: string;
  /** Namen der installierten Modelle (leer, wenn der Server nicht erreichbar ist). */
  models: string[];
}

/** So viele Statusprüfungen hintereinander (alle 5 s) müssen scheitern, bevor der Hinweis kommt. */
export const OFFLINE_POLLS_NEEDED = 2;

/** Ein erreichbarer anderer Server mit dem, was dort fehlt. */
export interface FailoverOption {
  probe: ServerProbe;
  /** Hat der Server das Modell des Chats? null = kein Modell gewählt. */
  hasModel: boolean | null;
  /** Gibt es dort ein Embedding-Modell? Ohne geht „Wissen“ nicht. */
  hasEmbedding: boolean;
}

/** Soll der Hinweis „Server nicht erreichbar“ erscheinen? */
export function shouldOfferFailover(
  offlinePolls: number,
  otherProfiles: number,
): boolean {
  return offlinePolls >= OFFLINE_POLLS_NEEDED && otherProfiles > 0;
}

/**
 * Die erreichbaren Server zur Auswahl: zuerst die, die das Modell des Chats haben,
 * dann nach Namen.
 */
export function failoverOptions(
  probes: ServerProbe[],
  chatModel: string | undefined,
): FailoverOption[] {
  return probes
    .filter((p) => p.online)
    .map((probe) => ({
      probe,
      hasModel: chatModel ? probe.models.includes(chatModel) : null,
      hasEmbedding: probe.models.some((m) => m.startsWith('qwen3-embedding')),
    }))
    .sort(
      (a, b) =>
        Number(b.hasModel === true) - Number(a.hasModel === true) ||
        a.probe.name.localeCompare(b.probe.name),
    );
}

/**
 * Das Modell des Chats nach einem Serverwechsel: das bisherige, wenn der neue Server es hat,
 * sonst das zuletzt gewählte, sonst das erste dort installierte. Ohne Modelle bleibt es.
 */
export function modelAfterSwitch(
  available: string[],
  current: string,
  last: string | null,
): string {
  if (available.includes(current)) return current;
  if (last && available.includes(last)) return last;
  return available[0] ?? current;
}

/** Der Server, von dem du gewechselt bist – wenn er wieder erreichbar ist. */
export function returnOption(
  probes: ServerProbe[],
  fromId: string | null,
): ServerProbe | null {
  if (!fromId) return null;
  return probes.find((p) => p.profileId === fromId && p.online) ?? null;
}
