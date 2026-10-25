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
