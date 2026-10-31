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
  'code.invalidFolder': 'Kein gültiger Ordner.',
  'code.folderMissing': 'Den Ordner gibt es nicht (mehr): {folder}',
  'code.notAFolder': 'Das ist kein Ordner: {folder}',
  'code.pathOutside': 'Nur Pfade im Projektordner sind erlaubt: {path}',
  'code.pathEscapes': 'Der Pfad führt aus dem Projektordner hinaus: {path}',
  'code.notFound': 'Gibt es nicht: {path}',
  'code.gitBlocked': 'Der Ordner .git ist gesperrt: {path}',
  'code.notAFile': 'Keine Datei: {path}',
  'code.rootDrive':
    'Ein ganzes Laufwerk geht nicht – bitte einen Projektordner wählen.',
  'code.rootSystem':
    'Systemordner gehen nicht – bitte einen Projektordner wählen.',
  'code.rootHome':
    'Der ganze Benutzerordner geht nicht – bitte einen Projektordner wählen.',
  'code.pathMissing': 'Pfad fehlt.',
  'code.oldTextMissing': 'old_text fehlt.',
  'code.textsEqual': 'old_text und new_text sind gleich.',
  'code.oldTextNotFound':
    'old_text kommt in {path} nicht vor – erst mit read_file den genauen Text nachsehen.',
  'code.oldTextAmbiguous':
    'old_text kommt in {path} {count}-mal vor – mehr Zeilen drumherum mitnehmen, damit er eindeutig ist.',
  'code.contentMissing': 'content fehlt.',
  'code.contentTooLarge': 'Inhalt ist größer als 1 MB.',
  'code.sameContent': '{path} hat schon genau diesen Inhalt.',
  'code.moreLines': '[… {count} weitere Zeilen]',
  'code.deleted': 'Gelöscht: {path}',
  'code.created': 'Angelegt: {path}',
  'code.changed': 'Geändert: {path}',
  'code.fileTooLarge': '{path} ist größer als 1 MB.',
  'code.notText': '{path} ist keine Textdatei.',
  'code.queryMissing': 'Suchtext fehlt.',
  'code.skippedDir': '{name}/ (ausgelassen)',
  'code.emptyDir': '{title}: leer',
  'code.listTruncated':
    '[… mehr als {max} Einträge – Unterordner einzeln ansehen]',
  'code.readMore':
    '[… Datei hat {total} Zeilen – weiter mit start_line={next}]',
  'code.readHeader': '{path} (Zeilen {from}–{to} von {total}):',
  'code.noHit': 'Kein Treffer für „{query}“.',
  'code.hits': '{count} Treffer für „{query}“:',
  'code.noBackup': 'Zu dieser Änderung gibt es keine Sicherung.',
  'code.alreadyUndone': 'Schon rückgängig gemacht.',
  'code.changedSince': '{path} wurde seither noch einmal geändert.',
  'code.pickFolderTitle': 'Projektordner wählen',
  'code.sessionNotCreated': 'Sitzung nicht angelegt.',
  'code.undoneNote':
    'Vom Nutzer rückgängig gemacht – die Datei ist wieder wie vor dieser Änderung.',
  'code.gitMissing': 'Git wurde nicht gefunden – ist Git installiert?',
  'code.notGitRepo': 'Der Projektordner ist kein Git-Projekt.',
  'code.gitSays': 'Git meldet: {text}',
  'code.commitMessageMissing': 'Commit-Nachricht fehlt.',
  'code.commitMessageTooLong': 'Die Commit-Nachricht ist zu lang.',
  'code.nothingToCommit':
    'Nichts zu committen – keine Änderungen im Projektordner.',
  'code.commitPreview':
    'Nachricht:\n{message}\n\nDateien:\n{files}\n\nGit-Hooks des Projekts laufen dabei nicht.',
  'code.noChanges': '(keine Änderungen)',
  'code.noKnownChanges': '(keine Änderungen an bekannten Dateien)',
  'code.newFiles': 'Neue Dateien (noch nicht in Git):\n{files}',
  'code.diffTruncated': '[… gekürzt – einzelne Dateien mit path ansehen]',
  'code.committed': 'Committet: {commit}',
  'code.commandPreview':
    '{command}\n\nOrdner: Projektordner · Zeitlimit: {seconds} s',
  'code.commandMissing': 'Befehl fehlt.',
  'code.commandTooLong': 'Der Befehl ist zu lang.',
  'code.commandTimeout': 'Abgebrochen nach {seconds} s (Zeitlimit).',
  'code.commandStopped': 'Vom Nutzer gestoppt.',
  'code.exitCode': 'Exit-Code: {code} ({seconds} s)',
  'code.noOutput': '(keine Ausgabe)',
  'code.outputSkipped': '[… {count} Zeichen ausgelassen …]',
  'error.cancelled': 'Abgebrochen',
  'mail.reauth':
    'Die Anmeldung bei Google gilt nicht mehr – bitte neu anmelden.',
  'mail.serverName': 'E-Mail',
  'mail.pageDone':
    'Die Anmeldung ist schon abgeschlossen. Du kannst dieses Fenster schließen.',
  'mail.pageForeign': 'Diese Anfrage gehört nicht zu deiner Anmeldung.',
  'mail.pageSuccess':
    'Angemeldet. Du kannst dieses Fenster schließen und zu LocalDesk zurückkehren.',
  'mail.pageCancelled':
    'Anmeldung abgebrochen. Du kannst dieses Fenster schließen.',
  'mail.signInCancelled': 'Anmeldung abgebrochen.',
  'mail.signInTimeout':
    'Keine Anmeldung innerhalb von 5 Minuten – bitte noch einmal.',
  'mail.noRefreshToken':
    'Google hat keine dauerhafte Anmeldung geliefert – bitte noch einmal.',
  'mail.scopeDenied':
    'Der Zugriff auf Gmail wurde nicht erlaubt. Setze bei der Anmeldung den Haken bei Gmail.',
  'mail.revokeRefused': 'Google hat das Abmelden abgelehnt ({status}).',
  'mail.apiDisabled':
    'Die Gmail-API ist im Google-Projekt nicht aktiviert. Google Cloud Console → APIs & Dienste → Bibliothek → „Gmail API“ → Aktivieren, ein paar Minuten warten und dann neu anmelden.',
  'mail.gmailRejectedLogin':
    'Gmail hat die Anmeldung nicht angenommen – bitte neu anmelden.',
  'mail.gmailTooMany': 'Gmail meldet zu viele Anfragen – bitte kurz warten.',
  'mail.gmailRefuses': 'Gmail lehnt die Anfrage ab ({status}){detail}',
  'mail.authDenied': 'Du hast die Anmeldung bei Google abgelehnt.',
  'mail.authAborted': 'Google hat die Anmeldung abgebrochen ({error}).',
  'mail.unknown': 'unbekannt',
  'mail.unknownApp':
    'Google kennt diese App nicht – stimmen Client-ID und Clientschlüssel?',
  'mail.tokenRejected': 'Google hat die Anmeldung abgelehnt ({error}).',
  'mail.appLocked':
    'Erst alle Konten abmelden – die Anmeldungen gehören zu dieser Google-App.',
  'mail.appMissing': 'Erst die Google-App eintragen.',
  'mail.cannotEncrypt':
    'Windows kann die Anmeldung gerade nicht verschlüsseln – deshalb melde ich nicht an.',
  'mail.unexpectedAuthUrl': 'Unerwartete Anmeldeadresse.',
  'mail.notSignedIn': 'Dieses Konto ist nicht (mehr) angemeldet.',
  'mail.unknownMail': 'Unbekannte Mail.',
  'mail.noSummary': 'Das Modell hat keine Zusammenfassung geliefert.',
  'mail.labelGone': 'Dieses Label gibt es nicht (mehr).',
  'mail.unknownId': 'Unbekannte Kennung.',
  'mail.cannotStore':
    'Windows kann die Anmeldung gerade nicht verschlüsseln – deshalb wird sie nicht gespeichert.',
  'mail.accountGone': 'Dieses Konto ist nicht (mehr) eingerichtet.',
  'mail.badAddress': 'Ungültige Adresse: {url}',
  'mail.addressBlocked': 'Adresse nicht erlaubt (Netzwerk-Regel): {host}',
  'mail.unknownChange': 'Diese Änderung gibt es in LocalDesk nicht.',
  'mail.badClientId':
    'Die Client-ID sieht nicht richtig aus – sie endet auf „.apps.googleusercontent.com“.',
  'mail.badClientSecret':
    'Der Clientschlüssel sieht nicht richtig aus – er beginnt meist mit „GOCSPX-“.',
  'mail.idMissing': 'Die Kennung der Mail fehlt.',
  'mail.labelMissing': 'Das Label „{label}“ gibt es nicht.',
  'mail.noChange': 'Keine Änderung angegeben (Label oder Stern).',
  'mail.hasLabel': 'Die Mail hat das Label „{label}“ schon.',
  'mail.hasStar': 'Die Mail hat schon einen Stern.',
  'mail.hasNoStar': 'Die Mail hat keinen Stern.',
  'mail.addLabel': 'Label „{label}“ hinzufügen',
  'mail.addStar': 'Stern setzen',
  'mail.removeStar': 'Stern entfernen',
  'mail.and': ' und ',
  'mail.reason': 'Grund: {reason}',
  'mail.noSubject': '(ohne Betreff)',
  'mail.changePreview': 'Mail: {from} – „{subject}“ ({date})',
  'mail.noMails': 'Keine Mails gefunden.',
  'mail.listQuery': '{count} Mails für „{query}“, neueste zuerst:',
  'mail.listInbox': '{count} Mails im Posteingang, neueste zuerst:',
  'mail.restTruncated': '[… Rest gekürzt]',
  'mail.to': 'An: {value}',
  'mail.cc': 'Cc: {value}',
  'mail.attachments': 'Anhänge (nicht geladen): {names}',
  'mail.done': 'Erledigt – die Änderung ist in Gmail übernommen.',
  'mail.unread': 'ungelesen',
  'mail.starred': 'Stern',
  'mail.summaryLine':
    '[id: {id}] {date} · Von: {from} · Betreff: {subject}{flags}',
  'mail.previewLine': 'Vorschau: {snippet}',
} as const;

export type MessageKey = keyof typeof de;
