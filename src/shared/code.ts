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
