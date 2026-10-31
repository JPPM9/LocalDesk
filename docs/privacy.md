---
title: Datenschutz
---

# Datenschutzerklärung von LocalDesk

Stand: 31. Oktober 2026

LocalDesk ist eine Desktop-App für Windows, mit der du KI-Modelle **auf deinem eigenen
Rechner** (über [Ollama](https://ollama.com)) nutzt. Es gibt keinen LocalDesk-Server und kein
Konto bei uns. Verantwortlich für LocalDesk ist JPPM9 (Kontakt: über die Issues auf
[github.com/JPPM9/LocalDesk](https://github.com/JPPM9/LocalDesk/issues)).

## Kurz gesagt

- LocalDesk sammelt **keine** Nutzungsdaten, hat **keine** Telemetrie, keine Werbung und
  schickt **keine** Absturzberichte.
- Deine Chats, Dokumente und Mails gehen **nur an den Ollama-Server, den du einstellst** –
  standardmäßig dein eigener PC. LocalDesk schickt nichts an fremde KI-Dienste.
- Alles, was LocalDesk speichert, liegt **auf deinem PC**.

## Was LocalDesk wo speichert

Alles liegt im Datenordner `%APPDATA%\LocalDesk` (in der App: Einstellungen → Über LocalDesk):

- **`localdesk.db`** – Chats, Einstellungen, Vorlagen, Projekte, Code-Sitzungen, die
  eingelesenen Abschnitte deiner Wissens-Sammlungen (Text und „Fingerabdrücke“ zum Suchen),
  MCP-Server-Einstellungen und – wenn du E-Mail einrichtest – deine E-Mail-Adresse, die Client-ID
  deiner eigenen Google-App und die **mit Windows verschlüsselte** Anmeldung bei Google.
- **`skills\`** – deine Skills als Textdateien.
- **`code-backups\`** – Sicherungen von Dateien, die der Code-Agent geändert hat (für
  „Rückgängig“).

Außerhalb dieses Ordners schreibt LocalDesk nur, wenn du es einrichtest:

- **Obsidian:** Erinnerungen, gespeicherte Chats und Zusammenfassungen – nur in den eigenen
  Unterordner deines Vaults.
- **Code-Bereich:** Dateien in dem Projektordner, den du wählst – jede Änderung erst nach deiner
  Bestätigung.

Deine **Mails speichert LocalDesk nicht**. Sie werden bei Bedarf frisch von Gmail geholt und nur
angezeigt oder an dein lokales Modell gegeben.

**Löschen:** Beim Deinstallieren bleibt der Datenordner erhalten (damit ein Update nichts
verliert). Wenn du alles entfernen willst, lösche `%APPDATA%\LocalDesk` von Hand.

## Wohin LocalDesk Verbindungen aufbaut

| Ziel                                                                            | Wann                                          | Was                                                                        |
| ------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| Dein Ollama-Server (Standard: dieser PC)                                        | bei jedem Chat, beim Einlesen von Wissen      | deine Nachrichten, Dokument-Abschnitte, Mails, die du zusammenfassen lässt |
| Ollama-Modellbibliothek                                                         | nur wenn du ein Modell herunterlädst          | Ollama selbst lädt das Modell                                              |
| Google (`accounts.google.com`, `oauth2.googleapis.com`, `gmail.googleapis.com`) | nur mit eingerichteter E-Mail                 | Anmeldung, Mails lesen, Labels/Sterne nach deiner Bestätigung              |
| GitHub (Releases von JPPM9/LocalDesk)                                           | nur wenn du „Nach Updates suchen“ klickst     | Versionsabfrage, Download des Updates                                      |
| GitHub (`raw.githubusercontent.com`)                                            | nur wenn du „Skill von GitHub laden“ klickst  | der Pfad des Links; geladen wird nur eine Textdatei (SKILL.md)             |
| npm-Paketverzeichnis                                                            | beim ersten Start des Dateisystem-MCP-Servers | `npx` lädt das Server-Programm herunter                                    |

Außerdem gilt: **Befehle, die du dem Code-Agenten freigibst**, laufen mit deinen Rechten und
dürfen alles, was du am PC darfst – auch Verbindungen ins Internet. Das gilt ebenso für
**MCP-Server**, die du hinzufügst: Sie sind eigene Programme.

Die Oberfläche von LocalDesk selbst darf keine Verbindungen nach außen aufbauen und keine
Bilder aus dem Internet laden; Kamera, Mikrofon, Standort und Benachrichtigungen sind gesperrt.

## Google-Daten (Gmail)

Wenn du E-Mail einrichtest, meldest du dich über **deine eigene Google-App** an. LocalDesk
nutzt den Zugriff nur, um Mails anzuzeigen, zu suchen, mit deinem lokalen Modell
zusammenzufassen und – erst nach deiner Bestätigung – eigene Labels oder Sterne zu setzen.
LocalDesk sendet, löscht und archiviert keine Mails und markiert nichts als gelesen.

Die Verwendung und Weitergabe von Informationen, die LocalDesk über Google-APIs erhält, hält
sich an die [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
einschließlich der Anforderungen zur eingeschränkten Nutzung („Limited Use“). Gmail-Daten werden
nicht an Dritte weitergegeben, nicht für Werbung genutzt und nicht zum Trainieren von
KI-Modellen verwendet.

**Abmelden** (Einstellungen → E-Mail) widerruft den Zugriff bei Google und löscht die Anmeldung
auf deinem PC. Du kannst den Zugriff auch unter
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) entziehen.

## English summary

LocalDesk is a Windows desktop app for running AI models locally via Ollama. It has no server,
no accounts, no telemetry and no analytics. All data is stored on the user's computer in
`%APPDATA%\LocalDesk`. Chats, documents and emails are only sent to the Ollama server the user
configures (by default the same computer). Gmail access uses the user's own Google OAuth client;
emails are not stored, only displayed, searched, summarized by the local model and – after the
user's explicit confirmation – labeled or starred. LocalDesk never sends, deletes or archives
emails. LocalDesk's use and transfer of information received from Google APIs adheres to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the Limited Use requirements. Gmail data is not shared with third parties, not used
for advertising and not used to train AI models. Contact: issues on
[github.com/JPPM9/LocalDesk](https://github.com/JPPM9/LocalDesk/issues).
