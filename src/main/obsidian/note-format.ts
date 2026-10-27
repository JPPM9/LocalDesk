/** Datum im Kalender des Nutzers (nicht UTC) – passt zum Dateinamen, den er erwartet. */
export function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Text sicher als YAML-Wert im Frontmatter (in Anführungszeichen). */
export function yamlString(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
