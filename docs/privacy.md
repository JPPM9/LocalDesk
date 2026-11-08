---
title: Privacy policy / Datenschutz
---

# LocalDesk privacy policy

Last updated: 5 November 2026 · Deutsche Fassung weiter unten

LocalDesk is a Windows desktop app that lets you use AI models **on your own computer** (via
[Ollama](https://ollama.com)). There is no LocalDesk server and no account with us. LocalDesk is
published by JPPM9 (contact: through the issues on
[github.com/JPPM9/LocalDesk](https://github.com/JPPM9/LocalDesk/issues)).

## In short

- LocalDesk collects **no** usage data, has **no** telemetry, no advertising and sends **no**
  crash reports.
- Your chats, documents and emails go **only to the Ollama server you configure** – by default
  your own computer. LocalDesk sends nothing to third-party AI services. Only what you switch on yourself can
  leave: web pages the model reads and – with “Search the web” on – the search queries it writes.
- Everything LocalDesk stores is **on your computer**.

## What LocalDesk stores, and where

Everything lives in the data folder `%APPDATA%\LocalDesk` (in the app: Settings → About
LocalDesk):

- **`localdesk.db`** – chats (including the images you attach: LocalDesk stores only a reduced
  copy of at most 1280 pixels, never your original, and it is deleted with its message or chat;
  for files you attach (PDF, Word, text, code) it stores the text LocalDesk read from them, not
  the file itself, and deletes it the same way; for tables you attach (CSV, TSV, Excel) it stores the
  table it read – column names, types and rows – not the file, and deletes it the same way), settings, templates, projects, code sessions, the indexed passages
  of your knowledge collections (text and “fingerprints” used for searching), MCP server
  settings and – if you set up e-mail – your e-mail address, the client ID of your own Google
  app and your Google sign-in, as well as – if you set up web search – your Ollama key,
  **encrypted with Windows**.
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

| Destination                                                                                                                              | When                                                                                                                                                                                                                                                           | What                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your Ollama server (default: this computer; if it is unreachable, also the other servers you saved, to check whether they are reachable) | with every chat, when indexing knowledge                                                                                                                                                                                                                       | your messages, images you attach (reduced copies; only to models that can read images), the text of files you attach, from tables you attach the column names, a few rows and the results of the queries the model runs (a model without tools gets a small table as a whole), document passages, emails you ask it to summarize                                     |
| Ollama model library                                                                                                                     | only when you download a model                                                                                                                                                                                                                                 | Ollama itself downloads the model                                                                                                                                                                           |
| Google (`accounts.google.com`, `oauth2.googleapis.com`, `gmail.googleapis.com`)                                                          | only with e-mail set up                                                                                                                                                                                                                                        | sign-in, reading mail, labels/stars after your confirmation (also creating and renaming your own labels)                                                                                                    |
| GitHub (releases of JPPM9/LocalDesk)                                                                                                     | only when you click “Check for updates”                                                                                                                                                                                                                        | version query, download of the update                                                                                                                                                                       |
| GitHub (`api.github.com`)                                                                                                                | only when you search or open a repository under Skills → “From GitHub” and click “Go”                                                                                                                                                                          | your search term or the repository name; GitHub also sees your IP address (no sign-in, no token)                                                                                                            |
| GitHub (`raw.githubusercontent.com`)                                                                                                     | only when you check skills you selected there, or open a link to a single .md file                                                                                                                                                                             | the path of the files; only text files of the skills you chose are loaded                                                                                                                                   |
| Any web page (the site of the address)                                                                                                   | only with the “Internet” switch on in a chat, when the model reads a page: addresses you wrote in a message yourself are read at once, every other address only after you click “Allow”; in a research the pages from the search hits, after you click “Start” | the page request; the site sees your IP address, the address and “LocalDesk” as the program name. LocalDesk reads only text, sends no cookies and no sign-in and never sends your chat                      |
| Ollama web search (`ollama.com`)                                                                                                         | only with the “Search the web” checkbox on in a chat and an Ollama key saved in Settings, when the model searches, or – with the “Research” button and after you click “Start” – several searches in a row                                                     | the search query (written by the model, it can contain words from your chat) and your Ollama key as sign-in; Ollama also sees your IP address. The key is stored encrypted on your PC and never shown again |
| npm package registry                                                                                                                     | on first start of the file-system MCP server                                                                                                                                                                                                                   | `npx` downloads the server program                                                                                                                                                                          |

The web address the model asks for can contain words from your chat. That is why LocalDesk shows you the complete address before it reads any page you did not write yourself. The same goes for search queries, which is why the search has its own checkbox (off by default) and shows every query in the chat. Addresses from the hits of a search in this chat the model reads without asking – only exactly as found; every other address still needs your click. LocalDesk never reads addresses in your own network (this computer, home network, cloud metadata addresses) and never runs a page's scripts.

A **research** (button “Research” in the input field, only for your next message) runs a fixed sequence after you click “Start”: the model writes a few search queries from your question, LocalDesk searches (2 to 6 queries) and reads up to 16 pages from the hits – never other addresses – the model takes short notes per page and writes a report. The notes are not stored; only the report with its list of sources stays in the chat.

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

Stand: 5. November 2026

LocalDesk ist eine Desktop-App für Windows, mit der du KI-Modelle **auf deinem eigenen
Rechner** (über [Ollama](https://ollama.com)) nutzt. Es gibt keinen LocalDesk-Server und kein
Konto bei uns. Verantwortlich für LocalDesk ist JPPM9 (Kontakt: über die Issues auf
[github.com/JPPM9/LocalDesk](https://github.com/JPPM9/LocalDesk/issues)).

## Kurz gesagt

- LocalDesk sammelt **keine** Nutzungsdaten, hat **keine** Telemetrie, keine Werbung und
  schickt **keine** Absturzberichte.
- Deine Chats, Dokumente und Mails gehen **nur an den Ollama-Server, den du einstellst** –
  standardmäßig dein eigener PC. LocalDesk schickt nichts an fremde KI-Dienste. Nur was du selbst einschaltest, kann den
  PC verlassen: Webseiten, die das Modell liest, und – mit „Im Web suchen“ – die Suchanfragen, die es schreibt.
- Alles, was LocalDesk speichert, liegt **auf deinem PC**.

## Was LocalDesk wo speichert

Alles liegt im Datenordner `%APPDATA%\LocalDesk` (in der App: Einstellungen → Über LocalDesk):

- **`localdesk.db`** – Chats (auch die Bilder, die du anhängst: LocalDesk speichert nur eine
  verkleinerte Kopie mit höchstens 1280 Pixeln, nie dein Original, und sie wird mit ihrer
  Nachricht oder dem Chat gelöscht; bei angehängten Dateien (PDF, Word, Text, Code) den Text, den
  LocalDesk daraus gelesen hat, nicht die Datei selbst – er wird genauso gelöscht; bei angehängten
  Tabellen (CSV, TSV, Excel) die Tabelle, die LocalDesk gelesen hat – Spaltennamen, Typen und Zeilen –,
  nicht die Datei, ebenfalls genauso gelöscht), Einstellungen,
  Vorlagen, Projekte, Code-Sitzungen, die
  eingelesenen Abschnitte deiner Wissens-Sammlungen (Text und „Fingerabdrücke“ zum Suchen),
  MCP-Server-Einstellungen und – wenn du E-Mail einrichtest – deine E-Mail-Adresse, die Client-ID
  deiner eigenen Google-App und die Anmeldung bei Google sowie – wenn du die Websuche einrichtest –
  dein Ollama-Schlüssel, **mit Windows verschlüsselt**.
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

| Ziel                                                                                                                                                   | Wann                                                                                                                                                                                                                                                                                                          | Was                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dein Ollama-Server (Standard: dieser PC; ist er nicht erreichbar, auch die anderen von dir gespeicherten Server, um zu prüfen, ob sie erreichbar sind) | bei jedem Chat, beim Einlesen von Wissen                                                                                                                                                                                                                                                                      | deine Nachrichten, angehängte Bilder (verkleinerte Kopien; nur an Modelle, die Bilder lesen können), der Text angehängter Dateien, von angehängten Tabellen die Spaltennamen, ein paar Zeilen und die Ergebnisse der Abfragen, die das Modell ausführt (ein Modell ohne Werkzeuge bekommt eine kleine Tabelle ganz), Dokument-Abschnitte, Mails, die du zusammenfassen lässt                                                     |
| Ollama-Modellbibliothek                                                                                                                                | nur wenn du ein Modell herunterlädst                                                                                                                                                                                                                                                                          | Ollama selbst lädt das Modell                                                                                                                                                                                                                  |
| Google (`accounts.google.com`, `oauth2.googleapis.com`, `gmail.googleapis.com`)                                                                        | nur mit eingerichteter E-Mail                                                                                                                                                                                                                                                                                 | Anmeldung, Mails lesen, Labels/Sterne nach deiner Bestätigung (auch eigene Labels anlegen und umbenennen)                                                                                                                                      |
| GitHub (Releases von JPPM9/LocalDesk)                                                                                                                  | nur wenn du „Nach Updates suchen“ klickst                                                                                                                                                                                                                                                                     | Versionsabfrage, Download des Updates                                                                                                                                                                                                          |
| GitHub (`api.github.com`)                                                                                                                              | nur wenn du unter Skills → „Von GitHub“ suchst oder ein Projekt öffnest und auf „Los“ klickst                                                                                                                                                                                                                 | dein Suchbegriff oder der Projektname; GitHub sieht dabei auch deine IP-Adresse (keine Anmeldung, kein Token)                                                                                                                                  |
| GitHub (`raw.githubusercontent.com`)                                                                                                                   | nur wenn du dort gewählte Skills prüfen lässt oder einen Link auf eine einzelne .md-Datei öffnest                                                                                                                                                                                                             | der Pfad der Dateien; geladen werden nur Textdateien der Skills, die du gewählt hast                                                                                                                                                           |
| Beliebige Webseite (die Seite der Adresse)                                                                                                             | nur bei eingeschaltetem Schalter „Internet“ im Chat, wenn das Modell eine Seite liest: Adressen, die du selbst in eine Nachricht geschrieben hast, werden gleich gelesen, jede andere erst nach deinem Klick auf „Erlauben“; bei einer Recherche die Seiten aus den Treffern, nach deinem Klick auf „Starten“ | die Seitenanfrage; die Seite sieht deine IP-Adresse, die Adresse und „LocalDesk“ als Programmnamen. LocalDesk liest nur Text, schickt keine Cookies und keine Anmeldung und nie deinen Chat                                                    |
| Ollama-Websuche (`ollama.com`)                                                                                                                         | nur bei eingeschaltetem Haken „Im Web suchen“ im Chat und einem in den Einstellungen gespeicherten Ollama-Schlüssel, wenn das Modell sucht, oder – mit dem Knopf „Recherche“ und nach deinem Klick auf „Starten“ – mehrere Suchen hintereinander                                                              | die Suchanfrage (vom Modell geschrieben, sie kann Wörter aus deinem Chat enthalten) und dein Ollama-Schlüssel als Anmeldung; Ollama sieht auch deine IP-Adresse. Der Schlüssel liegt verschlüsselt auf deinem PC und wird nie wieder angezeigt |
| npm-Paketverzeichnis                                                                                                                                   | beim ersten Start des Dateisystem-MCP-Servers                                                                                                                                                                                                                                                                 | `npx` lädt das Server-Programm herunter                                                                                                                                                                                                        |

Die Webadresse, die das Modell anfragt, kann Wörter aus deinem Chat enthalten. Darum zeigt dir LocalDesk die vollständige Adresse, bevor es eine Seite liest, die du nicht selbst geschrieben hast. Dasselbe gilt für Suchanfragen: Darum hat die Suche einen eigenen Haken (anfangs aus) und zeigt jede Anfrage im Chat. Adressen aus den Treffern einer Suche in diesem Chat liest das Modell ohne Rückfrage – nur genau so, wie sie gefunden wurden; jede andere Adresse braucht weiter deinen Klick. Adressen im eigenen Netz (dieser PC, Heimnetz, Cloud-Metadaten-Adressen) liest LocalDesk nie, und Skripte einer Seite führt es nie aus.

Eine **Recherche** (Knopf „Recherche“ im Eingabefeld, nur für deine nächste Nachricht) läuft nach deinem Klick auf „Starten“ in einem festen Ablauf: Das Modell schreibt aus deiner Frage ein paar Suchanfragen, LocalDesk sucht (2 bis 6 Anfragen) und liest bis zu 16 Seiten aus den Treffern – nie andere Adressen –, das Modell macht je Seite kurze Notizen und schreibt den Bericht. Die Notizen werden nicht gespeichert; im Chat bleibt nur der Bericht mit seiner Quellenliste.

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
