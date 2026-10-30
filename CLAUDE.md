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
- Beim Programmieren (Karpathy-Leitlinien, vom Nutzer 2026-10-30 festgelegt):
  1. **Erst denken:** Annahmen nennen, bei mehreren Deutungen nachfragen statt still wählen,
     einfachere Wege ansprechen.
  2. **So einfach wie möglich:** nur was verlangt ist; keine Abstraktion für Einmaliges, keine
     „Flexibilität“ auf Vorrat, keine Fehlerbehandlung für Unmögliches.
  3. **Nur Nötiges ändern:** keinen benachbarten Code „verbessern“, Stil übernehmen; selbst
     verursachte Reste aufräumen, fremden toten Code nur nennen.
  4. **Prüfbare Ziele:** Aufgabe als prüfbares Ziel formulieren (z. B. erst Test, dann Code) und
     erst fertig melden, wenn es geprüft ist.

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
- **Wissenssammlungen** (Migration 10: `collections`, `documents`, `chunks`; Cascade): Quellen = Ordner
  oder Dateien am Ort (`KnowledgeRepository`, Prüfung wie MCP: absolut, kein Laufwerk, max. 20). Jede
  Sammlung merkt sich ihr Embedding-Modell (nur beim Anlegen gesetzt). Dateisuche (`src/main/rag/files.ts`):
  Unterordner ja, Symlinks nein, ohne `node_modules`/`dist`/`build`/versteckte Ordner, Lock-Dateien und
  `.min.js`; nur bekannte Endungen; max. 2 MB/Datei, 10 000 Dateien; Null-Byte = Binärdatei; kein
  gültiges UTF-8 → Windows-1252. Einlesen (`src/main/rag/indexer.ts`): unverändert = gleiche Größe +
  Zeit; nur Zeit neu → SHA-256 vergleichen; Datei mit allen Abschnitten in einer Transaktion
  (nie halb); Fehler einer Datei → Status bei der Datei; Embedding-Fehler (Ollama aus, Modell fehlt) →
  ganzes Einlesen stoppt; nicht erreichbare Quelle → ihre Dokumente bleiben. Dateiname steht vorne im
  Überschriften-Pfad. Nur eine Sammlung gleichzeitig (`knowledge-service.ts`), Fortschritt gedrosselt
  wie Downloads. Gemessen: 100 Dateien/367 Abschnitte in 10,7 s; Neu einlesen mit 3 Änderungen 0,4 s.
- **PDF und Word** (`src/main/rag/extract.ts`): `pdfjs-dist` 6.4.299 (Apache-2.0, Legacy-Build für Node)
  und `mammoth` 1.13.0 (BSD-2), beide mit fester Version (fremde Dateien = Angriffsfläche; Updates
  bewusst). Auslesen in einem eigenen Thread (`extract-worker.ts`, eigener Build-Eintrag in
  `forge.config.mts`, gebaut als `extract-worker.cjs`): blockiert den Main-Prozess nicht, und eine
  hängende Datei wird nach 60 s beendet (`WorkerExtractor`, Thread wird neu gestartet). Prüfsumme wird
  vorher im Main berechnet → unveränderte PDFs werden nicht ausgelesen. pdf.js bekommt seinen Worker
  über `globalThis.pdfjsWorker` (sonst sucht es eine Datei, die es im Paket nicht gibt) und immer ein
  reines `Uint8Array` (Node-Buffer lehnt es ab). PDF: Abschnitte pro Seite, Spalte `chunks.page`
  (Migration 11), Überschrift „datei.pdf › S. 12“; Silbentrennung am Zeilenende wird zusammengefügt.
  Ohne Text (Scan) → Status `empty` mit Hinweis; kaputt → `error`. Word: mammoth-HTML → Markdown
  (Überschriften als `#`, Bilder ignoriert), dann `chunkMarkdown`. Grenze 50 MB, nur `.docx` (kein `.doc`).
  pdf.js kennt keine `isEvalSupported`-Option mehr; der Weg der Lücke CVE-2024-4367 ist entfernt
  (geprüft: kein `eval`/`new Function` im Code). Das optionale native `@napi-rs/canvas` wird nie
  geladen (im gebauten Code findet pdf.js kein `require`) und ist nicht im Paket (geprüft: keine
  `.node`-Dateien in `out/`). Gemessen (dev und gebaut gleich): 6 Dateien/107 Abschnitte in ~4 s.
- **Wissen im Chat** (`ChatSettings.collections`, Wissen-Knopf = `KnowledgeButton`, Auswahl auch in
  Vorlagen; beide Kopf-Knöpfe teilen sich `PickerButton`). Vor jeder Antwort sucht `KnowledgeSearch`
  (`src/main/rag/search.ts`): Fingerabdruck-Suche über alle Abschnitte der Sammlungen (im Speicher
  gehalten, neu geladen wenn `KnowledgeRepository.version` sich ändert) + Stichwortsuche (FTS5
  `chunks_fts`, Migration 12; Inhaltswörter einzeln mit ODER, Füllwörter raus – `contentWords`),
  zusammengeführt per Reciprocal Rank Fusion (k = 60), höchstens 6 Stellen. Schwellen (gemessen an
  16 Fragen DE/EN, PDF/Word/MD: richtige ab 0,43, ohne Antwort ≤ 0,22): Ähnlichkeit ≥ 0,35 und
  ≥ 70 % des besten Treffers (Stichwort-Treffer ≥ 50 %). Suche + Einbetten der Frage ~20–40 ms.
  Gefundenes geht nur in diese eine Anfrage (`withKnowledge`: Auszüge mit [n] vor der Frage, Anweisung
  „ehrlich sagen, wenn nicht beantwortet“); gespeichert wird die Frage ohne Auszüge, dazu die Quellen
  an der Antwort (`messages.sources_json`, Ereignis `sources`). Suchanfrage (`knowledgeQuery`): die
  Frage; nur wenn sie ≤ 1 Inhaltswort hat („Und was noch?“) zusätzlich die vorige Frage – nach Länge
  zu entscheiden zog im Test bei Themenwechsel („WM 2014“ nach Apache-Frage) falsche Quellen.
  Suchfehler (Modell fehlt, Ollama aus) → Antwort ohne Wissen mit Hinweis (`knowledgeError`).
  Anzeige: [n] im Text werden per Markdown-Plugin (`citations.ts`) zu Knöpfen (nur Nummern, die es
  gibt; nicht in Code/Links), Quellenliste aufklappbar mit Textstelle, „Öffnen“ (`openDocument`): nur
  Dateien aus Sammlungen; PDF/Word/Text im Standardprogramm, alles andere nur im Explorer zeigen
  (Skripte würden sonst ausgeführt). Live: qwen3, gpt-oss, gemma4 zitieren korrekt; ~1850 Prompt-Tokens
  bei 6 Quellen. „Öffnen“ selbst nicht automatisch getestet (öffnet echte Programme).
- **Projekte** (Migration 13): Die Ordner sind jetzt Projekte – derselbe Datensatz (`folders`) mit
  `instructions` und optional einer eigenen Sammlung (`collections.project_id`, eindeutig, CASCADE beim
  Löschen des Projekts; Chats bleiben wie bisher per SET NULL). Ohne Anweisungen/Dokumente = Ordner wie
  vorher, nichts wurde umgewandelt. Projekt-Sammlungen entstehen erst beim ersten Hinzufügen von Quellen
  (`ensureProjectCollection`), heißen wie das Projekt (Umbenennen zieht nach) und erscheinen nicht auf
  der Seite „Wissen“ oder im Wissen-Knopf (Filter `projectId`). Im Chat: `buildChatRequest` stellt die
  Projekt-Anweisungen vor den Systemprompt des Chats – in EINER System-Nachricht (manche Modelle
  beachten nur die erste); die Projekt-Sammlung wird immer durchsucht, plus die per Wissen-Knopf
  gewählten. Projekt-Seite `/projects/:id` (Name, Anweisungen speichern beim Verlassen, Dokumente mit
  denselben Bausteinen wie die Wissen-Seite aus `CollectionEditor.tsx`, Chats, „Neuer Chat im
  Projekt“ → `/chat?project=<id>` → `ChatSendRequest.folderId`). Chat-Kopf zeigt „Projekt: …“,
  Seitenleiste einen Punkt bei Projekten mit Anweisungen/Dokumenten. Löschen bricht ein laufendes
  Einlesen der Projekt-Sammlung ab. Live (gemma4): Anweisungen + Chat-Systemprompt wirken beide,
  Projekt-Dokumente werden zitiert, Umbenennen/Löschen wie beschrieben.
