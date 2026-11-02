// Merkt sich in der Oberfläche, von welchem Server du beim Failover gewechselt bist –
// damit „Zurückwechseln“ angeboten werden kann, wenn er wieder erreichbar ist.
const KEY = 'localdesk.failoverFrom';

export function readFailoverFrom(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeFailoverFrom(profileId: string): void {
  try {
    localStorage.setItem(KEY, profileId);
  } catch {
    // ohne Speicher gilt es nur bis zum Neustart nicht – dann kommt kein „Zurückwechseln“
  }
}

export function clearFailoverFrom(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nichts zu tun
  }
}
