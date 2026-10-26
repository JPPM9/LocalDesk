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
- **Suche** (Migration 4): FTS5-Tabelle `messages_fts` als externer Index auf `messages`, gepflegt per
  Triggern (Insert/Update of content/Delete – auch bei Chat-Löschung per Cascade). Tokenizer
  `unicode61 remove_diacritics 2` („koln“ findet „Köln“). Bekannte Grenze: ß ≠ ss.
  Benutzereingaben gehen **nur** über `buildFtsQuery` (jedes Wort gequotet + Präfix-`*`), nie roh in
  MATCH. Treffer-Markierung über Steuerzeichen (`HIGHLIGHT_START/END`), nicht über HTML.
  Sprung zur Nachricht: `/chat/<id>?m=<messageId>`.
- **Server-Profile** (Migration 5: `server_profiles`, `app_settings` mit `activeServerId`): Startprofil
  „Dieser PC“ = http://localhost:11434. Adressen immer über `normalizeServerUrl` (`src/shared/server.ts`):
  ergänzt http:// und Port 11434, erlaubt nur http/https ohne Pfad/Zugangsdaten. Der Main-Prozess
  hält den Provider des aktiven Servers (`server-service.ts`); alle Aufrufe holen ihn über
  `getProvider()`. Eine laufende Antwort bleibt auf dem Server, auf dem sie gestartet wurde.
  Der letzte Server kann nicht gelöscht werden. Oberfläche signalisiert Wechsel per
  `notifyServerChanged()` → Statusanzeige prüft sofort.
- **Tastenkürzel**: Belegung und Erkennung in `src/renderer/shortcuts/keymap.ts` (reine Funktion
  `matchShortcut`, getestet). Ein globaler Handler in `AppLayout` verteilt sie; Komponenten melden sich
  mit `useShortcut(id, handler)` an. Kürzel für die Chat-Seite wechseln erst dorthin, der Auftrag
  wartet bis zu 1 s auf den Empfänger. Regeln: Strg-Kürzel nie mit Alt (AltGr = Strg+Alt bei
  deutscher Tastatur → @, €, { müssen tippbar bleiben). Eingabefelder, die Esc selbst nutzen,
  rufen `preventDefault()` – dann stoppt Esc keine Antwort. Electron-Standardmenü belegt bereits
  Strg+R/W/Z/A/0/+/-; nicht überschreiben.
- **Ordner** (Migration 6: `folders`, `chats.folder_id` mit `ON DELETE SET NULL`): eine Ebene, keine
  Unterordner. Ordner löschen behält die Chats („Ohne Ordner“). Verschieben per Ziehen
  (`CHAT_DRAG_TYPE`) oder Menü „Verschieben nach …“. Zugeklappte Ordner sind nur eine Ansichts-
  Vorliebe und liegen in localStorage, nicht in der Datenbank. Zuordnung in `groupChatsByFolder`.
- **Status-Seite** (`/status`): geladene Modelle über Ollama `/api/ps` (`Provider.listRunning`).
  GPU/CPU-Anteil = `size_vram / size` (wie `ollama ps`, geprüft: muse-glimmer:30b 78 % GPU auf 16 GB).
  Gemessen: qwen3:14b braucht mit 4K Kontext 9,7 GB, mit 32K 14,4 GB. Statusleiste unten zeigt das
  geladene Modell (orange, wenn teilweise auf CPU) und führt per Klick zur Status-Seite.
- **GPU-Messung** (`src/main/system/gpu.ts`): `nvidia-smi` per `execFile` mit festen Argumenten (keine
  Shell), 2 s Timeout, CSV-Parser `parseNvidiaSmi` getestet. Nur wenn der aktive Server lokal ist
  (`isLocalServer`), sonst `reason: 'remote'`. Fehlt nvidia-smi → `no-nvidia`.
- **Einheiten**: Arbeitsspeicher/VRAM binär mit `formatMemory` (1 GB = 1024³, wie Task-Manager → 16-GB-Karte
  zeigt 16,0 GB). Dateigrößen der Modelle dezimal mit `formatBytes` (wie `ollama list`).
- Regelmäßige Abfragen über `usePolling` (neueste Antwort gewinnt, sofort nach Serverwechsel).
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
- Phase 2: Organisation & Parameter ✅
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
