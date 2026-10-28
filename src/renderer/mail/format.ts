/** „Bank AG <info@bank.example>“ → „Bank AG“; ohne Namen die Adresse. */
export function senderName(from: string): string {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  if (!match) return from.trim();
  return match[1].trim() || match[2].trim();
}

/** Heute: Uhrzeit · dieses Jahr: „12. Okt.“ · sonst: „12.10.2025“. */
export function mailDate(time: number, now = new Date()): string {
  const date = new Date(time);
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Dateigröße für Anhänge. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}
