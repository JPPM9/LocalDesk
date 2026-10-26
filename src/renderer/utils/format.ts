// Kleine Helfer, um Zahlen und Daten lesbar anzuzeigen.

/** Dateigröße wie bei `ollama list`: 1 GB = 1.000.000.000 Bytes. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '–';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = unit >= 3 ? 1 : 0;
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${units[unit]}`;
}

/**
 * Arbeitsspeicher/VRAM wie im Windows-Task-Manager: 1 GB = 1024³ Bytes.
 * So steht bei einer 16-GB-Grafikkarte auch „16,0 GB“ (dezimal wären es 17,2).
 */
export function formatMemory(bytes: number | undefined): string {
  if (bytes === undefined || bytes < 0) return '–';
  const gib = bytes / 1024 ** 3;
  if (gib >= 1) {
    return `${gib.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`;
  }
  return `${Math.round(bytes / 1024 ** 2).toLocaleString('de-DE')} MB`;
}

/** Kontextlänge in Tokens, z. B. 131072 → "128K" (Modelle zählen in 1024er-Schritten). */
export function formatContext(tokens: number | undefined): string {
  if (!tokens) return '–';
  if (tokens < 1024) return String(tokens);
  return `${Math.round(tokens / 1024)}K`;
}

/** ISO-Datum als deutsches Datum, z. B. "01.10.2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
