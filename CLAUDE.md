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
- **Modell-Download** (`download-service.ts`): Downloads laufen im Main-Prozess weiter, auch beim
  Seitenwechsel; Stand geht gedrosselt (max. alle 250 ms) per `downloads:changed` an alle Fenster.
  Ollama `/api/pull` meldet mehrere Schichten durcheinander → Summe in `applyPullChunk`
  (`src/shared/download.ts`). Modellnamen nur über `isValidModelName`. Tempo/Restzeit rechnet die
  Oberfläche (`utils/downloadSpeed.ts`, 5-s-Fenster). Abbruch lässt evtl. Teildaten bei Ollama
  liegen; ein erneuter Download setzt dort fort.
- **MCP-Server** (Migration 7: `mcp_servers` mit `kind` + `config_json`): In der DB steht nur die Art
  (bisher `filesystem`) und ihre Ordner – den Startbefehl baut `buildCommand` (`src/main/mcp/server-kinds.ts`)
  in fester Version (`@modelcontextprotocol/server-filesystem@2.0.1` via npx). Kein frei eintragbarer Befehl.
  Ordner: absolut, existierend (Prüfung in `mcp-service.ts`), kein ganzes Laufwerk, max. 10.
  `McpManager` startet/stoppt über das offizielle SDK (`@modelcontextprotocol/sdk` 1.32.2, stdio), merkt sich
  Tools (`readOnlyHint`/`destructiveHint` aus den Annotations; ohne Angabe = verändernd) und die letzten
  stderr-Zeilen. Eingeschaltete Server starten mit der App, `will-quit` stoppt alle.
  Unter Windows ist ein Server eine Kette aus 4 Prozessen (cmd → npx → cmd → node); Stoppen und normales
  Beenden räumen alle auf (geprüft). Auch bei hartem Beenden der App verschwinden sie, weil sich ein
  stdio-Server beendet, sobald seine Verbindung abreißt (geprüft).
- **Tool-Freigaben** (Migration 8: `mcp_tool_permissions`, Cascade mit dem Server): gespeichert werden nur
  Abweichungen vom Standard. Standard = `defaultPermission` (nur lesend → `always`, sonst `ask`),
  gültige Freigabe = `effectivePermission` (`src/shared/permissions.ts`) – Main (Ausführen) und
  Oberfläche (Anzeigen) nutzen dieselbe Funktion. `off` = Tool wird dem Modell nicht angeboten.
  Ein zerstörendes Tool auf `always` zu stellen, verlangt eine zusätzliche Rückfrage.
- **MCP pro Chat**: `ChatSettings.mcpServers` (Server-IDs, über `normalizeSettings` geprüft; leere Liste =
  keine Tools = nicht gespeichert). MCP-Button im Chat-Kopf und Auswahl im Vorlagen-Editor nutzen
  dieselbe Komponente `McpServerPicker`. Gelöschte Server-IDs bleiben in alten Chats stehen und werden
  beim Ausführen ignoriert.
- **Tool-Calling** (`src/main/tool-loop.ts`, `runAnswer`): pro Runde fragt die Schleife die angebotenen
  Tools neu ab (`McpTools.offered` in `mcp-service.ts`: nur laufende Server des Chats, ohne `off`), schickt
  sie mit (`ChatRequest.tools`), führt gewünschte Aufrufe nacheinander aus und gibt die Ergebnisse als
  `role: 'tool'` zurück. Höchstens `MAX_TOOL_ROUNDS` = 8 Tool-Runden, danach eine letzte Runde ohne Tools.
  Freigabe wird im Main geprüft: nicht angebotene Tools laufen nie (Fehler ans Modell), `ask` wartet auf
  `chat:tool-decision` (einmal / immer / ablehnen; „immer“ speichert `always`), Stopp = abbrechen.
  Tool-Fehler und Ablehnungen gehen als Ergebnistext ans Modell. Ergebnisse max. 20 000 Zeichen.
  Gleiche Tool-Namen mehrerer Server bekommen `_2` usw. (`nameTools`).
  Ollama-Format geprüft (0.40.11): `tool_calls` kommen fertig in einer Zeile, Argumente als Objekt;
  Ergebnis als `{role:'tool', tool_name, content}`.
  Speichern: Migration 9, `messages.tool_calls_json` (Liste `ToolCallRecord` an der Antwort).
  Für spätere Fragen baut `toRequestMessages` die Tool-Runden vor den Antworttext wieder auf.
  Wartende/laufende Aufrufe werden bei Stopp, Fehler und App-Absturz `cancelled` (`settleToolCalls`).
  Kontext: Die 14 Tools des Dateisystem-Servers kosten ~1300–1700 Tokens Eingabe (Ollama-Standard 4096).
  Relative Pfade löst der Dateisystem-Server im freigegebenen Ordner auf, nicht im Arbeitsordner (geprüft).
  Fehlertexte von Ollama übersetzt `describeChatError` (`src/main/chat-errors.ts`); Ladeabstürze
  (z. B. CUDA-Fehler bei vollem VRAM) bekommen einen Hinweis, die Originalmeldung bleibt angehängt.
  Abschlusstest Phase 4 (Ollama 0.40.11): qwen3:14b, gpt-oss:20b, gemma4:12b je Lesen/Schreiben mit
  Freigabe/Ablehnen ✓; Stopp während Rückfrage, „Immer erlauben“, Folgefrage mit Tool-Verlauf,
  hartes Beenden während Rückfrage (→ `cancelled`, kein Prozessrest) ✓.
  Noch nicht von Hand geprüft: Windows-Ordnerdialog beim Einrichten, MCP-Start in der installierten App.
