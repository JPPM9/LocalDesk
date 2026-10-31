import type { SkillFile, SkillView } from './skills';

/**
 * Skills hinzufügen (.md, .zip, .skill): Die Oberfläche schickt die Bytes der
 * abgelegten Dateien, der Hauptprozess liest und prüft sie und zeigt eine Vorschau.
 * Gespeichert wird erst nach „Hinzufügen“ – und nur, was in der Vorschau stand.
 */

/** Grenzen für eine Ablage (Dateien, die du ablegst, und was in einer ZIP stecken darf). */
export const SKILL_IMPORT_LIMITS = {
  files: 10,
  fileBytes: 5_000_000,
  totalBytes: 20_000_000,
  zipEntries: 200,
  zipUnpackedBytes: 5_000_000,
  skills: 20,
  skillBytes: 2_000_000,
} as const;

/** Wie lange eine Vorschau gilt und wie viele gleichzeitig (Hauptprozess). */
export const SKILL_IMPORT_TTL_MS = 15 * 60_000;
export const SKILL_IMPORT_SESSIONS_MAX = 5;
/** So viel der Anleitung zeigt die Vorschau zum Lesen. */
export const SKILL_PREVIEW_CHARS = 4_000;

/** Eine abgelegte Datei, wie die Oberfläche sie schickt. */
export interface SkillImportFile {
  name: string;
  data: Uint8Array;
}

/** Ergebnis der Sicherheitsprüfung: eine Heuristik, kein Beweis. */
export interface SkillFinding {
  /** warn: genau lesen und bestätigen · info: nur zur Kenntnis. */
  severity: 'warn' | 'info';
  message: string;
}

/** Eine Datei, die nicht übernommen wird – mit Grund. */
export interface SkippedFile {
  path: string;
  reason: string;
}

/** Ein Skill in der Vorschau (der Inhalt bleibt im Hauptprozess). */
export interface SkillCandidateView {
  /** Nummer in der Vorschau – damit sagt „Hinzufügen“, welche gemeint sind. */
  index: number;
  /** Woher: Dateiname oder Ordner in der ZIP. */
  source: string;
  name: string;
  description: string;
  bodyPreview: string;
  bodyLength: number;
  tokens: number;
  /** Zusatzdateien, die gespeichert würden. */
  files: SkillFile[];
  skipped: SkippedFile[];
  findings: SkillFinding[];
  /** Ein Skill mit diesem Namen gibt es schon (der neue bekommt eine Nummer). */
  duplicate: boolean;
  /** Gesetzt = lässt sich nicht hinzufügen. */
  error?: string;
}

export interface SkillImportPreview {
  importId: string;
  candidates: SkillCandidateView[];
  /** Allgemeine Hinweise (z. B. nicht unterstützte Dateien). */
  notices: string[];
}

export interface SkillImportResult {
  installed: SkillView[];
  failed: string[];
}