- **Seitenbereich** (`SidePanel.tsx`, Knopf im Chat-Kopf; schließt sich gegenseitig mit dem
  Einstellungs-Panel aus): Reiter Quellen (letzte Antwort mit Wissen, aufgeklappt), Projekt (Anweisungen,
  Projekt-Dokumente mit Stand und „Neu einlesen“), Kontext. Kontext-Füllstand (`src/shared/context.ts`,
  `useContextUsage`): Schätzung je Teil (Anweisungen, Verlauf inkl. Tool-Runden, Wissen = Auszüge der
  letzten Antwort bzw. typische 6 × 1500 Zeichen, Tools = JSON der angebotenen MCP-Tools) gegen
  `settings.contextLength` bzw. Ollama-Standard 4096. Faktoren gemessen mit qwen3: Text ~4 Zeichen/Token,
  JSON ~5,5 (mit 3,5 für alles lag die Schätzung bis 50 % zu hoch → Fehlalarm); danach 1856 geschätzt vs.
  1917 gemessen. Stufen: ok / tight (< 1024 frei für die Antwort) / full; Punkt am Kopf-Knopf auch bei
  geschlossenem Bereich. „Kontextlänge erhöhen“ → nächste Stufe (`suggestContextLength`, gedeckelt auf
  das Modell-Maximum), dazu Speicher-Schätzung: KV-Cache pro Token aus Ollama `/api/show` `model_info`
  (`kvBytesPerToken`: Schichten × KV-Köpfe × (Schlüssel + Wert) × 2 Byte × 1,2; Sliding-Window-Schichten
  zählen nicht). Gemessen 4K→16K: qwen3 174 KB/Token (Schätzung 192), gemma4 21 KB (19), gpt-oss ~1 KB
  (Sliding Window ohne Schicht-Angabe → „nicht vorhersagbar“). Freier Grafikspeicher aus nvidia-smi.
  Gemessene Tokens der letzten Antwort werden daneben angezeigt; am Limit → Hinweis „abgeschnitten“.
  Kopfzeile: Titel `min-w-24 flex-1`, Modellauswahl darf schrumpfen – sonst verschwand der Titel bei
  offenem Seitenbereich. `/api/ps` meldet bei gemma4 nur ~1,1 GB Größe (Gewichte anders gezählt) – nicht
  für Schätzungen verwenden.
- **Obsidian-Vault** (Phase 6): Vault-Pfad und Unterordner (Standard `LocalDesk`) in `app_settings`
  (`obsidian.vault`, `obsidian.folder`; `AppSettingsRepository`), Einstellungen → Obsidian. Prüfung
  (`inspectVault`): absolut, kein Laufwerk, existiert; `.obsidian` vorhanden → „Vault erkannt“, sonst Hinweis.
  Unterordner nur ein einfacher Name (`checkFolderName`). LESEN darf der ganze Vault, SCHREIBEN nur
  `VaultWriter` (`src/main/obsidian/vault.ts`): jeder Pfad wird gegen den Unterordner geprüft (kein `..`,
  nicht absolut), kein Teil des Weges darf eine Verknüpfung sein (Junctions getestet), nie überschreiben
  (Name (2), (3) …), Dateinamen ohne Windows-/Obsidian-Sonderzeichen (`# ^ [ ] |`, CON/NUL …), atomar
  über Zwischendatei + Umbenennen (Sync-Dienste sehen keine halbe Datei). Löschen/Ändern nur eigener
  `.md` im Unterordner. Einrichten schreibt nichts in den Vault; der Unterordner entsteht beim ersten
  Speichern. Entwicklung/Tests nur mit Test-Vault im Scratchpad – nie den echten Vault des Nutzers.
  Dateinamen beginnen nie mit Punkt (Obsidian blendet solche Dateien/Ordner aus).
- **Erinnerungen** (`src/main/obsidian/memories.ts`, `MemoryStore`): eine Notiz pro Fakt, global in
  `<Unterordner>/Erinnerungen/`, pro Projekt in `Projekte/<Name>/Erinnerungen/`. Frontmatter: Tag
  `localdesk/erinnerung`, `erstellt`, bei Projekten `projekt` + `projekt-id` – zugeordnet wird über die
  ID (überlebt Umbenennen/Verschieben). Gelesen wird bei jeder Anfrage frisch (Änderungen in Obsidian
  gelten sofort); Notizen ohne Kopf gehen auch. Max. 500 Zeichen pro Fakt. Löschen nur in
  Erinnerungs-Ordnern (`isMemoryPath`). Im Chat (`ChatMemory.forChat` in `obsidian-service.ts`): globale
  und die des Projekts; passen alle in ~1500 Tokens (`MEMORY_TOKEN_BUDGET`), alle, sonst nach Ähnlichkeit
  zur Frage (Fingerabdrücke pro Text zwischengespeichert), ohne Ollama die neuesten (`selectMemories`).
  Kommen VORNE in die System-Nachricht (`withMemories`, vor Projekt-Anweisungen und Systemprompt), mit
  dem Hinweis, sie zu nutzen, aber nicht ungefragt aufzuzählen; die Wissenssuche baut darauf auf
  (Fehler gefunden: sie baute zuerst auf der Anfrage OHNE Erinnerungen auf). Kein Vault / nicht
  erreichbar → Chat läuft ohne Erinnerungen. Einstellungen → Obsidian: Liste (global / je Projekt),
  hinzufügen, öffnen, löschen. Kontext-Füllstand: Anteil „Erinnerungen“. Live (gemma4): globale ohne
  Projekt ✓, Projekt-Erinnerung nur im Projekt ✓, Änderung der Notiz wirkt sofort ✓, 64 Erinnerungen →
  gefragte ausgewählt, 1416 Tokens gemessen (geschätzt 1451) ✓.
- **Merken im Chat** (`src/main/obsidian/memory-tool.ts`): eingebautes Werkzeug `save_memory`
  (Server-ID `localdesk:memory`, kein MCP), nur angeboten, wenn ein Vault eingerichtet ist UND das
  Modell laut Ollama `tools` kann. Fragt immer nach (`permission: 'ask'`); über `editable` darfst du
  den Text (und im Projekt das Ziel global/projekt) in der Karte ändern – die Tool-Schleife prüft die
  geänderten Eingaben mit `checkArguments`, ignoriert sie bei normalen Werkzeugen und kennt bei
  bearbeitbaren kein „Immer erlauben“. IPC `chatToolDecision(callId, decision, args?)`. Dazu Knopf
  „Merken“ (beim Überfahren) an jeder Nachricht → Editor mit dem Nachrichtentext zum Kürzen.
  Live: gemma4 schlägt vor, bearbeiteter Text gespeichert ✓; qwen3 „Merk dir“ → Ablehnen, nichts
  gespeichert ✓; gemma4 im Projekt schlägt Ziel „projekt“ vor ✓; Merken-Knopf ✓; ohne Vault kein
  Werkzeug, kein Knopf ✓. muse-glimmer schlug bei einem Klausurdatum nichts vor (Modellsache).
  gpt-oss:20b stürzt derzeit in Ollama selbst ab (CUDA-Fehler auch bei leerem VRAM), nicht getestet.
- **Chats speichern** (`src/main/obsidian/chat-notes.ts`, IPC `saveChatNote(chatId, answerId?)`): Main
  liest den Chat aus der DB (nicht vom Renderer) und schreibt über `VaultWriter.writeNote` nach
  `<Unterordner>/Chats/<JJJJ-MM-TT> <Titel>.md` – nie überschreiben, gleicher Name → „(2)“. Inhalt:
  Frontmatter (`tags: [localdesk/chat]`, `erstellt` in Ortszeit, `modell`, `projekt`, `chat-id`),
  `# Titel`, je „## Frage“ / „## Antwort (Modell)“, unter jeder Antwort ihre Quellen (eigene
  Nummerierung pro Antwort). Gedanken und Tool-Aufrufe bleiben draußen; ein „…“ am Ende gekürzter
  Titel fällt im Dateinamen weg. Knöpfe: „In Obsidian speichern“ unter jeder Antwort (Antwort + Frage,
  beim Überfahren), Notiz-Symbol im Chat-Kopf (ganzer Chat); Rückmeldung unten rechts (`fixed`, weil
  der Kopf `overflow-hidden` hat). Nur mit Vault. Live (gemma4, mit Quellen) ✓, „(2)“/„(3)“ ✓.
- **Zusammenfassungen** (`src/shared/summary.ts`, `src/main/summary-service.ts`,
  `obsidian/summary-notes.ts`, Oberfläche `SummaryPanel.tsx`). Entschieden: Vorschlagskarte beim
  ÖFFNEN eines Chats mit ≥ 6 Nachrichten, letzte Nachricht ≥ 30 Min alt (`shouldSuggestSummary`);
  nach Speichern, „Nein danke“ oder „Verwerfen“ merkt sich der Chat die Nachrichtenzahl
  (Migration 14: `chats.summary_at_count`, `markSummarized` ändert `updated_at` NICHT) – Karte erst
  nach 6 neuen Nachrichten wieder. Zusammengefasst wird mit dem Modell im Chat-Kopf, Denken aus
  (gpt-oss: „low“), Kontextlänge des Chats; das Gespräch ohne Gedanken/Tools, höchstens die letzten
  24 000 Zeichen. Erste Zeile der Antwort = Titel (`parseSummary`). Entwurf bearbeitbar (Titel =
  Dateiname, Text), „Neu erzeugen“, „Verwerfen“; gespeichert nach `<Unterordner>/Zusammenfassungen/`
  (Tag `localdesk/zusammenfassung`). Knopf im Chat-Kopf startet sofort. Eine neue Anfrage bricht die
  alte ab (Map pro Chat); die Oberfläche zeigt nur das Ergebnis der neuesten (Ref-Zähler) und startet
  nur einmal, auch wenn React im Dev-Modus Effekte doppelt ausführt (Fehler gefunden: kurz „Abgebrochen“).
  Live: gemma4 Entwurf → Titel geändert → gespeichert ✓; qwen3 ohne Denken (15 s) ✓; Karte nach
  31 Min Ruhe ✓, „Nein danke“ → bleibt weg ✓, frischer Chat → keine Karte ✓.
