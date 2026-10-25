# CLAUDE.md – Projektregeln LocalDesk

## Zusammenarbeit

- Antworten und Erklärungen auf Deutsch, Anrede „du“. Der Nutzer ist Programmier-Einsteiger:
  bei wichtigen Entscheidungen kurz das _Warum_ erklären.
- Kleine Schritte: ein Feature pro Schritt, danach starten/testen, kurz berichten.
- Nach jeder Phase: App starten, testen, berichten was funktioniert und was nicht.
- Nichts installieren, löschen oder konfigurieren, ohne es vorher anzukündigen.
- Nur Funktionen bauen, die als **Muss** oder **Kann** bestätigt sind (Liste unten).
- Bei Unklarheiten nachfragen statt raten.
- Fremden Code (LocalAI, Jan, Open WebUI, Chatbox, Cherry Studio, AnythingLLM) nur als
  Inspiration lesen. Übernahme nur bei MIT/Apache mit Quellenangabe; GPL/AGPL/Open-WebUI-Lizenz nie.

## Architektur-Entscheidungen

- **Electron + TypeScript + React** (Electron Forge mit Vite). Grund: eine Sprache überall,
  offizielles MCP-SDK in TypeScript, einsteigerfreundlich. App-Größe spielt keine Rolle.
- **Main-Prozess macht alles mit Außenwirkung** (Netzwerk zu Ollama, Dateien, SQLite, nvidia-smi, MCP).
  Der Renderer ist reine Oberfläche und spricht nur über `window.api` (Preload, `contextBridge`).
  `contextIsolation`, `sandbox` an, `nodeIntegration` aus. Fertige App hat eine CSP ohne fremde Verbindungen.
- IPC-Kanalnamen und gemeinsame Typen liegen in `src/shared/`.
- **Provider-Schnittstelle**: Ollama zuerst; OpenAI-kompatible Server später als weitere Implementierung.
- **Speicherung**: SQLite in `%APPDATA%\LocalDesk`, plus Export als Markdown/JSON. Keine Verschlüsselung.
- **GPU-Last** über `nvidia-smi` (nur bei lokalem Ollama); geladene Modelle/VRAM über Ollama `/api/ps`.
- **Netzwerk**: nur Ollama-Server (lokal/LAN), Modell-Downloads über Ollama, Update-Prüfung nur per Knopf.
  Keine Telemetrie.
- **Tools/MCP**: Lesen frei, Schreiben/Ausführen bestätigen; pro Tool „immer / fragen / aus“.
- **Obsidian-Memory**: App schreibt nur in eigenen Unterordner des Vaults; Pfad in Einstellungen.
- **UI**: Dunkel + Hell (folgt Windows), nüchtern-technisch, Seitenleiste wie LocalAI, Texte über i18n (Deutsch).

## Funktionsumfang

- **Muss**: Chat (Streaming, Markdown, Code, Verlauf, Suche) · mehrere Chats, Ordner, Vorlagen/Systemprompts ·
  Modellverwaltung (Liste, Download, Löschen, Status VRAM/GPU) · RAG mit Quellen · MCP + Tool-Calling ·
  Memory mit Obsidian · Parameter pro Chat · Tastenkürzel · Windows-Installer · Tests für Kernlogik
- **Kann**: Bildanhänge/Vision · Traces · Export/Import · Modellvergleich · Agents · Skills · Systemtray ·
  Mehrfenster · globales Schnellfenster
- **Später**: Sprachein-/ausgabe · Bild-/Video-Generierung · Verschlüsselung

## Phasen

0. Setup ✅ · 1. Minimal-App (Modellliste, Chat-Streaming, Verlauf) · 2. Organisation & Parameter ·
1. Modelle & Status · 4. MCP · 5. RAG · 6. Memory/Obsidian · 7. Installer & Update-Check

## Befehle

- `npm start` – Entwicklungsmodus · `npm run typecheck` · `npm run lint` · `npm run make` – Installer
- Shell-Hinweis: Nach der Node-Installation kennt eine alte Shell `node` evtl. noch nicht (PATH neu laden).
