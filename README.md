# LocalDesk

Persönliche Desktop-App für lokale KI-Modelle über [Ollama](https://ollama.com).
Navigation inspiriert von [mudler/LocalAI](https://github.com/mudler/LocalAI) (MIT) – eigener Code, keine Kopie.

Stand: **Phase 4 abgeschlossen** (MCP & Tool-Calling), Phase 5 (Wissen & Projekte) in Arbeit

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
