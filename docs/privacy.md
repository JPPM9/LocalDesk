---
title: Privacy policy / Datenschutz
---

# LocalDesk privacy policy

Last updated: 31 October 2026 · Deutsche Fassung weiter unten

LocalDesk is a Windows desktop app that lets you use AI models **on your own computer** (via
[Ollama](https://ollama.com)). There is no LocalDesk server and no account with us. LocalDesk is
published by JPPM9 (contact: through the issues on
[github.com/JPPM9/LocalDesk](https://github.com/JPPM9/LocalDesk/issues)).

## In short

- LocalDesk collects **no** usage data, has **no** telemetry, no advertising and sends **no**
  crash reports.
- Your chats, documents and emails go **only to the Ollama server you configure** – by default
  your own computer. LocalDesk sends nothing to third-party AI services.
- Everything LocalDesk stores is **on your computer**.

## What LocalDesk stores, and where

Everything lives in the data folder `%APPDATA%\LocalDesk` (in the app: Settings → About
LocalDesk):

- **`localdesk.db`** – chats, settings, templates, projects, code sessions, the indexed passages
  of your knowledge collections (text and “fingerprints” used for searching), MCP server
  settings and – if you set up e-mail – your e-mail address, the client ID of your own Google
  app and your Google sign-in, **encrypted with Windows**.
- **`skills\`** – your skills as text files.
- **`code-backups\`** – backups of files the code agent changed (used for “Undo”).

Outside this folder LocalDesk only writes when you set it up to:

- **Obsidian:** memories, saved chats and summaries – only in LocalDesk's own subfolder of your
  vault.
- **Code area:** files in the project folder you choose – every change only after your
  confirmation.

LocalDesk **does not store your emails**. They are fetched fresh from Gmail when needed and only
displayed or passed to your local model.

**Deleting:** Uninstalling keeps the data folder (so an update loses nothing). If you want to
remove everything, delete `%APPDATA%\LocalDesk` by hand.

## Where LocalDesk connects to

| Destination                                                                     | When                                         | What                                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Your Ollama server (default: this computer)                                     | with every chat, when indexing knowledge     | your messages, document passages, emails you ask it to summarize                                         |
| Ollama model library                                                            | only when you download a model               | Ollama itself downloads the model                                                                        |
| Google (`accounts.google.com`, `oauth2.googleapis.com`, `gmail.googleapis.com`) | only with e-mail set up                      | sign-in, reading mail, labels/stars after your confirmation (also creating and renaming your own labels) |
| GitHub (releases of JPPM9/LocalDesk)                                            | only when you click “Check for updates”      | version query, download of the update                                                                    |
| GitHub (`raw.githubusercontent.com`)                                            | only when you click “Load skill from GitHub” | the path of the link; only one text file (SKILL.md) is loaded                                            |
| npm package registry                                                            | on first start of the file-system MCP server | `npx` downloads the server program                                                                       |

Also note: **commands you approve for the code agent** run with your permissions and may do
anything you may do on your PC – including connecting to the internet. The same applies to
**MCP servers** you add: they are programs of their own.

LocalDesk's own user interface is not allowed to open outside connections or load images from the
internet; camera, microphone, location and notifications are blocked.

## Google data (Gmail)

If you set up e-mail, you sign in through **your own Google app**. LocalDesk uses the access only
to display and search emails, summarize them with your local model and – only after your
confirmation – set your own labels or stars, create new labels of your own and rename them.
LocalDesk does not send, delete or archive emails, does not delete labels and does not mark
anything as read.

LocalDesk's use and transfer of information received from Google APIs adheres to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the Limited Use requirements. Gmail data is not shared with third parties, not used for
advertising and not used to train AI models.

**Signing out** (Settings → E-mail) revokes the access at Google and deletes the sign-in on your
PC. You can also remove the access at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions).

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

| Ziel                                                                            | Wann                                          | Was                                                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Dein Ollama-Server (Standard: dieser PC)                                        | bei jedem Chat, beim Einlesen von Wissen      | deine Nachrichten, Dokument-Abschnitte, Mails, die du zusammenfassen lässt                                |
| Ollama-Modellbibliothek                                                         | nur wenn du ein Modell herunterlädst          | Ollama selbst lädt das Modell                                                                             |
| Google (`accounts.google.com`, `oauth2.googleapis.com`, `gmail.googleapis.com`) | nur mit eingerichteter E-Mail                 | Anmeldung, Mails lesen, Labels/Sterne nach deiner Bestätigung (auch eigene Labels anlegen und umbenennen) |
| GitHub (Releases von JPPM9/LocalDesk)                                           | nur wenn du „Nach Updates suchen“ klickst     | Versionsabfrage, Download des Updates                                                                     |
| GitHub (`raw.githubusercontent.com`)                                            | nur wenn du „Skill von GitHub laden“ klickst  | der Pfad des Links; geladen wird nur eine Textdatei (SKILL.md)                                            |
| npm-Paketverzeichnis                                                            | beim ersten Start des Dateisystem-MCP-Servers | `npx` lädt das Server-Programm herunter                                                                   |

Außerdem gilt: **Befehle, die du dem Code-Agenten freigibst**, laufen mit deinen Rechten und
dürfen alles, was du am PC darfst – auch Verbindungen ins Internet. Das gilt ebenso für
**MCP-Server**, die du hinzufügst: Sie sind eigene Programme.

Die Oberfläche von LocalDesk selbst darf keine Verbindungen nach außen aufbauen und keine
Bilder aus dem Internet laden; Kamera, Mikrofon, Standort und Benachrichtigungen sind gesperrt.

## Google-Daten (Gmail)

Wenn du E-Mail einrichtest, meldest du dich über **deine eigene Google-App** an. LocalDesk
nutzt den Zugriff nur, um Mails anzuzeigen, zu suchen, mit deinem lokalen Modell
zusammenzufassen und – erst nach deiner Bestätigung – eigene Labels oder Sterne zu setzen,
neue eigene Labels anzulegen und sie umzubenennen. LocalDesk sendet, löscht und archiviert
keine Mails, löscht keine Labels und markiert nichts als gelesen.

Die Verwendung und Weitergabe von Informationen, die LocalDesk über Google-APIs erhält, hält
sich an die [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
einschließlich der Anforderungen zur eingeschränkten Nutzung („Limited Use“). Gmail-Daten werden
nicht an Dritte weitergegeben, nicht für Werbung genutzt und nicht zum Trainieren von
KI-Modellen verwendet.

**Abmelden** (Einstellungen → E-Mail) widerruft den Zugriff bei Google und löscht die Anmeldung
auf deinem PC. Du kannst den Zugriff auch unter
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) entziehen.
