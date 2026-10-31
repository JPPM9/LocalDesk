/**
 * Meldungen aus dem Hauptprozess und dem geteilten Code (Fehler, Vorschauen,
 * Ergebnisse). Deutsch ist die Vorlage: `en.ts` muss genau dieselben Schlüssel
 * haben (TypeScript meldet sonst einen Fehler). Platzhalter stehen in {geschweiften Klammern}.
 */
export const de = {
  'error.invalidInput': 'Ungültige Eingabe',
  'error.invalidId': 'Ungültige ID',
  'error.invalidIdentifier': 'Ungültige Kennung.',
  'error.invalidSkillId': 'Ungültige Skill-Kennung',
  'error.invalidTemplate': 'Ungültige Vorlage',
  'error.invalidCollection': 'Ungültige Sammlung',
  'error.invalidChatRequest': 'Ungültige Chat-Anfrage',
  'error.invalidModelName': 'Ungültiger Modellname',
  'error.invalidPath': 'Ungültiger Pfad.',
  'error.invalidMemory': 'Ungültige Erinnerung.',
  'error.invalidReply': 'Ungültige Eingabe in der Rückfrage.',
  'error.projectNotFound': 'Projekt nicht gefunden',
  'error.collectionNotFound': 'Sammlung nicht gefunden',
  'error.fileNotFound': 'Datei nicht gefunden',
  'error.chatNotFound': 'Chat nicht gefunden',
  'error.serverNotFound': 'Server nicht gefunden',
  'error.skillNotFound': 'Skill nicht gefunden',
  'error.skillGone': 'Diesen Skill gibt es nicht (mehr).',
  'error.accountMissing': 'Dieses Konto gibt es nicht.',
  'error.codeSessionMissing': 'Diese Code-Sitzung gibt es nicht.',
  'error.toolMissing': 'Das Werkzeug „{tool}“ gibt es nicht.',
  'error.toolUnavailable':
    'Das Tool „{tool}“ gibt es nicht oder es ist ausgeschaltet.',
  'chat.emptyAnswer':
    'Das Modell hat keine Antwort geschrieben – vermutlich wollte es ein Werkzeug falsch aufrufen. Bitte noch einmal fragen oder ein anderes Modell wählen.',
} as const;

export type MessageKey = keyof typeof de;