- **Vault als Wissen**: Sammlung „Obsidian“ = normale Sammlung mit `kind = 'obsidian'` (Migration 15,
  höchstens eine). `KnowledgeRepository.syncObsidianCollection` legt sie beim Einrichten des Vaults an,
  stellt bei neuem Vault die Quelle um (gleiche ID; laufendes Einlesen wird dann abgebrochen) und
  entfernt sie beim „Vergessen“ (nur eingelesene Daten). Beim Start abgeglichen (`main.ts`,
  `onVaultChanged`). Eingelesen wird erst auf Klick („Einlesen“), nicht automatisch – kostet GPU-Zeit.
  Über die Wissen-Seite nicht umbenenn-/lösch-/änderbar (`saveCollection` lehnt ab, UI zeigt Hinweis).
  Aufbereitung `rag/obsidian-note.ts` (nur .md dieser Sammlung): Frontmatter raus, Tags (Kopf + `#tag`
  im Text) als „Datei.md (Tags: …)“ im Überschriften-Pfad, `[[Ziel#Abschnitt|Alias]]` → Alias bzw.
  „Ziel › Abschnitt“, `%%Kommentare%%` und eingebettete Bilder raus. LocalDesk-Erinnerungen (Tag
  `localdesk/erinnerung`) werden als „leer“ übersprungen – sie stehen schon in jedem Chat; Chats und
  Zusammenfassungen sind durchsuchbar. Dot-Ordner (`.obsidian`, `.trash`) übersprang `scanSources`
  schon. „Öffnen“: `.md` aus dieser Sammlung → `obsidian://open?path=…`, wenn das Protokoll registriert
  ist (`app.getApplicationNameForProtocol`), sonst Standardprogramm. Bekannt: Kennt Obsidian den Vault
  nicht, zeigt Obsidian selbst eine Meldung (kein Rückfall möglich, der Aufruf „gelingt“).
  Live (gemma4): 5 Dateien, `.obsidian` übersprungen, Erinnerung ausgelassen ✓, Abschnitte ohne
  Kopf/Kommentar/Bild mit Tags ✓, Wissen-Knopf → richtige Quelle ✓, Neu einlesen: 1 geändert, 4
  unverändert ✓, Vergessen → Sammlung weg ✓. „Öffnen“ in Obsidian nicht selbst geklickt (würde dein
  Obsidian starten) – von Hand prüfen.
- **Modell löschen**: Ollama `DELETE /api/delete`; nur mit gültigem Namen und immer mit Rückfrage
  (nennt Größe, sagt „endgültig“, Chats bleiben). Chats mit gelöschtem Modell bleiben lesbar.
- **GPU-Last** über `nvidia-smi` (nur bei lokalem Ollama); geladene Modelle/VRAM über Ollama `/api/ps`.
- **Netzwerk**: nur Ollama-Server (lokal/LAN), Modell-Downloads über Ollama, Update-Prüfung nur per Knopf,
  und (Phase 11, vom Nutzer freigegeben) Gmail: nur `accounts.google.com`, `oauth2.googleapis.com`,
  `gmail.googleapis.com` über HTTPS, erzwungen in `mail/mail-fetch.ts`. Keine Telemetrie.
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
- Phase 5: Wissen (RAG) & Projekte ✅. Entschieden: Dateiarten txt/md, PDF (Text, kein OCR),
  docx, Quellcode · Ordner werden Projekte (Anweisungen + eigene Dokumente; Projekt-Anweisungen und
  Chat-Systemprompt gelten beide) · zusätzlich Sammlungen per Wissen-Knopf pro Chat (auch in Vorlagen) ·
  Dateien bleiben am Ort, „Neu einlesen“ per Knopf (nur Geänderte) · Suche automatisch vor jeder Antwort ·
  Quellen als [1] + Liste, Öffnen im Standardprogramm · Seitenbereich: Quellen / Projekt-Dateien /
  Kontext-Füllstand · zu voll → warnen + Knopf „Kontextlänge erhöhen“.
  Schritte: 1 Grundlage ✅ · 2 Sammlungen (Text/MD/Code) ✅ · 3 PDF/Word ✅ · 4 Wissen im Chat ✅ · 5 Projekte ✅ ·
  6 Seitenbereich ✅ · 7 Abschlusstest ✅
  Abschlusstest (Ollama 0.40.11): 9 Dateien (2 PDF, Word, Markdown, 3 × Code, Text) in 3 s; qwen3,
  gpt-oss, gemma4 je 6 Fragen aus Projekt-Dokumenten + Wissenssammlung + eine ohne Antwort → 18/18
  richtige Quellen und Zitate. Gebaute App: Einlesen im Worker aus app.asar, Projekt-Chat mit Quellen aus
  beiden, Seitenbereich ✓. Anweisung vor Suchfragen nachgeprüft (16 Fragen inkl. Code): mit 13/16 auf
  Platz 1, 16/16 unter den ersten 3, Abstand 0,100 – ohne 13/16, 16/16, 0,091 → bleibt.
  Beobachtet: Verlangt eine Projekt-Anweisung „immer Quelle nennen“, schreiben Modelle auch ohne Quellen
  Nummern wie [1] (werden dann keine Knöpfe; Hinweis „keine passenden Stellen“ steht darunter).
  gpt-oss erfand bei einer Code-Frage ein Detail, obwohl die richtige Stelle unter den Quellen war.
  Noch nicht von Hand geprüft: Windows-Datei-/Ordnerdialoge, „Öffnen“-Knopf einer Quelle.
- Phase 6: Memory/Obsidian ✅ abgeschlossen. Entschieden: alle vier Zwecke (Fakten über dich merken,
  Antworten/Chats als Notiz speichern, Vault als Wissen, Chat-Zusammenfassungen) · lesen ganzer Vault,
  schreiben nur eigener Unterordner · Merken: Modell schlägt vor (Werkzeug), du bestätigst · Fakten immer
  alle im Chat solange ≤ ~1500 Tokens, sonst nur passende · Erinnerungen global + pro Projekt ·
  Zusammenfassung als Vorschlag-Karte · Vault als Sammlung per Wissen-Knopf.
  Schritte: 1 Vault & sicheres Schreiben ✅ · 2 Erinnerungen ✅ · 3 Merken im Chat ✅ · 4 Chats speichern ✅ ·
  5 Zusammenfassungen ✅ · 6 Vault als Wissen ✅ · 7 Abschlusstest ✅
  Abschlusstest (Ollama 0.40.11, Test-Vault): gemma4, qwen3, gpt-oss je über die Oberfläche: Fakt
  erzählen → Vorschlag → speichern; neuer Chat nutzt ihn; „Merk dir für dieses Projekt …“ → Ziel
  „projekt“ vorgeschlagen; neuer Projekt-Chat kennt das Datum, Chat außerhalb nicht („weiß ich
  nicht“); Chat gespeichert („(2)“, „(3)“ bei gleichem Namen); Zusammenfassung erzeugt und gespeichert;
  Vault-Suche → Median.md als Quelle 1 → 3 × 7/7. Gebaute App: Vault, Einlesen im Worker aus app.asar,
  Chat mit Erinnerung + Vault-Wissen, Zusammenfassung, Chat-Notiz ✓.
  Beobachtet: Was gemerkt wird, wählt das Modell – qwen3 nahm nur „lerne mit Code-Beispielen“, gpt-oss
  nur „studiere Informatik“, gemma4 beides (der Text ist in der Karte änderbar). muse-glimmer schlug in
  Schritt 3 nichts vor. gpt-oss stürzte in Schritt 3 in Ollama ab (CUDA), lief im Abschlusstest wieder.
  Gefunden und behoben: Erinnerungen trugen das Datum in UTC (kurz nach Mitternacht der Vortag) → Ortszeit.
  Noch von Hand zu prüfen: „Öffnen“ einer Vault-Quelle in Obsidian (mit deinem echten Vault).
