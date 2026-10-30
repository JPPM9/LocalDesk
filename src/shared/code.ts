/** Ein Eintrag im Dateibaum einer Code-Sitzung. */
export interface CodeEntry {
  /** Pfad relativ zum Projektordner, mit „/“. */
  path: string;
  name: string;
  kind: 'dir' | 'file';
  /** Nur Dateien: Größe in Bytes. */
  size?: number;
}

/** Eine Datei zum Ansehen. Ohne `text`: zu groß oder keine Textdatei. */
export interface CodeFile {
  path: string;
  size: number;
  text?: string;
  tooLarge?: boolean;
  binary?: boolean;
}

/** Server-Kennung der eingebauten Code-Werkzeuge. */
export const CODE_TOOL_SERVER = 'localdesk:code';

/** Werkzeuge, die Dateien ändern – mit Vorher/Nachher-Karte und „Rückgängig“. */
export const CODE_CHANGE_TOOLS: readonly string[] = [
  'edit_file',
  'write_file',
  'delete_file',
];

/** Stand einer übernommenen Änderung (für den Knopf „Rückgängig“). */
export type CodeChangeState = 'applied' | 'undone' | 'missing';
