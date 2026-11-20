# Plan: Oberfläche umbauen („Späte Stunde“)

Zweig: `feature/oberflaeche-design`. Vorgaben: `DESIGN.md` (Look, Bausteine 1–24), `JOURNEY.md` (Struktur, Seiten, Texte). Mocks: `mocks/index.html` (lokal).
Regel für jeden Schritt: Plan → deine Freigabe → bauen → gebaute App prüfen (900 und 1440 px, hell und dunkel, Screenshot gegen Mock) → Tests + Lint → Commit nur auf dein Wort. Kein Release ohne „Veröffentlichen“.

Unverändert bleiben: `aria-label="Senden"`, `aria-label="Modell: <Name>"`, alle IPC-Kanäle, Datenbank, Tool-Schleife.

## Schritt 1 – Tokens (nur Look, keine Struktur)

- `src/renderer/index.css`: `--ld-*` auf die neuen Werte aus DESIGN.md §Tokens (Abbildungstabelle) umstellen; Alias-Tokens ergänzen; Inter einbinden (lokal, keine CDN); Bewegung 140/320/480 ms mit `prefers-reduced-motion`; Fokusring.
- Werkbank-Reste ersetzen (Avatar, SidePanel PART_COLORS, GpuCard, Icon bleibt vorerst).
- Fertig, wenn: alle Seiten laufen unverändert, nur in neuen Farben/Schrift; Kontrast laut DESIGN.md-Bericht.

## Schritt 2 – Bausteine

- Gemeinsame Bausteine nach DESIGN.md §1–24 als Komponenten bzw. Klassen: Knopf (4 Arten), Icon-Knopf, Eingabefeld, Auswahl, Schalter, Chip, Karte, Menü, Dialog, Tooltip, Banner, Fortschritt, Reiter, Regler, Popover.
- Bestehende Komponenten (`ConfirmDialog`, `EmptyState`, `PageHeader`, `PickerButton`, `StatusPill`) darauf umstellen statt neue daneben zu bauen.
- Fertig, wenn: kein Seiten-Code mehr eigene Knopf-/Eingabe-Stile hat.

## Schritt 3 – Rahmen

- Fenster ohne Rahmen und ohne Menüzeile (`main.ts`: `frame:false`/`titleBarOverlay`, `Menu.setApplicationMenu(null)`), eigene Titelleiste (Baustein 18) mit Fenster-Knöpfen.
- Zoom, Vollbild, DevTools, Neuladen, Kopieren/Einfügen: als Kürzel und Befehle weiter nutzbar (im Test einzeln geprüft).
- Seitenleiste ersetzt `NavRail`: Chat, Vorlagen, Code, Modelle + Projekte (max. 5) + Letzte Chats (max. 8); unter 1100 px eingeklappt, Strg+B.
- Befehlspalette Strg+K (P-01…P-25), übernimmt die Chat-Suche; Kürzel-Hilfe bleibt.
- Fertig, wenn: alle bisherigen Kürzel gehen, Fenster lässt sich ziehen/maximieren/schließen.

## Schritt 4 – Chat und Startseite „Dein PC“

- Chat-Seite: Eingabe mit „+“-Menü (Wissen, Skills, E-Mail nur dort, plus „… verwalten“), Modell-Auswahl im Eingabefeld, Aktives als Chip; Nachrichten, Fußnoten für Quellen, Rückfrage-Karte, Kontext-Balken als Schätzung.
- Rechtes Panel mit zwei Ansichten (Seitenpanel / Chat-Einstellungen).
- Startseite „Dein PC“ (Status, Modelle, Grafikspeicher) ohne Dashboard-Karten-Wiederholung (offener Mock-Befund).

## Schritt 5 – Modelle und Status

- Modelle-Seite, Status-Popup, Ollama-„nicht erreichbar“ nur einmal sichtbar; Failover-Banner.

## Schritt 6 – Einstellungen

- Gruppen inkl. „Verwalten“ (Wissen, Skills, E-Mail), Design hell/dunkel dort; Texte aus JOURNEY.md.

## Schritt 7 – Wissen, Skills, Vorlagen

- Listen-Seiten mit leeren Zuständen, die nicht kahl wirken.

## Schritt 8 – E-Mail und Code

- E-Mail-Seite, Code-Seite (Festbreite nur für Code und Programm-Ausgaben).

## Schritt 9 – Texte und Abschluss

- i18n de/en laut JOURNEY.md „Anpassungen an bestehenden Schlüsseln“ (Suche nach `Postfach`, `Chatliste`, `Seitenbereich`, `Wissen-Knopf`, `MCP-Button`), Wörterliste (Stopp/Abbrechen, „Ollama-Server“, „MCP-Server“).
- Neues Icon passend zum Look, README-Screenshots neu, CHANGELOG, CLAUDE.md-Block „Werkbank“ ersetzen.
- Danach: Zusammenführen in master auf dein Wort.

## Offene Mock-Befunde (in den passenden Schritten lösen)

„+“-Menü bei 900×600 überdeckt Titelleiste (3/4); Seitenleiste + Panel gleichzeitig bei 900 px (3/4); zwei gefüllte Primärknöpfe im laufenden Chat (4); abgeschnittene Zeilen (5–8).

## Nicht dabei / Risiken

- Keine neuen Funktionen. Alte Audit-Punkte (CSP, Tabellen-Parsing im Hauptprozess) bleiben ein eigener Punkt.
- Größtes Risiko: Schritt 3 (Fenster ohne Menüzeile) – deshalb eigener Test jedes Kürzels.
- Jeder Schritt ist einzeln lauffähig; die App bleibt nach jedem Commit benutzbar.
