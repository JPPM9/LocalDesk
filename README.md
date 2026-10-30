# LocalDesk

Persönliche Desktop-App für lokale KI-Modelle über [Ollama](https://ollama.com).
Navigation inspiriert von [mudler/LocalAI](https://github.com/mudler/LocalAI) (MIT) – eigener Code, keine Kopie.

Stand: **Phase 12 abgeschlossen** (Code-Bereich) – Installer und Update-Knopf (Phase 7)
sind fertig, das erste Release kommt nach den weiteren geplanten Phasen.

- Oberfläche: schmale Symbolleiste links (Chat, Vorlagen, E-Mail, Code, Wissen, Skills, Modelle,
  Status,
  Einstellungen),
  daneben die Chatliste (Projekte, Chats nach Tagen, Ollama-Status unten; **Strg+B** klappt sie ein).
  Hell, dunkel oder wie Windows – umschalten unten in der Leiste oder unter Einstellungen →
  Darstellung. Schrift Inter (liegt in der App, wird nicht aus dem Internet geladen).

- Statusanzeige für Ollama, Liste der installierten Modelle
- Chat mit Streaming: Markdown, Code-Hervorhebung, Gedanken von Denkmodellen, Tokens/s
- Gespeicherter Verlauf mit Projekten (Chats per Ziehen oder Menü verschieben). Ein Projekt kann
  Anweisungen und eigene Dokumente haben, die in jedem seiner Chats gelten – öffnen über das
  Zahnrad am Projekt in der Chat-Liste.
- Einstellungen pro Chat: Systemprompt, Kontextlänge, Temperatur, Seed, Denken
- Vorlagen für wiederkehrende Aufgaben
- Skills: Anleitungen für wiederkehrende Aufgaben (Seite „Skills“ in der Leiste) – im Chat über den
  Schalter „Skills“ einschalten, in Projekten/Vorlagen voreinstellen, oder das Modell lädt einen
  passenden selbst
- Volltextsuche über alle Chats
- Umschaltbare Ollama-Server (dieser PC oder ein anderer Rechner im LAN)
- Tastenkürzel (Übersicht mit **Strg+/** oder **F1**)
- Modelle herunterladen (mit Fortschritt, Tempo, Restzeit) und löschen – Seite „Installierte Modelle“
- Status-Seite: Grafikkarte (Auslastung, VRAM nach Ollama/andere/frei, Temperatur, Strom –
  nur bei Ollama auf diesem PC mit NVIDIA-Karte) und geladene Modelle mit Anteil GPU/CPU
- MCP-Dateisystem-Server mit Freigaben pro Tool; Modelle können im Chat Dateien in den
  freigegebenen Ordnern lesen und – nach Rückfrage – schreiben (einschalten über den Schalter
  „Werkzeuge“ unten im Eingabefeld)
- Seite „Wissen“: Sammlungen aus Ordnern und Dateien (PDF, Word, Text, Markdown, Quellcode) einlesen;
  „Neu einlesen“ berechnet nur Geändertes neu. Braucht das Embedding-Modell
  `qwen3-embedding:0.6b` (unter „Installierte Modelle“ herunterladen).
- Wissen im Chat: Über den Schalter „Wissen“ unten im Eingabefeld (auch in Vorlagen) Sammlungen
  wählen – vor jeder Antwort sucht LocalDesk passende Stellen, das Modell zitiert sie mit [1], [2] …
  Klick auf die Nummer zeigt die Textstelle, „Öffnen“ die Datei.
- Seitenbereich neben dem Chat (Knopf ganz rechts im Chat-Kopf): Quellen der letzten Antwort,
  Projekt (Anweisungen, Dokumente) und Kontext-Füllstand. Wird der Kontext knapp, färbt sich der
  Knopf gelb/rot; „Kontextlänge erhöhen“ zeigt, wie viel Grafikspeicher das ungefähr kostet.
- Obsidian (Einstellungen → Obsidian): Vault wählen; LocalDesk schreibt nur in einen eigenen
  Unterordner (Standard `LocalDesk`). Erinnerungen (Fakten über dich) liegen dort als Notizen –
  global oder pro Projekt – und gelten automatisch in jedem passenden Chat. In Obsidian bearbeitete
  Erinnerungen wirken sofort.
- Merken im Chat: Erzählst du etwas über dich („Ich studiere …“, „Merk dir …“), kann das Modell
  eine Erinnerung vorschlagen. Du siehst sie als Karte, kannst den Text ändern und speicherst oder
  lehnst ab – ohne deine Bestätigung wird nichts gespeichert. Geht nur mit Modellen, die Werkzeuge
  können. Zusätzlich hat jede Nachricht beim Überfahren einen Knopf „Merken“.
- Chats in Obsidian speichern: Unter jeder Antwort „In Obsidian speichern“ (Antwort mit Frage),
  im Chat-Kopf das Notiz-Symbol (ganzer Chat). Die Notiz landet in `LocalDesk/Chats/` mit Datum,
  Modell, Projekt und Quellen; vorhandene Notizen werden nie überschrieben.
- Zusammenfassungen: Öffnest du einen Chat mit mindestens 6 Nachrichten, der seit 30 Minuten ruht,
  fragt LocalDesk „Zusammenfassung speichern?“. Erst auf deinen Klick fasst das Modell zusammen; du
  bearbeitest Titel und Text und speicherst nach `LocalDesk/Zusammenfassungen/`. „Nein danke“ fragt
  erst nach 6 neuen Nachrichten wieder. Über das Rollen-Symbol im Chat-Kopf geht es jederzeit.
- Vault als Wissen: Mit dem Vault erscheint unter „Wissen“ die Sammlung „Obsidian“. Einmal
  „Einlesen“ (später „Neu einlesen“ – nur Geändertes), dann pro Chat über den Wissen-Knopf
  einschalten oder in Vorlagen voreinstellen. Datei-Kopf, Tags und [[Wiki-Links]] werden passend
  aufbereitet, `.obsidian` und deine Erinnerungen übersprungen. „Öffnen“ einer Quelle öffnet die
  Notiz direkt in Obsidian.

## Skills benutzen

Ein Skill ist eine Anleitung als Markdown-Datei, z. B. wie das Modell Code prüfen oder Lernkarten
erstellen soll. Vier Beispiele sind dabei; eigene legst du auf der Seite **Skills** an.

- **Wann passt dieser Skill?** – dieser Satz ist wichtig: Danach entscheidet das Modell, ob es den
  Skill von selbst lädt (geht mit Modellen, die Werkzeuge können; im Chat steht dann
  „Skill · … · geladen“).
- **Von Hand:** Schalter „Skills“ unten im Eingabefeld – eingeschaltete Skills gelten für jede Antwort.
- **Projekte und Vorlagen** können Skills voreinstellen.
- Die Dateien liegen unter `%APPDATA%\LocalDesk\skills\<name>\SKILL.md` (gleiches Format wie bei
  Claude) und lassen sich auch mit jedem Editor ändern („Neu laden“ in der App).
- Ein Skill ist nur Text: Er führt nichts aus und gibt keine Werkzeug-Rechte.

## E-Mail benutzen (Gmail)

LocalDesk liest deine Gmail-Mails direkt bei Google – ohne fremden Dienst dazwischen – und gibt sie
nur an dein lokales Modell. Einrichten (einmalig, etwa 10 Minuten): Schritt für Schritt in
[docs/email-einrichten.md](docs/email-einrichten.md), danach **Einstellungen → E-Mail → Mit Google
anmelden**. Outlook folgt später (Microsoft verlangt dafür ein Azure-Verzeichnis).

- **Seite „E-Mail“:** Posteingang oder Gmail-Suche (z. B. `is:unread`, `from:bank`), Mails als reiner
  Text ohne Bilder aus dem Internet, **Zusammenfassen** mit einem Modell deiner Wahl.
- **Sortieren vorschlagen** (Zauberstab über der Liste): Das Modell schlägt für die ersten 25 Mails
  eigene Labels und Sterne vor; du hakst an, was in Gmail übernommen wird.
- **Im Chat:** Schalter „E-Mail“ im Eingabefeld – dann darf das Modell Mails suchen und lesen
  („Was kam heute Wichtiges?“). Änderungen schlägt es als Karte vor, du klickst „Übernehmen“ oder
  „Ablehnen“. Braucht ein Modell mit Werkzeugen.
- **Was nie passiert:** senden, löschen, archivieren, als gelesen markieren. Ändern kann LocalDesk
  nur „eigenes Label hinzufügen“ und „Stern setzen/entfernen“ – und nur nach deinem Klick.
- **Testmodus:** Solange deine Google-App im Status „Test“ ist, meldet Google dich nach 7 Tagen ab –
  dann einfach in den Einstellungen neu anmelden.

## Code-Bereich benutzen

Auf der Seite **Code** arbeitet ein Agent in einem Projektordner, den du mit **Neue Sitzung** im
Windows-Dialog wählst. Er sieht nur diesen Ordner (ganze Laufwerke, Systemordner und der ganze
Benutzerordner gehen nicht; `.git` ist gesperrt).

- **Ohne Rückfrage:** Ordner ansehen, Dateien lesen, Text suchen, Git-Status und -Diff.
- **Nur nach deinem Klick**, jedes Mal einzeln:
  - **Datei ändern, anlegen, löschen** – die Karte zeigt Vorher/Nachher (rot/grün). Danach kannst
    du jede Änderung mit **Rückgängig** zurücknehmen; wurde die Datei seither noch einmal geändert,
    fragt LocalDesk vorher.
  - **Befehle** (PowerShell im Projektordner, z. B. `python -m pytest`) – die Karte zeigt den
    genauen Befehl. Zeitlimit 2 Minuten (höchstens 10), **Stopp** beendet auch Unterprozesse.
    Achtung: Ein freigegebener Befehl darf alles, was du am PC darfst – auch ins Internet.
  - **Commit** – die Karte zeigt Nachricht und Dateien. **Push gibt es nicht.**
- Braucht ein Modell mit Werkzeugen (z. B. qwen3, gpt-oss). Lokale Modelle irren sich: Lies die
  Karten kurz, bevor du klickst.
- Sicherungen für „Rückgängig“ liegen unter `%APPDATA%\LocalDesk\code-backups\`.

## Dateien im Chat benutzen (MCP)

1. **Einstellungen → MCP-Server**: einen Dateisystem-Server anlegen und die Ordner wählen,
   auf die er zugreifen darf. Beim ersten Start lädt `npx` den offiziellen Server herunter.
2. Im Chat oben auf das **Stecker-Symbol** klicken und den Server für diesen Chat einschalten.
   Das Modell muss Tools unterstützen (z. B. qwen3, gpt-oss, gemma4).
3. Lesende Tools laufen sofort. Bei allen anderen fragt LocalDesk im Chat nach:
   **Einmal erlauben**, **Immer erlauben** oder **Ablehnen**. Jeder Aufruf steht einklappbar
   in der Antwort, mit Eingabe und Ergebnis.

Tipp: Die Tool-Beschreibungen belegen schon rund 1500 Tokens. Bei längeren Dateien in den
Chat-Einstellungen die Kontextlänge erhöhen (z. B. 16 384).

Getestet mit qwen3:14b, gpt-oss:20b und gemma4:12b. Meldet Ollama, dass ein Modell nicht
geladen werden konnte, ist meist der Grafikspeicher noch von einem anderen Modell belegt –
auf der Status-Seite nachsehen.

## Wissen und Projekte benutzen

1. Einmalig das Embedding-Modell `qwen3-embedding:0.6b` (639 MB) unter **Installierte Modelle**
   herunterladen – es berechnet die „Fingerabdrücke“ der Textabschnitte, lokal über Ollama.
2. **Wissen** (Symbolleiste links): Sammlung anlegen, Ordner oder Dateien hinzufügen (PDF, Word, Text,
   Markdown, Quellcode), **Einlesen**. Die Dateien bleiben, wo sie sind; nach Änderungen
   **Neu einlesen** – das rechnet nur Neues und Geändertes.
3. Im Chat über das Bücher-Symbol Sammlungen einschalten. Vor jeder Antwort sucht LocalDesk
   passende Stellen; das Modell zitiert sie mit [1], [2] …
4. **Projekte**: In der Chat-Liste ein Projekt anlegen und über das Zahnrad öffnen. Anweisungen
   und Projekt-Dokumente gelten automatisch für jeden Chat im Projekt.
5. Wird es eng im Kontext, färbt sich der Seitenbereich-Knopf (rechts im Chat-Kopf) gelb oder
   rot – dort lässt sich die Kontextlänge erhöhen, mit Angabe des ungefähren Grafikspeichers.

Getestet mit qwen3:14b, gpt-oss:20b und gemma4:12b. Gescannte PDFs (nur Bilder) gehen nicht –
Texterkennung gibt es nicht. Tipp: Anweisungen wie „nenne immer eine Quelle“ verleiten Modelle
dazu, auch ohne passende Stelle Nummern zu schreiben.

## Ollama auf einem anderen Rechner nutzen

1. Auf dem anderen Rechner Ollama im Netzwerk lauschen lassen: Umgebungsvariable
   `OLLAMA_HOST=0.0.0.0` setzen und Ollama neu starten.
2. Dort in der Windows-Firewall eingehende Verbindungen auf Port 11434 erlauben
   (nur für das private Netzwerk).
3. In LocalDesk unter **Einstellungen → Ollama-Server** die IP-Adresse eintragen,
   **Testen**, speichern und auswählen.

## Voraussetzungen

- Windows 11
- [Node.js LTS](https://nodejs.org) (getestet mit 24.22.1) – Installation z. B. mit
  `winget install OpenJS.NodeJS.LTS`
- Ollama läuft lokal (`http://localhost:11434`) mit mindestens einem Modell

## Wo liegen meine Daten?

Alle Chats liegen in einer SQLite-Datei: `%APPDATA%\LocalDesk\localdesk.db`
(der genaue Ordner steht in der App unter **Einstellungen → Über LocalDesk**).
Zum Sichern die App schließen und den Ordner kopieren. Nichts davon verlässt den Rechner.

Bei E-Mail speichert LocalDesk **keine Mails** – nur die Anmeldung bei Google, mit Windows
verschlüsselt (nur dein Windows-Konto kann sie lesen), und die Client-ID deiner Google-App.
„Abmelden“ widerruft den Zugriff bei Google und löscht die Anmeldung.

Mit eingerichtetem Obsidian-Vault liegen Erinnerungen, gespeicherte Chats und Zusammenfassungen
zusätzlich als normale Notizen im Vault – nur im eigenen Unterordner (Standard `LocalDesk`):
`Erinnerungen/`, `Projekte/<Projekt>/Erinnerungen/`, `Chats/`, `Zusammenfassungen/`. Sie gehören dir
wie jede andere Notiz; LocalDesk löscht nur Erinnerungen, und nur wenn du es in der App tust.

## Starten

```bash
npm install
npm start
```

`npm start` öffnet die App im Entwicklungsmodus (mit Entwicklerwerkzeugen in einem
eigenen Fenster). Änderungen an der Oberfläche erscheinen sofort; Änderungen am
Main-Prozess brauchen einen Neustart (im Terminal Taste `r`; beenden mit `q`).

## Installieren

`npm run dist` baut `out/installer/LocalDesk-Setup-<Version>.exe`. Der Installer fragt nach dem
Zielordner (Standard: `%LOCALAPPDATA%\Programs\LocalDesk`, ohne Admin-Rechte) und legt Startmenü-
und Desktop-Verknüpfung an. Deinstallieren über Windows-Einstellungen → Apps; deine Chats und
Einstellungen in `%APPDATA%\LocalDesk` bleiben dabei erhalten.

Die App ist nicht signiert. Beim ersten Start der Setup-Datei zeigt Windows deshalb „Der Computer
wurde durch Windows geschützt“ – über „Weitere Informationen → Trotzdem ausführen“ geht es weiter.

## Aktualisieren

Einstellungen → Über LocalDesk → **Nach Updates suchen**. LocalDesk fragt dafür (und nur dann)
GitHub nach der neuesten Version. Gibt es eine, siehst du die Änderungen; „Herunterladen und
installieren“ lädt sie und prüft die Prüfsumme, „Jetzt neu starten und installieren“ installiert
sie im bisherigen Ordner. Deine Chats und Einstellungen bleiben erhalten.

## Neue Version veröffentlichen

1. In `package.json` die Version erhöhen (z. B. `0.1.0` → `0.1.1`).
2. In `CHANGELOG.md` einen Abschnitt `## 0.1.1 – <Datum>` mit den Änderungen schreiben – das wird
   der Text, den der Update-Knopf anzeigt.
3. Committen und pushen.
4. `npm run release` – prüft und baut alles, veröffentlicht aber nichts (Probelauf).
5. `npm run release -- --publish` – lädt Installer und Update-Datei als GitHub-Release hoch.

## Weitere Befehle

| Befehl              | Zweck                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| `npm test`          | Automatische Tests ausführen (Vitest)                                   |
| `npm run typecheck` | TypeScript prüft alle Typen                                             |
| `npm run lint`      | Code-Regeln und Formatierung prüfen                                     |
| `npm run lint:fix`  | Formatierung automatisch korrigieren                                    |
| `npm run dist`      | Windows-Installer bauen (`out/installer/LocalDesk-Setup-<Version>.exe`) |
| `npm run make`      | Portable ZIP-Version bauen (Ausgabe in `out/make`)                      |
| `npm run release`   | Release vorbereiten (Probelauf); mit `-- --publish` veröffentlichen     |
| `npm run notices`   | Lizenzen der Pakete in `THIRD_PARTY_NOTICES.md` neu sammeln             |

## Aufbau

```
src/
  main/       Main-Prozess (Node): Fenster, Ollama, Datenbank, System
  preload/    Sichere Brücke: stellt window.api für die Oberfläche bereit
  renderer/   Oberfläche (React)
  shared/     Typen, die beide Seiten nutzen
```

Projektregeln und Entscheidungen: siehe [CLAUDE.md](CLAUDE.md).

## Datenschutz

Keine Telemetrie, kein Konto, keine Werbung – deine Daten bleiben auf deinem PC. Alles im
Detail: [docs/privacy.md](docs/privacy.md) (auch in der App unter **Einstellungen →
Datenschutz**).

## Lizenz

LocalDesk steht unter der [MIT-Lizenz](LICENSE). Die Lizenzen der mitgelieferten Pakete stehen in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) und in der App unter **Einstellungen → Über
LocalDesk → Lizenzen**.