- Phase 8: Moderne Oberfläche ✅ abgeschlossen. Entschieden (2026-10-28): Entwurf B „Arbeitsplatz“ (Symbolleiste
  links, Chatliste daneben, Kopfzeile mit allen Aktionen als Symbole, Seitenbereich rechts als feste Spalte,
  Wissen/Werkzeuge als Schalter im Eingabefeld) · Hell + Dunkel + Schalter (System/Hell/Dunkel) · Akzent Blau
  des Symbols · Schrift Inter mitgeliefert (@fontsource-variable/inter 5.3.0, OFL-1.1), Code: Cascadia Mono.
  Schritte: 1 Grundlage ✅ · 2 Rahmen & Navigation ✅ · 3 Chat-Seite ✅ · 4 übrige Seiten ✅ · 5 Prüfen ✅ · 6 Doku ✅
  Grundlage: Token-NAMEN bleiben (bg, surface, border, text, muted, accent …), nur Werte neu; neu: surface-2,
  sidebar, subtle, accent-text, bubble, shadow-card. Radien per `--radius-*` (sm 8 px … 2xl 20 px); Tailwinds
  `rounded` ist fest 4 px und per Token nicht änderbar → eigene `.rounded`-Regel in `@layer utilities` nach
  Tailwind (`@utility` greift für eingebaute Klassen nicht). Farbschema: `appearance-service.ts` setzt
  `nativeTheme.themeSource` (gespeichert als `appearance.theme`), CSS folgt per prefers-color-scheme;
  Einstellungen → Darstellung. Geprüft: Inter geladen, Radien, Umschalten sofort, Wahl gespeichert ✓.
  (Die damalige Notiz „index.html hat keine CSP“ war falsch: Die CSP wird beim Bauen eingefügt,
  siehe Phase 13 Schritt 2.)
  Rahmen: `NavRail.tsx` (ersetzt Sidebar) – 60 px Symbolleiste, Namen im Tooltip, Punkt am Status-Symbol
  (Ollama erreichbar), unten Hell/Dunkel-Knopf (System → Hell → Dunkel) und Einstellungen; `useTheme` hält
  Leiste und Einstellungen per Fenster-Ereignis gleich. Ausführlicher Ollama-Status (`StatusPill`) unten in
  der Chatliste. Strg+B klappt jetzt die CHATLISTE ein (Zustand im AppLayout, an Seiten per
  `useOutletContext<LayoutContext>`), „Ausklappen“ dann links im Chat-Kopf (`PageHeader.leading`).
  Chats ohne Projekt nach Tagen (`chat/days.ts`: Heute, Gestern, 7 Tage, 30 Tage, Älter – Kalendertage in
  Ortszeit); der Bereich heißt jetzt „Chats“ und bleibt Ziel fürs Herausziehen aus Projekten.
  Chat-Seite: Kopf = Titel, Projekt-Chip, In Obsidian speichern, Zusammenfassen, Modell-Pille (natives
  select in einem label mit grünem Punkt), Chat-Einstellungen, Seitenbereich – alles 32-px-Symbolknöpfe.
  Wissen und Werkzeuge sind KEINE Kopf-Knöpfe mehr, sondern Schalter in der Leiste unter dem Eingabefeld
  (`ChatInput.tools`; `PickerButton` als Pille mit `chipText`, Auswahl klappt nach oben auf). Nachrichten:
  Spalte 820 px, deine Nachricht als Sprechblase (`bg-bubble`), Antwort mit Modell-Zeichen, Gedanken/
  Werkzeug-Zeilen/Quellen als weiche Flächen, Statistik in `text-subtle`; Karten (Rückfrage, Merken,
  Zusammenfassung) einheitlich `rounded-xl border-accent/40 bg-accent-soft/50`. Seitenbereich und
  Chat-Einstellungen 310 px auf `bg-bg` mit Reitern als Segmente. Erinnerungen in der Werkzeug-Zeile ohne
  Monospace. Geprüft: echter Chat (gemma4, Vault-Wissen, Merken-Karte, Quellen, Seitenbereich) hell+dunkel,
  Strg+L/K/J/,/B und Strg+/ ✓.
  Übrige Seiten: Monospace NUR noch für Pfade, Adressen, Befehle, Werkzeug-/Dateinamen, Tasten und Code
  (13 Stellen); Modellnamen, Zahlen, Daten in Inter mit `tabular-nums`. Listen-Spalten bei Wissen/Vorlagen
  wie die Chatliste (270 px, blauer Hauptknopf, weiche Zeilen). Karten (Kästen mit Innenabstand bzw. um
  Tabellen/Listen) `rounded-xl`, Felder/Knöpfe `rounded` (8 px). Einstellungen mit Sprungliste links
  (ab Breite lg, `sticky`); Markierung per IntersectionObserver – der meldet nur ÄNDERUNGEN, daher eine
  Menge aller sichtbaren Abschnitte führen und den obersten markieren (Fehler gefunden: markierte den
  falschen).
  Prüfung: Kontraste nach WCAG nachgerechnet (Text ≥ 4,5, Bedienelemente ≥ 3) – gefunden und behoben:
  `subtle` zu blass (hell 2,8 → #687080 4,56; dunkel → #848d9c 4,88) und im Dunkelmodus Weiß auf Blau nur
  3,23 → Akzent #356fe6 (4,60); blaue SCHRIFT nimmt deshalb immer `text-accent-text` (20 Stellen umgestellt),
  `accent` ist nur noch Fläche/Rahmen. Jetzt alle Paare ok in beiden Modi. Tastatur: echte Tab-Drücke über
  das Entwicklerprotokoll – logische Reihenfolge (Leiste → Chatliste → Kopf), überall 2-px-Fokusrahmen ✓.
  Echter Chat mit Werkzeug-Rückfrage (Dateisystem-MCP, „Einmal erlauben“, Datei geschrieben) hell/dunkel ✓.
  Gebaute App: Inter aus app.asar geladen, Radien, Leiste, Logo, Farbschema ✓.
- Phase 9: Skills ✅ abgeschlossen. Entschieden (2026-10-28): Ordner + Editor in der App (je Skill ein Ordner mit
  SKILL.md im Claude-Format unter `%APPDATA%\LocalDesk\skills\`) · Aktivierung von Hand (Schalter „Skills“
  im Eingabefeld) UND automatisch (Liste Name+Beschreibung + Werkzeug „Skill laden“, nur Tool-Modelle) ·
  voreinstellbar in Projekten und Vorlagen · 4 deutsche Beispiel-Skills beim ersten Start. Skills sind NUR
  Text: nichts wird ausgeführt, keine Werkzeug-Rechte.
  Schritte: 1 Grundlage ✅ · 2 Seite „Skills“ ✅ · 3 Schalter im Chat ✅ · 4 automatisch ✅ · 5 Projekte & Vorlagen ✅ ·
  6 Test & Doku ✅
  Grundlage: Format/Prüfung in `shared/skills.ts` (Name ≤ 80, Beschreibung ≤ 300, Anleitung ≤ 20 000
  Zeichen; Kopf immer in Anführungszeichen geschrieben; ohne Kopf = Ordnername als Name). `SkillStore`
  (`main/skills/skill-store.ts`): Kennung = Ordnername aus dem Namen (`skillIdFromName`, ä→ae …, „-2“ bei
  Gleichstand), bleibt beim Umbenennen; nur Kennungen `[a-z0-9-]`, keine Verknüpfungen (lstat, getestet
  mit Junction), sicheres Schreiben über `atomicWrite` (aus vault.ts); Löschen entfernt nur SKILL.md und
  den Ordner nur, wenn er dann leer ist. Beispiele (`skill-examples.ts`): einmalig, Merker
  `skills.examplesCreated` in app_settings – gelöschte kommen nicht wieder.
  Seite „Skills“ (`pages/SkillsPage.tsx`, Route `skills/:skillId?`, Leisten-Symbol WandSparkles nach Wissen):
  Muster wie Vorlagen (Entwurf, „Speichern“ erst bei Änderung, Löschen mit Rückfrage), Felder Name /
  „Wann passt dieser Skill?“ (Beschreibung – danach entscheidet später das Modell) / Anleitung (Markdown,
  Monospace, Zeichenzähler). „Neu laden“ (alle bzw. dieser Skill, fragt bei ungespeicherten Änderungen)
  holt Änderungen von außen; „Ordner öffnen“ zeigt nur Ordner im Explorer (nie Dateien → nichts wird
  ausgeführt). IPC `skill-service.ts`: listSkills/saveSkill/deleteSkill/openSkillFolder, Eingaben über
  `checkSkillInput`. Geprüft: anlegen über die Oberfläche (Name mit Doppelpunkt), von außen ändern + Neu
  laden, löschen, hell/dunkel ✓.
  Im Chat: `ChatSettings.skills` (Kennungen, geprüft wie die anderen ID-Listen; zählt nicht als „eigene
  Einstellung“ für den Punkt am Einstellungs-Knopf). Schalter „Skills“ (`components/skills/SkillPicker.tsx`,
  `SkillsButton` als dritte Pille im Eingabefeld, mit Link „Skills verwalten“; `SkillPicker` auch für
  Projekte/Vorlagen gedacht). Beim Senden lädt der Chat-Dienst die Skills FRISCH aus den Dateien (fehlende/
  kaputte werden übergangen) und setzt sie mit `withSkills` an den Anfang der System-Nachricht; danach
  `withMemories` davor → Reihenfolge Erinnerungen → Skills → Projekt-Anweisungen/Systemprompt (getestet).
  Kontext-Füllstand: eigener Anteil „Skills“ (lila). Live (gemma4): Test-Skill „beginne mit Ahoi!“
  eingeschaltet → „Ahoi! 2 plus 2 ist 4.“, ausgeschaltet → normale Antwort, Anteil 49 Tokens ✓.
  Automatisch: Bei Tool-Modellen bekommt das Modell JEDEN nicht eingeschalteten Skill als eigenes Werkzeug
  `skill_<kennung>` ohne Eingaben (Beschreibung = Name + „wann passt er“), Server-ID `localdesk:skills`,
  `permission: 'always'` (liest nur eigenen Text), höchstens 40. Aufruf → Anleitung frisch aus der Datei.
  ENTSCHEIDUNG nach Messung: Zuerst EIN Werkzeug `load_skill(name)` mit Skill-Liste in der Beschreibung –
  qwen3 hielt die Namen für eigene Funktionen, lud nie etwas (0/4) und lieferte leere Antworten (Ollama
  verwirft Aufrufe unbekannter Werkzeuge); auch `enum` half nicht. Ein Werkzeug pro Skill direkt an Ollama:
  gemma4, qwen3, gpt-oss 18/18 richtig, unpassende Frage nie ein Skill; in der App je 3/3. Anzeige im Chat:
  Zeile „Skill · <Name> · geladen“ (Name aus dem Ergebnis). Kontext-Schätzung zählt die Skill-Werkzeuge
  zum Anteil „Tools“ (`useContextUsage(…, modelSupportsTools)`).
  Außerdem gefunden: Schreibt ein Modell GAR keinen Antworttext, zeigt die Werkzeug-Schleife jetzt den
  Hinweis `EMPTY_ANSWER` (Fehler-Ereignis) statt einer leeren Blase.
  Vorlagen: Feld „Skills“ (`SkillPicker`) im Vorlagen-Editor; die Vorlage gibt `settings.skills` beim Start an
  den Chat weiter. Projekte: Migration 16 `folders.skills_json` (JSON-Liste, geprüft über `normalizeSettings`,
  kaputt → leer), `FolderRepository.setSkills`, IPC `setProjectSkills`, Abschnitt „Skills“ auf der Projekt-Seite
  (speichert sofort). Beim Senden gelten Projekt-Skills ∪ Chat-Skills; diese sind dann nicht mehr als
  Werkzeug im Angebot; Kontext-Schätzung zählt beide. Der Chat-Schalter zeigt nur die Skills des Chats.
  Live (gemma4, „Ahoi!“-Test-Skill): Vorlage → „Ahoi! 5 plus 5 …“, Projekt → „Ahoi! 7 plus 7 …“ ✓.
  Abschlusstest (Ollama 0.40.11): gemma4, qwen3, gpt-oss je Schalter / Projekt / automatisch (Lernkarten)
  → 9/9. Gebaute App: Beispiele vorhanden, Code-Review automatisch geladen ✓. Bekannt: gpt-oss scheitert
  zwischendurch an Ollamas CUDA-Ladefehler – andere Modelle vorher entladen hilft.
- Phase 11: E-Mail – abgeschlossen (2026-10-30), vorerst nur Gmail. Entschieden (2026-10-28): erst nur Gmail (Outlook später: seit
  Juni 2024 braucht jede Microsoft-App-Registrierung ein Verzeichnis/Azure-Konto; App-Passwörter
  für Outlook.com gibt es nicht mehr; fremde Client-IDs nutzen wir nicht) · eigene Google-App des
  Nutzers, Status „Produktion“ ohne Überprüfung (keine 7-Tage-Abmeldung, Warnung einmal
  wegklicken, max. 100 Nutzer) · Bereich `gmail.modify` – erlaubt technisch mehr, darum kennt der
  Code nur Lesen, Label setzen, Stern setzen/entfernen; Senden/Löschen gibt es nicht · Anmeldung
  im System-Browser mit Loopback (127.0.0.1) + PKCE · Anmelde-Schlüssel mit `safeStorage`
  verschlüsselt · keine Mail-Kopie auf dem PC · externe Bilder blockiert, Mails nur als Text (kein
  DOMPurify) · nur bestehende Labels vorschlagen · Seite „E-Mail“ + Chat-Schalter „E-Mail“
  (lesen ohne Rückfrage, Änderungen als Bestätigungs-Karte).
  Schritt 1 ✓: Anleitung `docs/email-einrichten.md`, Einstellungen → E-Mail (Client-ID und
  Clientschlüssel in `app_settings`, Schlüssel geht nie an die Oberfläche zurück).
  Schritt 2 ✓ (Code): `src/main/mail/google-auth.ts` – Loopback-Server nur auf 127.0.0.1,
  zufälliger Port, `state` zeitkonstant verglichen, fremde Aufrufe ignoriert, 5 Minuten Wartezeit,
  abbrechbar; Code + PKCE-Verifier gegen Schlüssel getauscht; abgewählter Gmail-Haken → widerrufen +
  Fehler; Adresse aus `users/me/profile` (kein openid/email-Bereich nötig). `MailSessions`: Refresh-
  Token mit `safeStorage` verschlüsselt in `mail_accounts` (Migration 17), Zugangsschlüssel nur im
  Speicher; ohne Verschlüsselung wird nicht gespeichert; `invalid_grant` → `MailReauthError`.
  Abmelden widerruft bei Google und löscht lokal (auch wenn Google nicht erreichbar – dann Hinweis).
  Google-App ist gesperrt, solange Konten angemeldet sind. **Netzwerk-Regel:** Mail-Verkehr nur
  über `guardedFetch` (`mail-fetch.ts`, HTTPS + feste Hosts `accounts.google.com`,
  `oauth2.googleapis.com`, `gmail.googleapis.com`). Echter Test 2026-10-28 ✓: Anmeldung mit der
  Google-App des Nutzers, Konto erscheint, Refresh-Token in der DB verschlüsselt (Präfix `v10`,
  kein Klartext). Erkenntnisse: „App veröffentlichen“ bleibt in Googles Console ausgegraut (bekanntes
  Problem seit Herbst 2026, vermutlich fehlen Startseite/Datenschutz-Links) → vorerst Status „Test“
  mit Nutzer als Testnutzer = Neu-Anmelden alle 7 Tage; Veröffentlichen erneut in Phase 13 (mit
  Datenschutzerklärung). Nicht aktivierte Gmail-API → 403 SERVICE_DISABLED, wird jetzt erkannt;
  scheitert etwas nach dem Code-Tausch, wird die Anmeldung bei Google sofort widerrufen.
  `safeStorage` über die async-Funktionen (die synchronen sind in Electron 45 veraltet).
  Schritt 3 ✓: `MailClient` (`mail/mail-client.ts`) als gemeinsame Schnittstelle – `list`, `get`,
  `labels`, `apply`; `GmailClient` über REST: Liste = `messages` + je Mail `format=metadata`
  (max. 8 parallel), Mail = `format=full`, Text-Teil bevorzugt (Zeichensatz aus Content-Type),
  sonst eigenes `htmlToText` (kein DOMPurify; Bilder fallen weg), max. 100 000 Zeichen, Anhänge
  nur Name+Größe. `apply` = nur `messages/{id}/modify`: eigenes Label hinzufügen (nur `type:user`,
  sonst wäre TRASH „Löschen durch die Hintertür“) oder STARRED setzen/entfernen; Test prüft, dass es
  keine anderen Schreib-Aufrufe gibt. 401 → Zugangsschlüssel verwerfen, einmal neu. Kennungen per
  `isMailId` geprüft, bevor eine Anfrage rausgeht. IPC zum Lesen: `listMail`, `getMail`,
  `listMailLabels` (Ändern kommt erst mit der Bestätigung in Schritt 5). Echter Lesetest
  2026-10-28 ✓ (nur Kennzahlen, keine Inhalte ausgelesen): 10 Mails mit allen Kopfdaten, 5 Mails als
  Text ohne HTML-Reste, Labels, Suche, Erneuern des Zugangsschlüssels nach Neustart.
  Schritt 4 ✓: Seite „E-Mail“ (`pages/MailPage.tsx`, Route `mail/:messageId?`, Symbol in der
  NavRail nach Vorlagen): Liste 25 je Seite + „Mehr laden“, Gmail-Suche (leer = Posteingang),
  Konto-Wahl ab 2 Konten (localStorage), Lese-Ansicht (`components/mail/MailReader.tsx`) nur als
  Text, Anhänge nur Name/Größe; nichts wird als gelesen markiert. „Zusammenfassen“: Hauptprozess
  holt die Mail selbst (`summarizeMail`), Anweisung in `shared/mail-prompt.ts` grenzt die Mail als
  fremden Inhalt ab (keine Anweisungen daraus befolgen, Phishing-Hinweis), Denken aus, Kontext
  8k/16k/32k je nach Länge, Ergebnis als reiner Text (Links nicht klickbar). Modell-Wahl gemerkt
  (`localdesk.mailModel`, sonst Chat-Modell). Abgelaufene Anmeldung → `MAIL_REAUTH_MESSAGE` + Link
  zu den Einstellungen. Live ✓ (Inhalte beim Prüfen per CSS unscharf): 25→50 Mails ohne Doppelte,
  Suche, Zusammenfassung mit gemma4:12b in 15 s.
  Schritt 5 ✓: „Sortieren vorschlagen“ (Zauberstab in der
  Liste, `components/mail/SortPanel.tsx`): Modell sieht Kopfdaten + Vorschau der ersten 25 Mails
  (`shared/mail-sorting.ts`), Antwort per Ollama-`format` (JSON-Schema, neu in `ChatRequest`),
  Label nur als Enum der eigenen Labels, Temperatur 0. `parseSuggestions` wirft Unbekanntes,
  Wirkungsloses und Doppeltes raus. `isSortableLabel`: nur `type:user` ohne „[Gmail]/…“ (IMAP-Reste
  wie „[Gmail]/All Mail“ – gemma4 hatte das sonst für alle 25 Mails vorgeschlagen). Haken sind
  anfangs AUS; „n Änderungen in Gmail übernehmen“ → `applyMailChanges` prüft jede Änderung erneut
  (`checkMailChange`, max. 100), `GmailClient.apply` holt die Labels einmal je Durchgang.
  Live 2026-10-28 ✓: Nutzer legte 3 Labels an; gemma4:12b schlug in 19 s für 11 von 25 Mails ein
  Label vor (14 ohne Vorschlag); Nutzer übernahm alle 11 selbst – Gmail zeigt 7 + 3 + 1 Labels.
  Stern-Vorschlag live noch nicht vorgekommen (nur mit nachgebautem Gmail getestet).
  Schritt 6 ✓: Chat-Schalter „E-Mail“ (`components/mail/MailButton.tsx`, `ChatSettings.mailAccounts`,
  höchstens ein Konto). Nur für Modelle mit Tools: `mail/mail-tools.ts` mit `mail_search` und
  `mail_read` (ohne Rückfrage; Ergebnis mit Hinweis „fremder Text“, Mailtext in `<<<MAIL … MAIL>>>`,
  max. 12 000 Zeichen) und `mail_change` (Label als Enum der eigenen Labels und/oder Stern; IMMER
  Rückfrage). Neu in `OfferedTool`: `alwaysAsk` (kein „Immer erlauben“) und `describe` (Vorschau
  vor der Rückfrage – „Stern setzen / Mail: Absender – „Betreff“ (Datum) / Grund“; wirft sie, z. B.
  unbekannte Mail oder schon gesetzt, kommt gar keine Rückfrage, das Modell bekommt den Fehler).
  `ToolCallRecord.preview`/`alwaysAsk`; Karte „Änderung in Gmail übernehmen?“ mit Übernehmen /
  Ablehnen. Labels werden einmal pro Antwort geholt. Live 2026-10-28 ✓ (qwen3:14b): Frage nach der
  Zahl der Mails → `mail_search` „newer_than:3d“ → „13“ (ganzes Postfach; Beschreibung nennt jetzt
  „in:inbox“); „Stern setzen“ → Karte mit Vorschau, Ablehnen → nichts geändert. Test-Chat per ID
  gelöscht.
  Schritt 7 ✓ (2026-10-30, gebaute App `npm run package`): zwei Tage nach der Anmeldung frischer
  Zugangsschlüssel aus der verschlüsselten Anmeldung ✓, Liste/Lesen/Labels/Suche ✓, Zusammenfassen
  mit gemma4:12b ✓, unerlaubte Änderung („trash“) abgewiesen ✓, Seite rendert ✓. Doku: README
  („E-Mail benutzen“, Daten), CHANGELOG, Netzwerk-Regel. Offen für später: Outlook (Azure-Verzeichnis
  nötig), „App veröffentlichen“ bei Google (Phase 13 mit Datenschutzerklärung), Stern echt über den
  Chat gesetzt (nur abgelehnt getestet), Schätzung des Kontext-Füllstands kennt die Mail-Werkzeuge
  noch nicht.
- Phase 12: Code-Bereich – abgeschlossen (2026-10-30). Entschieden (2026-10-30): eigene Seite „Code“ (Sitzung = ein
  Projektordner) · Lesen/Suchen frei; Dateien ändern/anlegen/löschen nur mit Vorher/Nachher-Karte
  (Ändern = Text ersetzen wie bei Claude Code) · Befehle (PowerShell im Projektordner, Zeitlimit,
  Stopp) JEDER einzeln freigegeben, kein „immer“ · Git: Status/Diff frei, Commit mit Karte, KEIN Push,
  Git ohne Shell · eigene Sicherungen + „Rückgängig“ je Änderung (`%APPDATA%\LocalDesk\code-backups`)
  · jsdiff (`diff` 9.0.0, BSD-3) für die Vorher/Nachher-Ansicht · Code-Sitzungen mit 32k Kontext ·
  Hinweis: freigegebene Befehle unterliegen nicht der Netzwerk-Regel (dürfen, was der Nutzer darf).
  Schritt 1 ✓: Migration 18 `chats.workspace` – Code-Sitzungen stehen nicht in Chat-Liste und Suche
  (`listCodeSessions`). Ordner nur über den Windows-Dialog im Hauptprozess (`createCodeSession`
  nimmt keinen Pfad an); Laufwerk, Systemordner und ganzer Benutzerordner abgelehnt.
  `code/workspace.ts`: jeder Pfad über `resolve` (kein `..`, kein absoluter Pfad, kein Laufwerk,
  Junctions/Symlinks per realpath geprüft, `.git` gesperrt und versteckt), Dateien max. 1 MB,
  Binärdateien erkannt. Seite `pages/CodePage.tsx` (Sitzungen, Dateibaum lazy, Datei-Ansicht mit
  Zeilennummern), Symbol „Code“ nach E-Mail. Test-Sitzung `test-code-1` (Übungsprojekt im
  Scratchpad) direkt in der DB angelegt – am Ende der Phase per ID löschen.
  Schritt 2 ✓: `code/code-tools.ts` – `list_files` (Baum, Standard 2 Ebenen, max. 300 Einträge,
  node_modules/dist/venv … nur genannt), `read_file` (Zeilennummern, max. 400 Zeilen/30 000 Zeichen
  je Aufruf, Hinweis „weiter mit start_line“), `search_text` (ohne Groß/klein, max. 100 Treffer,
  5000 Dateien, ohne Binäres) – alle ohne Rückfrage, Server `localdesk:code`. `chat-service`: Chat
  mit `workspace` = Code-Sitzung → Anweisung `codeAgentPrompt` (`shared/code-agent.ts`) statt
  Projekt-Anweisungen, 32k Kontext (wenn nicht selbst gesetzt), 25 Werkzeug-Runden, KEINE
  Erinnerungen, kein Wissen, keine MCP-Server, keine Mail, keine automatischen Skills. Seite:
  `components/code/CodeAgent.tsx` (useChat + MessageView + ChatInput; Modellwahl nur Modelle mit
  Tools, gemerkt in `localdesk.codeModel`); Datei-Ansicht legt sich über den Agenten, der geladen
  bleibt. Live ✓ im Übungsprojekt: qwen3:14b (Baum + 3 Dateien gelesen → Division durch null
  gefunden, 64 s), gpt-oss:20b (`search_text` → richtig, 13 s), gemma4:12b (aus dem Verlauf,
  Zeilen richtig).
  Schritt 3 ✓: `code/edit-tools.ts` – `edit_file` (old_text muss GENAU einmal vorkommen, sonst
  Fehler mit Anzahl; CRLF-Dateien werden mit \n verglichen und mit \r\n zurückgeschrieben),
  `write_file` (neu anlegen inkl. Ordner oder ganz ersetzen), `delete_file` (nur Dateien,
  `destructive`). Alle `ask` + `alwaysAsk` + `describe` = Unified Diff aus jsdiff
  (`createTwoFilesPatch`, 3 Zeilen Kontext, max. 400 Zeilen). `planChange` läuft für die Vorschau
  UND beim Ausführen neu (Datei könnte sich geändert haben). Vor dem Schreiben sichert
  `code/backups.ts` vorher/nachher unter `code-backups/<Aufruf-ID>.json`; `ToolRuntime.call` bekommt
  dafür die Aufruf-ID. Rückgängig nur, wenn die Datei noch dem „nachher“ entspricht – sonst
  Rückfrage „trotzdem“ (force). Oberfläche: `DiffView` (rot/grün), Karte „Datei ändern?“ mit
  Übernehmen/Ablehnen, danach `CodeChangeRow` mit „Rückgängig“ (Stand per `codeChangeState`).
  Gefunden durch Tests: write_file hatte „muss existieren“ verkehrt herum. Live ✓ (qwen3:14b):
  Karte mit Diff nach 79 s → Übernehmen → Datei geändert → Rückgängig → `git status` leer.
  gpt-oss:20b scheiterte wieder an Ollamas CUDA-Ladefehler (App zeigt ihn verständlich an).
  Schritt 4 ✓: `code/command-tool.ts` – `run_command` (ask, alwaysAsk, destructive; Karte
  „Befehl ausführen?“ zeigt den genauen Befehl + Zeitlimit, Knopf „Ausführen“). Läuft als
  `powershell.exe -NoLogo -NoProfile -NonInteractive -Command` im Projektordner, stdin zu (keine
  Eingaben, `Read-Host` hängt nicht), UTF-8-Ausgabe (OutputEncoding + PYTHONIOENCODING/PYTHONUTF8),
  Zeitlimit Standard 120 s / max. 600 s, bei Zeitablauf oder „Stopp“ `taskkill /T /F` (ganzer
  Prozessbaum). Ergebnis „Exit-Code: N (x s)“ + Ausgabe (Anfang 4000 + Ende 12 000 Zeichen).
  Tests laufen mit echter PowerShell. Fund im Live-Test: Das Modell hielt eine rückgängig gemachte
  Änderung für noch gültig (stand ja so im Verlauf) → `ChatRepository.appendToolResult` ergänzt beim
  Rückgängigmachen das gespeicherte Ergebnis „Vom Nutzer rückgängig gemacht …“. Live ✓ (qwen3:14b):
  „python rechner.py“ → Karte nach 39 s → Ausführen → Exit 0, Ausgabe „5 / 5.0“ richtig
  wiedergegeben. pytest ist auf dem PC nicht installiert (bewusst nichts installiert).
  Schritt 5 ✓: `code/git-tools.ts` – `git_status`, `git_diff` (gegen HEAD, plus Liste neuer
  Dateien, max. 20 000 Zeichen; Pfad über `Workspace.resolve`) frei; `git_commit` (ask, alwaysAsk,
  Karte „Commit erstellen?“ mit Nachricht + `git status --short` als Dateiliste, Knopf „Committen“)
  = `git add --all -- .` + `git commit -m … -- .`. Alles mit Pfadangabe `-- .` → gilt nur für den
  Projektordner, auch wenn das Git-Projekt größer ist (Test: Nachbarordner bleibt unangetastet).
  Git per `execFile` ohne Shell, `core.quotepath=false`; KEIN Push-Werkzeug. Git-Hooks des Projekts
  laufen beim Commit wie gewohnt mit. Live (qwen3:14b): 1. Versuch mit altem Verlauf (Rückgängig
  von vor der Korrektur) → Modell erfand die Nachricht ohne Diff → Beschreibung verlangt jetzt
  „VORHER git_diff“; 2. Versuch frische Sitzung `test-code-2`: Status → Diff → „Add verdopple
  function“ ✓. Übungsprojekt hat lokal die Test-Identität „Uebung“.
  Schritt 6 ✓ (gebaute App): in einer Antwort `read_file` → `edit_file` (Karte, freigegeben) →
  `run_command` „python rechner.py“ (Karte, freigegeben) → Ausgabe 5 / 5.0 / 4 richtig; Rückgängig
  per Knopf → `git status` leer, Hinweis im Verlauf ✓. Aufgeräumt per ID: Test-Sitzungen
  `test-code-1`/`-2`, zwei Sicherungsdateien. Offen/bekannt: Ausgabe von Befehlen kommt erst am
  Ende (kein Live-Stream); Kontext-Füllstand kennt die Code-Werkzeuge nicht; lokale Modelle
  brauchen 40–120 s je Schritt und erfinden manchmal (Karten lesen!).
- Design-Prüfung nach Apples Human Interface Guidelines – abgeschlossen (2026-10-31). Geprüft: alle
  Seiten hell/dunkel, Klickflächen, Beschriftungen, Fokus. Umgesetzt (Nutzerwahl): Klickflächen
  mind. 28 px (Symbolknöpfe `grid h-7 w-7 place-items-center`, Textknöpfe `min-h-7`, Server-Radio
  in 28-px-Label; Regel: neue Knöpfe nicht kleiner, WCAG 2.2 verlangt 24 px) · gemeinsamer
  Leer-Zustand `components/EmptyState.tsx` (Symbol, ein Satz, Hinweis, optional Knopf) auf Code,
  Wissen, Skills, Vorlagen, E-Mail · linke Listen einheitlich 270 px (E-Mail 320 px) ·
  `prefers-reduced-motion` (Windows „Animationseffekte“ aus) → keine Übergänge, kein weiches
  Scrollen; drehende Lade-Symbole bleiben · leerer Chat: Hinweis + richtiger Knopf „Neue Vorlage“.
  Seitentitel = Tooltip der Leiste war schon überall gleich (Befund war ein Irrtum). Bewusst
  gelassen: Hover-Symbole in Chat-/Projektzeilen (dichte Liste, WCAG-Abstandsausnahme), Links im
  Fließtext.
- Phase 13: Datenschutz, Lizenzen, Sicherheit – in Arbeit. Entschieden (2026-10-31): volles Audit mit
  Skill „security-audit“, Funde erst als Bericht, dann wählt der Nutzer · Datenschutz als App-Seite,
  PRIVACY.md und GitHub-Pages-Seite (`site/`, online erst mit öffentlichem Repo) · Lizenzen als
  Datei + in der App. Reihenfolge: 1 Lizenzen · 2 CSP/Härtung · 3 Datenschutz · 4 Audit · 5 Funde
  beheben · 6 Abschluss.
  Schritt 1 ✓: `LICENSE` (MIT, „Copyright (c) 2026 JPPM9“), `package.json` license MIT.
  `scripts/third-party-notices.mjs` (`npm run notices`, `-- --check`) sammelt dependencies +
  deren Abhängigkeiten rekursiv wie Node auflöst → `THIRD_PARTY_NOTICES.md` (249 Pakete, alle
  freizügig: MIT/ISC/BSD/Apache/OFL/Python-2.0/BlueOak; jszip „MIT OR GPL-3.0“ → MIT gewählt;
  3 MIT-Pakete ohne Lizenzdatei). Datei ist vom Formatierer ausgenommen (`ignorePatterns`), sonst
  passt `--check` nie. Test schlägt fehl, wenn die Datei veraltet ist oder eine reine
  GPL/AGPL/SSPL-Lizenz auftaucht. Forge `extraResource`: LICENSE + THIRD_PARTY_NOTICES.md; IPC
  `getLicenses` liest aus `process.resourcesPath` (gebaut) bzw. `app.getAppPath()` (dev); Anzeige
  „Über LocalDesk → Lizenzen“ (`LicenseSection.tsx`). Electron/Chromium bringen eigene
  Lizenzdateien im Programmordner mit.
  Schritt 2 ✓: CSP kommt per Vite-Plugin nur in den Build (`vite.renderer.config.mts`, im Dev
  braucht Vite Inline-Skripte): `default-src 'self'; script-src 'self'; style-src 'self'
  'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'` + neu `object-src 'none';
  frame-src 'none'; base-uri 'none'; form-action 'none'`. Neu: `setPermissionRequestHandler` und
  `setPermissionCheckHandler` lehnen ALLES ab (Electron erlaubt sonst Kamera/Mikro/Standort/
  Benachrichtigungen ohne Rückfrage; LocalDesk nutzt nichts davon, auch nicht die Zwischenablage-
  API). Schon vorhanden: contextIsolation/sandbox an, nodeIntegration aus, `will-navigate` und
  `setWindowOpenHandler` (Links → System-Browser), Fuses (RunAsNode aus, NODE_OPTIONS/Inspect aus,
  asar-Integrität, nur aus asar laden, Cookie-Verschlüsselung). Geprüft in der gebauten App: alle 9
  Seiten ohne CSP-Verstoß; geblockt: Bild von außen, fetch nach außen, Inline-Skript, Mikrofon/
  Kamera (Berechtigung „denied“), Benachrichtigung, Standort, window.open, Navigation weg.
- Geplant bis zum ersten Release (Reihenfolge vom Nutzer freigegeben, 2026-10-28; vorher jeweils klären,
  Plan, Freigabe): Phase 9 Skills (Anleitungen als Markdown, kein fremder Code) · ~~Phase 10 Planer /
  Aufgabenliste~~ (vom Nutzer gestrichen, 2026-10-28; Nummern bleiben) · Phase 11 ✓ E-Mail (Gmail fertig, Outlook später) direkt per OAuth (Gmail-API, Microsoft Graph; lesen,
  zusammenfassen, sortieren – Änderungen nur nach Bestätigung, nie senden/löschen; Nutzer registriert
  die OAuth-Apps selbst; erweitert die Netzwerk-Regel um Google/Microsoft; Google-Testmodus = 7-Tage-
  Anmeldung, Lösung in der Phase klären) · Phase 12 ✓ Code-Bereich (Agent mit Bestätigung: Vorher/Nachher-
  Ansicht, Befehle nur nach Freigabe) · danach Design-Prüfung gegen Apples Human Interface Guidelines
  (Prüfliste + Feinschliff, kein neuer Look; Nutzer 2026-10-30) · Phase 13 Datenschutz, Lizenzen (MIT),
  Sicherheit (u. a. CSP; Sicherheits-Audit mit dem Skill „security-audit“, Vorbild cloudflare/security-audit-skill) ·
  danach Phase 7 zu Ende: Repo öffentlich (macht der Nutzer) und Release 0.1.0 nach Okay.
- Phase 7: Installer & Update-Check – in Arbeit. Entschieden (2026-10-27): Installer mit Assistent
  und Ordnerwahl (NSIS über electron-builder 26.17.0 `--prepackaged` auf den Forge-Build; Squirrel
  entfällt) · Update-Quelle GitHub-Releases, Repo wird dafür öffentlich (macht der Nutzer selbst) ·
  Update nur per Knopf, gefunden → auf Klick laden und installieren (electron-updater 6.8.10) ·
  eigenes Symbol. Unsigniert → SmartScreen-Hinweis beim ersten Start. Vor „öffentlich“: Commits tragen
  die private Adresse des Nutzers → entschieden: Historie umgeschrieben auf `JPPM9
  <294298180+JPPM9@users.noreply.github.com>` (Autor und Committer, Daten unverändert) und in ein
  frisches Repo JPPM9/LocalDesk gepusht; das alte Repo wurde umbenannt. Lokale Git-Identität dieses
  Ordners = JPPM9/noreply (`git config` ohne `--global`).
  Schritte: 1 Symbol ✅ · 2 Installer ✅ · 3 Versionen & Releases ✅ · 4 Update-Knopf ✅ · 5 Test ohne
  Veröffentlichung ✅ · 6 Repo öffentlich + erstes Release · 7 Abschlusstest & Doku
- **App-Symbol**: `assets/icon.svg` (Sprechblase mit „>_“ auf Akzent-Blau) ist die Quelle;
  `node scripts/build-icons.mjs` erzeugt `assets/icon.png` (512 px) und `assets/icon.ico`
  (16–256 px, PNG-Einträge) – ohne Pakete, gezeichnet mit Edge headless (transparenter Hintergrund).
  `.exe`-Symbol über `packagerConfig.icon` (Forge), Fenster im Dev-Modus über `BrowserWindow.icon`
  (gebaut nimmt Windows das .exe-Symbol). Geprüft: Symbol aus LocalDesk.exe und aus dem Dev-Fenster
  zurückgelesen ✓.
- **Installer** (`electron-builder.yml`, `npm run dist` = `forge package` + `electron-builder --win
  --prepackaged out/LocalDesk-win32-x64 --publish never`): NSIS mit Assistent, `perMachine: false`
  (Standard `%LOCALAPPDATA%\Programs\LocalDesk`, anderer Ordner möglich, Admin nur falls nötig),
  Desktop + Startmenü, Deutsch, `deleteAppDataOnUninstall: false`. appId `io.github.jppm9.localdesk`,
  gleich in `app.setAppUserModelId` (main.ts). Ausgabe `out/installer/`: Setup.exe, `.blockmap`,
  `latest.yml` (sha512, für electron-updater). Squirrel komplett entfernt (Maker, Pakete, Startcode);
  `npm run make` baut nur noch die ZIP. Das Install-Skript von `electron-winstaller` (nur Squirrel,
  kommt über electron-builder mit) bleibt von npm blockiert – wird nicht gebraucht.
  Geprüft: still installiert (`/S /currentuser /D=…`) → Ordner, Eintrag unter Apps, Verknüpfungen;
  installierte App startet (0.1.0, Ollama, Symbol); still deinstalliert → alles weg, Datenbank bleibt ✓.
  Den Assistenten selbst (Ordnerwahl-Dialog) hat der Nutzer von Hand zu prüfen.
- **Versionen & Releases**: Version nur in `package.json` (SemVer `x.y.z`). Zu jeder Version ein
  Abschnitt `## x.y.z – Datum` in `CHANGELOG.md` – wird zu den GitHub-Release-Notizen (und damit zum
  „Was ist neu“ des Update-Knopfs). `npm run release` (`scripts/release.mjs`) = Probelauf: Version +
  Changelog-Abschnitt, Git sauber auf `master` und gleich GitHub, Tag/Release noch frei, typecheck +
  lint + test, `npm run dist`, `latest.yml` passt zu Version und SHA-512 der Setup.exe, schreibt
  `out/installer/release-notes.md` und zeigt den gh-Befehl. Erst `npm run release -- --publish` lädt
  Setup.exe, `.blockmap`, `latest.yml` per `gh release create v<x.y.z> --repo JPPM9/LocalDesk
  --target <commit>` hoch – VERÖFFENTLICHUNG, nur nach ausdrücklicher Freigabe des Nutzers.
  Prüfbare Teile in `scripts/release-lib.mjs` (Tests in `tests/scripts/`). Im Skript läuft nur `npm`
  über die Shell (npm.cmd) – git/gh ohne, sonst zerfallen Argumente mit Leerzeichen.
  Neue Version: `package.json` erhöhen, Changelog-Abschnitt schreiben, committen, pushen, `npm run release`.
- **Update-Knopf** (`src/main/update-service.ts`, `shared/update.ts`, `settings/UpdateSection.tsx` unter
  „Über LocalDesk“): electron-updater 6.8.10 (fest, von Vite in main.cjs gebündelt – geprüft in der
  gebauten App). `autoDownload`/`autoInstallOnAppQuit` aus, kein Logger; Feed per `setFeedURL` GitHub
  JPPM9/LocalDesk (die `--prepackaged`-App hat keine `app-update.yml`). Testhaken:
  `LOCALDESK_UPDATE_URL` → generischer Server (nur für den lokalen Update-Test). Zustände
  `UpdateState`: dev (nicht gepackt) · idle · checking · latest · available (Version, Notizen als Text
  aus dem GitHub-HTML, Datum) · downloading (Fortschritt, abbrechbar per `CancellationToken`) · ready ·
  error (`describeUpdateError`: offline, 404/privat, Prüfsumme, Rate-Limit). Installieren =
  `quitAndInstall(true, true)`: Setup still im bisherigen Ordner, danach Neustart. Unsigniert → keine
  Signaturprüfung, nur SHA-512 aus `latest.yml`. Geprüft: Dev → Hinweis; gebaute App → „Suchen“ fragt
  GitHub, privates Repo → „noch keine Version veröffentlicht (oder privat)“ ✓.
- **Update-Test ohne Veröffentlichung** (Schritt 5): 0.1.0 still installiert, 0.1.1 nur lokal gebaut
  (Version/Changelog danach per Git zurückgesetzt), Mini-Server auf 127.0.0.1, App mit
  `LOCALDESK_UPDATE_URL`. Gefunden: Laden scheiterte – electron-updater braucht
  `resources/app-update.yml`, die bei `--prepackaged` fehlt → liegt jetzt als `resources/app-update.yml`
  im Projekt und wird per Forge `extraResource` mitkopiert (`updaterCacheDirName: localdesk-updater`).
  Danach: verfälschte sha512 → „passt nicht zur Prüfsumme“, Datei verworfen ✓; echter Durchlauf:
  verfügbar (Notizen, Datum) → geladen und geprüft → „Jetzt neu starten“ → nach ~10 s 0.1.1 im
  selben Ordner, Eintrag unter Apps 0.1.1, App startet von selbst, Daten erhalten ✓.
  Außerdem gefunden: Git (core.autocrlf) checkte Dateien mit CRLF aus → oxfmt-Lint rot →
  `.gitattributes` mit `* text=auto eol=lf`.
  Bekannt: Der Installer legt `%LOCALAPPDATA%\localdesk-updater` an (Kopie des Installers für
  Teil-Updates, ~120 MB); die Deinstallation lässt ihn liegen (Verhalten von electron-builder).

## Befehle

- `npm start` – Entwicklungsmodus · `npm test` – Vitest (Tests in `tests/`) · `npm run typecheck` · `npm run lint` · `npm run dist` – Installer · `npm run make` – portable ZIP
- Shell-Hinweis: Nach der Node-Installation kennt eine alte Shell `node` evtl. noch nicht (PATH neu laden).
- Commit-Nachrichten mit deutschen Anführungszeichen („…“) oder Umlauten über die Bash mit
  `git commit -F -` und Heredoc schreiben – PowerShell 5.1 verstümmelt sie bzw. der Commit schlägt fehl.
