// ArtCraft-Apps, die LocalDesk über deren MCP-Server bedienen darf (geschlossene Liste).
// Jede App bringt `<name>-cli.exe` mit; `mcp` startet den MCP-Server. Geprüft ist die Liste
// mit den installierten Apps (PdfCraft 0.21, PhotoCraft 0.23, Craft Anything 0.6): PdfCraft und PhotoCraft kennen
// `--automation-read-root` und `--automation-write-root` – ohne Angabe ist der Zugriff gesperrt.

export const ARTCRAFT_APPS = {
  // PdfCraft bietet über 200 Werkzeuge an; `--compact` zeigt dem Modell nur einen Kern plus Suche –
  // sonst füllt allein die Werkzeug-Liste den Kontext eines lokalen Modells.
  pdfcraft: {
    name: 'PdfCraft',
    dir: 'PdfCraft',
    exe: 'pdfcraft-cli.exe',
    compact: true,
    roots: true,
  },
  photocraft: {
    name: 'PhotoCraft',
    dir: 'PhotoCraft',
    exe: 'photocraft-cli.exe',
    compact: false,
    roots: true,
  },
  // Untersucht Dateien, Programme und Webseiten (Reverse Engineering). Hat keine Ordner-Beschränkung:
  // LocalDesk startet sie nur mit `--restricted` (nichts ausführen, kein Web, keine Aufnahmen) und
  // fragt bei JEDEM Werkzeug nach – auch bei „nur lesenden“.
  craftanything: {
    name: 'Craft Anything',
    dir: 'Craft Anything',
    exe: 'craft-anything-cli.exe',
    compact: false,
    roots: false,
  },
} as const;

export type ArtcraftApp = keyof typeof ARTCRAFT_APPS;

export function isArtcraftApp(value: unknown): value is ArtcraftApp {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ARTCRAFT_APPS, value)
  );
}