- **RAG-Grundlage** (Phase 5): Embedding-Modell `qwen3-embedding:0.6b` (639 MB, 1024 Zahlen, von Ollama
  schon auf Länge 1 normiert). `Provider.embed` → Ollama `/api/embed` mit `keep_alive: '1m'` (VRAM schnell
  wieder frei für das Chat-Modell; erstes Laden dauerte 12 s). Abschnitte (`src/main/rag/chunk.ts`):
  ~1500 Zeichen, 200 Überlappung, Schnitt an Absatz > Zeile > Satz > Wort. Markdown wird zuerst an
  Überschriften getrennt (`chunkMarkdown`), sonst mischen Abschnitte Themen und werden „verwaschen“
  (gemessen: „Wo liegen meine Daten?“ fiel aus den Top 6, danach Platz 1); die Überschriften kommen beim
  Einbetten vor den Text (`embeddingText`). Vektoren als Float32-BLOB (4 KB/Abschnitt), Suche per
  Skalarprodukt in JS (`src/main/rag/vectors.ts`): 20 000 Abschnitte in ~30 ms – keine Vektor-DB nötig.
  Suchfragen bekommen bei Qwen3-Embedding die Anweisung des Herstellers vorangestellt (`queryText`),
  Dokumente nicht (Test: 8/8 mit und ohne, mittlerer Abstand 0,274 statt 0,235).
  Schwache Treffer (z. B. 0,45, wenn die Antwort im Text gar nicht steht) später per Schwelle weglassen.
- **Modell löschen**: Ollama `DELETE /api/delete`; nur mit gültigem Namen und immer mit Rückfrage
  (nennt Größe, sagt „endgültig“, Chats bleiben). Chats mit gelöschtem Modell bleiben lesbar.
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
- Phase 3: Modelle & Status ✅
- Phase 4: MCP & Tool-Calling ✅
- Phase 5: Wissen (RAG) & Projekte – in Arbeit. Entschieden: Dateiarten txt/md, PDF (Text, kein OCR),
  docx, Quellcode · Ordner werden Projekte (Anweisungen + eigene Dokumente; Projekt-Anweisungen und
  Chat-Systemprompt gelten beide) · zusätzlich Sammlungen per Wissen-Knopf pro Chat (auch in Vorlagen) ·
  Dateien bleiben am Ort, „Neu einlesen“ per Knopf (nur Geänderte) · Suche automatisch vor jeder Antwort ·
  Quellen als [1] + Liste, Öffnen im Standardprogramm · Seitenbereich: Quellen / Projekt-Dateien /
  Kontext-Füllstand · zu voll → warnen + Knopf „Kontextlänge erhöhen“.
  Schritte: 1 Grundlage ✅ · 2 Sammlungen (Text/MD/Code) · 3 PDF/Word · 4 Wissen im Chat · 5 Projekte ·
  6 Seitenbereich · 7 Abschlusstest
- Phase 6: Memory/Obsidian
- Phase 7: Installer & Update-Check

## Befehle

- `npm start` – Entwicklungsmodus · `npm test` – Vitest (Tests in `tests/`) · `npm run typecheck` · `npm run lint` · `npm run make` – Installer
- Shell-Hinweis: Nach der Node-Installation kennt eine alte Shell `node` evtl. noch nicht (PATH neu laden).
- Commit-Nachrichten mit deutschen Anführungszeichen („…“) oder Umlauten über die Bash mit
  `git commit -F -` und Heredoc schreiben – PowerShell 5.1 verstümmelt sie bzw. der Commit schlägt fehl.
