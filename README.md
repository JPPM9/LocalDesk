# LocalDesk

Persönliche Desktop-App für lokale KI-Modelle über [Ollama](https://ollama.com).
Navigation inspiriert von [mudler/LocalAI](https://github.com/mudler/LocalAI) (MIT) – eigener Code, keine Kopie.

Stand: **Phase 5 abgeschlossen** (Wissen & Projekte)

- Statusanzeige für Ollama, Liste der installierten Modelle
- Chat mit Streaming: Markdown, Code-Hervorhebung, Gedanken von Denkmodellen, Tokens/s
- Gespeicherter Verlauf mit Projekten (Chats per Ziehen oder Menü verschieben). Ein Projekt kann
  Anweisungen und eigene Dokumente haben, die in jedem seiner Chats gelten – öffnen über das
  Zahnrad am Projekt in der Chat-Liste.
- Einstellungen pro Chat: Systemprompt, Kontextlänge, Temperatur, Seed, Denken
- Vorlagen für wiederkehrende Aufgaben
- Volltextsuche über alle Chats
- Umschaltbare Ollama-Server (dieser PC oder ein anderer Rechner im LAN)
- Tastenkürzel (Übersicht mit **Strg+/** oder **F1**)
- Modelle herunterladen (mit Fortschritt, Tempo, Restzeit) und löschen – Seite „Installierte Modelle“
- Status-Seite: Grafikkarte (Auslastung, VRAM nach Ollama/andere/frei, Temperatur, Strom –
  nur bei Ollama auf diesem PC mit NVIDIA-Karte) und geladene Modelle mit Anteil GPU/CPU
- MCP-Dateisystem-Server mit Freigaben pro Tool; Modelle können im Chat Dateien in den
  freigegebenen Ordnern lesen und – nach Rückfrage – schreiben
- Seite „Wissen“: Sammlungen aus Ordnern und Dateien (PDF, Word, Text, Markdown, Quellcode) einlesen;
  „Neu einlesen“ berechnet nur Geändertes neu. Braucht das Embedding-Modell
  `qwen3-embedding:0.6b` (unter „Installierte Modelle“ herunterladen).
- Wissen im Chat: Über den Wissen-Knopf (Bücher-Symbol im Chat-Kopf, auch in Vorlagen) Sammlungen
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
2. **Wissen** (Seitenleiste): Sammlung anlegen, Ordner oder Dateien hinzufügen (PDF, Word, Text,
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

## Starten

```bash
npm install
npm start
```

`npm start` öffnet die App im Entwicklungsmodus (mit Entwicklerwerkzeugen in einem
eigenen Fenster). Änderungen an der Oberfläche erscheinen sofort; Änderungen am
Main-Prozess brauchen einen Neustart (im Terminal Taste `r`; beenden mit `q`).

## Weitere Befehle

| Befehl              | Zweck                                           |
| ------------------- | ----------------------------------------------- |
| `npm test`          | Automatische Tests ausführen (Vitest)           |
| `npm run typecheck` | TypeScript prüft alle Typen                     |
| `npm run lint`      | Code-Regeln und Formatierung prüfen             |
| `npm run lint:fix`  | Formatierung automatisch korrigieren            |
| `npm run make`      | Windows-Installer bauen (Ausgabe in `out/make`) |

## Aufbau

```
src/
  main/       Main-Prozess (Node): Fenster, Ollama, Datenbank, System
  preload/    Sichere Brücke: stellt window.api für die Oberfläche bereit
  renderer/   Oberfläche (React)
  shared/     Typen, die beide Seiten nutzen
```

Projektregeln und Entscheidungen: siehe [CLAUDE.md](CLAUDE.md).
