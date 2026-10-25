# LocalDesk

Persönliche Desktop-App für lokale KI-Modelle über [Ollama](https://ollama.com).
Navigation inspiriert von [mudler/LocalAI](https://github.com/mudler/LocalAI) (MIT) – eigener Code, keine Kopie.

Stand: **Phase 0** – Grundgerüst (Electron + React + TypeScript), noch keine Ollama-Funktionen.

## Voraussetzungen

- Windows 11
- [Node.js LTS](https://nodejs.org) (getestet mit 24.22.1) – Installation z. B. mit
  `winget install OpenJS.NodeJS.LTS`
- Ollama läuft lokal (`http://localhost:11434`) – erst ab Phase 1 nötig

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
