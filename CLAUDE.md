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
- **Speicherung**: SQLite in `%APPDATA%\LocalDesk\localdesk.db`, plus Export als Markdown/JSON. Keine Verschlüsselung.
  Eingebautes `node:sqlite` (kein natives Paket wie better-sqlite3 → kein Neukompilieren je Electron-Version;
  FTS5 vorhanden, Erweiterungen wie sqlite-vec ladbar). Alle SQL-Zugriffe nur in `src/main/db/`.
  Schema-Änderungen nur als **neuer** Eintrag in `migrations` (`database.ts`), bestehende nie ändern.
- **Chat-Speichern im Main-Prozess**: `chat-service.ts` legt Chat/Nachrichten an, streamt und speichert
  (Zwischenstand jede Sekunde, Endstand bei done/error/aborted). Beim Start werden hängende Antworten
  (`streaming`) als `aborted` markiert. Stream-Logik (`applyChatEvent`) liegt in `src/shared/chat.ts`
  und wird von Oberfläche und Main gemeinsam genutzt.
- **Chat-Einstellungen** (Systemprompt, Temperatur, Kontextlänge, Seed, Denken) liegen als JSON in
  `chats.settings_json` (Migration 2). Prüfung immer über `normalizeSettings` (`src/shared/settings.ts`),
  Anfrage-Aufbau über `buildChatRequest`. Nur gesetzte Werte gehen an Ollama.
- **Gemessenes Ollama-Verhalten (0.40.11)**: Standard-Kontext ist 4096 Tokens (zu sehen in `/api/ps`).
  `think: false` wirkt bei qwen3/gemma4; gpt-oss ignoriert es und kennt nur `low`/`medium`/`high`
  (→ `thinkStyle`, beim Modellwechsel wird eine unpassende Denken-Einstellung entfernt).
- **Vorlagen** (Tabelle `templates`, Migration 3): Name + optionales Modell + Chat-Einstellungen.
  **Kopie, keine Verknüpfung**: Beim Auswählen werden Modell/Einstellungen in den neuen Chat kopiert;
  spätere Änderungen an der Vorlage ändern bestehende Chats nicht. Sortierung nach deutschen Regeln
  in JS (`localeCompare('de')`), weil SQLite Umlaute falsch einsortiert. Einstellungsfelder sind eine
  gemeinsame Komponente (`components/settings/SettingsFields.tsx`) für Chat-Panel und Vorlagen-Editor.
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

- Phase 0: Setup ✅
- Phase 1: Minimal-App (Modellliste, Chat-Streaming, Verlauf) ✅
- Phase 2: Organisation & Parameter
- Phase 3: Modelle & Status
- Phase 4: MCP
- Phase 5: RAG
- Phase 6: Memory/Obsidian
- Phase 7: Installer & Update-Check

## Befehle

- `npm start` – Entwicklungsmodus · `npm test` – Vitest (Tests in `tests/`) · `npm run typecheck` · `npm run lint` · `npm run make` – Installer
- Shell-Hinweis: Nach der Node-Installation kennt eine alte Shell `node` evtl. noch nicht (PATH neu laden).
- Commit-Nachrichten mit deutschen Anführungszeichen („…“) oder Umlauten über die Bash mit
  `git commit -F -` und Heredoc schreiben – PowerShell 5.1 verstümmelt sie bzw. der Commit schlägt fehl.
