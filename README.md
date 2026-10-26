# LocalDesk

Persönliche Desktop-App für lokale KI-Modelle über [Ollama](https://ollama.com).
Navigation inspiriert von [mudler/LocalAI](https://github.com/mudler/LocalAI) (MIT) – eigener Code, keine Kopie.

Stand: **Phase 3 abgeschlossen** (Modelle & Status)

- Statusanzeige für Ollama, Liste der installierten Modelle
- Chat mit Streaming: Markdown, Code-Hervorhebung, Gedanken von Denkmodellen, Tokens/s
- Gespeicherter Verlauf mit Ordnern (Chats per Ziehen oder Menü verschieben)
- Einstellungen pro Chat: Systemprompt, Kontextlänge, Temperatur, Seed, Denken
- Vorlagen für wiederkehrende Aufgaben
- Volltextsuche über alle Chats
- Umschaltbare Ollama-Server (dieser PC oder ein anderer Rechner im LAN)
- Tastenkürzel (Übersicht mit **Strg+/** oder **F1**)
- Modelle herunterladen (mit Fortschritt, Tempo, Restzeit) und löschen – Seite „Installierte Modelle“
- Status-Seite: Grafikkarte (Auslastung, VRAM nach Ollama/andere/frei, Temperatur, Strom –
  nur bei Ollama auf diesem PC mit NVIDIA-Karte) und geladene Modelle mit Anteil GPU/CPU

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
