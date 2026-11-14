# JOURNEY.md

<!-- Struktur- und Ablauf-Spezifikation von LocalDesk. Gehört zu DESIGN.md (visuelle Tokens). Für Farben, Schrift und Abstände siehe DESIGN.md (entsteht in Phase 3). -->

**Status:** Gliederung vom Nutzer bestätigt am 2026-11-12 (Phase 1: Job, Journey, IA). Flows und Seiten-Specs (Phase 2) vom Nutzer bestätigt am 2026-11-14.
**Grenze dieses Dokuments:** `journey` regelt die **Struktur** (Gliederung, Navigation, Wege zwischen Flächen). Die Bedienung **im** Chat (Eingabefeld, Rückfrage-Karten, laufende Antwort) ist in Phase 2 mit `usability` und `ai-native` spezifiziert und steht in §Flows und §Page specs; Aussagen aus `ai-native` sind dort als „aus Prinzipien abgeleitet, kein gesicherter Kanon“ markiert.
**Stand:** 2026-11-12 · **Eigentümer:** der Nutzer (Besitzer der App und der Entscheidungen) · **Basis:** `Research-Dokument vom 2026-11-11` (ein Nutzer, seine eigenen Aussagen), `src/renderer/App.tsx`, `src/renderer/components/NavRail.tsx`, `src/renderer/shortcuts/keymap.ts`, freigegebener Aufbau-Mock (Drahtgitter).

---

## Job

**JTBD-Schule:** Moesta (Switch, vier Kräfte). Keine Begriffe aus anderen Schulen.

**Job-Story:** Wenn ich mit meinen eigenen Dateien, Tabellen und Mails arbeite, die meinen PC nicht verlassen sollen, will ich meine lokalen Modelle ohne Umwege fragen und sofort sehen, dass alles hier läuft, damit ich schnell zu einem Ergebnis komme und dem Werkzeug traue.

| Dimension | Inhalt |
|---|---|
| **Funktional** | Mit lokalen Modellen (Ollama) an eigenen Sachen arbeiten: Dateien, Tabellen, Fotos, Wissen, Mail, Web, Code. Nichts geht an fremde Server, außer was ich selbst einschalte. |
| **Emotional** | Ruhig und sicher: ich sehe, was läuft, ich behalte die Kontrolle (Rückfrage vor folgenreichen Aktionen), nichts wirkt überladen. |
| **Sozial** | Das Werkzeug soll vor Fremden, die im öffentlichen Repo den Screenshot sehen, wie ein hochwertiges, bezahltes Werkzeug dastehen und nicht wie ein beliebiger Chat-Klon. |

### Die vier Kräfte (Switch)

Es gab kein Switch-Interview. Die Kräfte sind aus dem Research-Dokument rekonstruiert. **Zitat** = Wort des Nutzers, **abgeleitet** = von mir geschlossen und vom Nutzer zu prüfen.

| Kraft | Inhalt | Herkunft |
|---|---|---|
| **Push** (was am Alten stört) | „wirkt nicht modern, eher wie jede Ingenieurs-App, die veraltet ist (kleine Schrift, Windows XP …)“; wirkt wie jede andere Chat-App; das Eingabefeld ist überladen (sechs Schalter); die Symbolleiste hat keine Namen; leere Seiten wirken kahl. Dazu: Cloud-Chats schicken Daten fort. | Zitat (Look, Eingabefeld, Leiste, Leere); abgeleitet (Cloud) |
| **Pull** (was anzieht) | „so gut anfühlen wie ein bezahltes Werkzeug“; Vorbild Linear und Raycast (dicht, schnell, großzügig gesetzt); die Startseite „Dein PC“ zeigt sofort, dass es hier läuft. | Zitat |
| **Anxiety** (was bremst) | Wissen, Skills und E-Mail verschwinden aus der Leiste und sind nur über das „+“-Menü und Strg+K erreichbar: werde ich sie wiederfinden? Eine Befehlspalette ist unsichtbar und muss gelernt werden. Der Umbau darf keine Funktion kosten (1151 Tests, feste `aria-label`). | abgeleitet aus den verworfenen Ansätzen im Plan und den Randbedingungen |
| **Habit** (was am Alten hält) | Schmale Symbolleiste links plus eigene Chatliste daneben; Strg+K = Chat-Suche; Strg+B = Chatliste ein/aus; Chat-Apps im Allgemeinen. | abgeleitet aus dem Code (`NavRail`, `ChatList`, `keymap.ts`) |

**Folge für den Aufbau:** Die Angst vor dem Nicht-Wiederfinden (Anxiety) wird gedämpft durch „Verwalten …“ direkt am Menüeintrag, durch drei sichtbare Einträge in Einstellungen, durch die Palette mit Klartext-Namen und durch eine sichtbare Suchzeile in der Leiste, die „Strg+K“ zeigt. Die Gewohnheit (Habit) wird bedient durch gleiche Kürzel (Strg+K, Strg+B, Strg+N bleiben, mit erweiterter Bedeutung).

---

## Journey

**Actor:** der Nutzer: eine Person, täglich, eigener Windows-PC, großer Bildschirm, Maus und Tastatur.
**Scenario:** Ein typischer Arbeitsablauf: Tabelle auswerten, Ergebnis prüfen, später wiederfinden, gelegentlich pflegen, selten eine Störung.
**Scope:** Gegenwart und Zielzustand in einem: Touchpoints sind die Flächen der neuen Gliederung. Ohne Marketing: die README-Besucher werden hier nicht modelliert, es gibt keine Daten über sie.

| Phase | Aktionen | Gedanken | Stimmung | Touchpoints | Chancen |
|---|---|---|---|---|---|
| **1 Ankommen** | App öffnen, hinschauen | „Läuft alles? Welches Modell ist geladen?“ | Mittel bis hoch (Gewissheit) | Startseite „Dein PC“, Modellstatus am Fuß der Leiste | Zustand ohne Klick sichtbar machen |
| **2 Fragen** | Text tippen, Datei hineinziehen, im „+“-Menü etwas einschalten | „Was muss ich einschalten? Wo ist das hin?“ | Mittel (Anspannung, heute Überladung) | Eingabefeld, „+“-Menü, Chips | Nur Büroklammer und „+“; Eingeschaltetes als Chip |
| **3 Arbeiten lassen** | Antwort läuft, Werkzeug-Zeile, Rückfrage erlauben oder ablehnen | „Was macht es gerade? Darf es das?“ | Niedrig bis mittel (Kontrolle abgeben) | Chat, Rückfrage-Karte, Stopp | Feste Anker: Eingabefeld, Stopp, Weg zurück |
| **4 Ergebnis prüfen** | Diagramm und Text lesen, Quellen ansehen | „Stimmt das? Woher kommt das?“ | **Hoch** (Spitze: „fühlt sich wertig an“) | Antwort, Diagramm, Statistikzeile, Seitenpanel | Spitze bewusst gestalten (Peak-End, Kahneman) |
| **5 Wiederfinden** | Strg+K, Letzte Chats, Projekt öffnen | „Wo war das noch?“ | Hoch bei Treffer, **tief**, wenn nichts auftaucht | Palette, Leiste (Projekte, Letzte Chats) | Treffer in Chats nach Titel und Inhalt, von überall |
| **6 Pflegen** | Modell laden, Wissen aktualisieren, Skills, Einstellungen | „Wo verwalte ich das?“ | Mittel bis niedrig (selten, Aufwand) | Modelle, „Verwalten …“, Einstellungen | Ein Klick vom Menüeintrag zur Verwaltung |
| **7 Störung und Rückkehr** | Ollama nicht erreichbar, Ursache klären, wieder bereit | „Was ist kaputt? Was tue ich?“ | **Tiefpunkt**, am Ende Erleichterung | Modellstatus, Banner, Status-Seite | Ursache nennen; Ende der Kurve als Erleichterung gestalten (Peak-End) |

**Decision model:** Loyalty Loop (McKinsey 2009, Edelman 2013). Der Nutzer ist längst in der Bindungsschleife (täglich, Release 0.1.0 draußen), es gibt keinen Kaufweg. Messy Middle (Google 2020) und Trichter passen nicht und werden nicht modelliert.

**Stimmungskurve:** mittel-hoch (1), mittel (2), tief bis mittel (3), **Spitze** (4), hoch oder tief je nach Treffer (5), mittel-tief (6), **Tal** (7) mit Anstieg am Ende. Gestaltungsfolge: Spitze (4) und das Ende von (7) bekommen die meiste Sorgfalt, Tal (3) und Tal (5) die meisten Sicherungen.

**Research basis:** Ein einzelner Nutzer, der zugleich Eigentümer ist; Aussagen aus dem Research-Dokument vom 2026-11-11. Die Kurve ist **aus diesen Aussagen abgeleitet und nicht gemessen** (kein Tagebuch, keine Beobachtung): Behandle sie als Arbeitshypothese, nicht als Befund. Gegen „Journey-Theater“ (NN/g, Gibbons 2018): Eigentümer ist der Nutzer; sie wird bei jedem neuen Design-Plan und vor jedem Release mit neuer Fläche gegen seine Erfahrung gelesen und korrigiert.

---

## IA

**Organization scheme:** gemischt. **Aufgabe** für die Bereiche (Chat, Vorlagen, Code, Modelle), **zeitlich** (exakt) für Letzte Chats, **Thema** (vom Nutzer vergeben) für Projekte. (Rosenfeld/Morville, Organisation.)
**Structure type:** Hub-and-Spoke. Der Chat (leer = Startseite „Dein PC“) ist die Mitte, alle Seiten sind Arme, erreichbar über die globale Leiste und die Palette. Querverbindungen laufen über die Palette, nicht über Seiten untereinander.
**Zielgruppe der Struktur:** ein Nutzer, feste Seiten, daher `journey` und nicht `ai-native`.

### Sitemap

```
LocalDesk (Fenster: Titelleiste, Seitenleiste, Fläche, Palette als Überlagerung)
├── Chat                  /chat/:chatId?     Startseite „Dein PC“, wenn leer
│   └── „+“-Menü          Wissen · Werkzeuge · Skills · E-Mail · Recherche · Internet
│       ├── Wissen   ▸ Verwalten …   → Wissen          /knowledge/:collectionId?
│       ├── Skills   ▸ Verwalten …   → Skills          /skills/:skillId?
│       └── E-Mail   ▸ Verwalten …   → E-Mail          /mail/:messageId?
├── Vorlagen              /templates/:templateId?
├── Code                  /code/:sessionId?
├── Modelle               /models
├── Projekt (je Projekt)  /projects/:projectId     aus der Liste „Projekte“
├── Status                /status                  aus dem Modellstatus am Fuß
└── Einstellungen         /settings
    ├── Wissen verwalten  → Wissen          /knowledge/:collectionId?
    ├── Skills verwalten  → Skills          /skills/:skillId?
    ├── E-Mail            → E-Mail          /mail/:messageId?
    └── Darstellung       Design: Hell · Dunkel · Wie Windows (Wechsler zieht aus der alten Symbolleiste hierher)
```

Wissen, Skills und E-Mail haben damit **zwei sichtbare Einstiege** („Verwalten …“ am „+“-Menüeintrag und je ein Eintrag in Einstellungen) plus die Palette. In der Seitenleiste stehen sie nicht.

`index` und `*` leiten nach `/chat` weiter und sind kein eigenes Ziel.

### Globale Navigation: Seitenleiste

Aufbau von oben nach unten, vier Zonen (Kopf, Bereiche, Listen, Fuß). Breite ausgeklappt 272 px (Maß aus dem freigegebenen Mock, im Code-Umbau an `DESIGN.md` anzupassen), eingeklappt 64 px.

| Zone | Inhalt (DE / EN) | Verhalten |
|---|---|---|
| **Kopf** (fix) | Marke „LocalDesk“ und Knopf „Seitenleiste einklappen / Collapse sidebar“ (Strg+B). Darunter Suchzeile „Suchen … / Search …“ mit Hinweis „Strg+K“. | Die Suchzeile ist ein Auslöser für die Palette, kein Ziel. |
| **Bereiche** (fix) | **Chat · Vorlagen · Code · Modelle** / **Chat · Templates · Code · Models** | Aktueller Bereich ist hervorgehoben (`aria-current="page"`). |
| **Listen** (scrollt) | **Projekte / Projects** (mit „+“ für neues Projekt) und **Letzte Chats / Recent chats** | Siehe Überlauf unten. Gruppenköpfe einklappbar, Zustand bleibt gemerkt. |
| **Fuß** (fix) | **Modellstatus** (Beispiel: „qwen3:14b · 9,3 GB“, Punkt = Ollama erreichbar) und **Einstellungen / Settings** | Klick auf den Modellstatus öffnet wie heute ein Popup (Grafikkarte, geladene Modelle) mit Weg zur Status-Seite. |

**Reihenfolge der Bereiche:** nach Nutzungshäufigkeit absteigend: Chat (Hub, täglich), Vorlagen (Start von Aufgaben), Code (längere Arbeit), Modelle (Einrichtung, selten). Modelle bleibt in der Leiste, weil der Nutzer es so entschieden hat; die Häufigkeit allein würde es in die Verwaltung schieben.

**Zählregel und Begründung (Hick). Maßgebliche Zahl: 6 Einträge auf oberster Ebene (erlaubt höchstens 7, ein Platz Reserve).** Gezählt werden die festen, anklickbaren Ziele: Chat, Vorlagen, Code, Modelle, Modellstatus (-> Status), Einstellungen. **Nicht mitgezählt** werden die Suchzeile (ein Befehl, kein Ziel) und die zwei Listenköpfe „Projekte“ und „Letzte Chats“: Sie sind Überschriften, die nur ein- und ausklappen; ihre Zeilen sind Nutzerinhalt mit eigener Obergrenze (unten). Zählte man die Köpfe mit, wären es 8; diese Zählung gilt hier ausdrücklich nicht. Dieselbe Zahl 6 steht im Routen-Abgleich. Begründung: **Hicks Gesetz** (Hick–Hyman 1952): Die Zeit zur Wahl wächst mit der Zahl gleichrangiger Möglichkeiten, also gruppieren und staffeln: höchstens 4 Ziele je Zone; selten Gebrauchtes (Wissen, Skills, E-Mail) im „+“-Menü, in Einstellungen und in der Palette statt in der Leiste. Das Gesetz stützt die Gruppierung, es ist keine Pflichtzahl; die Obergrenze 7 ist die Vorgabe des Plans, nicht aus Miller/Cowan abgeleitet (das betrifft das Arbeitsgedächtnis, nicht sichtbare Einträge). Ergänzend: Jakob (Linear/Raycast-Muster: Leiste links, Palette auf Strg+K), Fitts (feste Zonen am Rand sind schnell zu treffen).

**Überlauf: sehr viele Projekte und Chats.**

| Fall | Regel |
|---|---|
| Mitte reicht nicht | Nur die Zone **Listen** scrollt. Kopf und Fuß bleiben stehen (Bereiche und Einstellungen immer erreichbar). |
| Projekte | Höchstens **5** Zeilen (zuletzt benutzt zuerst), darunter „Alle anzeigen (n) / Show all (n)“. |
| Letzte Chats | Höchstens **8** Zeilen (letzte Aktivität zuerst), darunter „Alle anzeigen / Show all“. |
| „Alle anzeigen“ | Öffnet die **Palette** mit vorgewähltem Bereich (Projekte oder Chats), dort scrollt die volle Liste mit Suche. Keine neue Seite. |
| Lange Namen | Eine Zeile, am Ende gekürzt (…), voller Name im Tooltip. |
| Niedriges Fenster (600 px) | Die Höchstzahlen sind Obergrenzen. Bei wenig Höhe scrollt die Zone früher. |
| Leere Listen | Beide Listen zeigen unter ihrem Kopf einen Satz, was hier hingehört, und genau eine Aktion: „Projekte“ → „Neues Projekt“, „Letzte Chats“ → „Neuer Chat“ (Text Phase 5; angeglichen mit Zustimmung des Nutzers am 2026-11-14). |

**Drei Orte für den Modellzustand, je eine Rolle** (damit nichts dreimal dasselbe sagt):

| Ort | Rolle |
|---|---|
| **Fuß der Seitenleiste** (Modellstatus) | **Kurzanzeige**: ist Ollama erreichbar, welches Modell ist geladen. Immer sichtbar, nur lesen; das Popup zeigt Grafikkarte und geladene Modelle und führt zur Status-Seite. |
| **Modelle** (`/models`) | **Verwalten**: installierte Modelle ansehen, laden, wählen, entfernen. Der Ort für Handlungen am Bestand. |
| **Status** (`/status`) | **Diagnose**: Verbindung zu Ollama, Grafikkarte und Grafikspeicher im Detail; der Ort, wenn etwas nicht läuft. Keine Verwaltung. |

**Tastatur und Fokus (Seitenleiste).**

- **Tab-Reihenfolge** (ausgeklappt): Einklapp-Knopf, Suchzeile, Chat, Vorlagen, Code, Modelle, Kopf „Projekte“ und seine Zeilen, Kopf „Letzte Chats“ und seine Zeilen, Modellstatus, Einstellungen, danach die Hauptfläche. Innerhalb einer Liste wechseln ↑/↓ zwischen den Zeilen, Tab verlässt die Liste.
- **Eingeklappt:** gleiche Reihenfolge, beginnend mit dem Ausklapp-Knopf (Marke). Popover der Listen: Enter/Leertaste öffnet, ↑/↓ wählt, Esc schließt und der Fokus kehrt auf das Listen-Icon zurück.
- **Strg+B** schaltet von überall um. Der Fokus bleibt dabei, wo er war, außer bei der Überlagerung (siehe unten).
- **Überlagerung (unter 1100 px):** Öffnen per Knopf oder Strg+B verschiebt den Fokus auf die Suchzeile in der Leiste. Der Fokus bleibt in der Überlagerung (Tab läuft im Kreis). **Esc** schließt sie, ebenso Klick daneben und die Auswahl eines Ziels. Beim Schließen **kehrt der Fokus auf den Ausklapp-Knopf zurück**; nach der Auswahl eines Ziels stattdessen auf die Überschrift der neuen Seite.
- Jeder Eintrag ist ein echter Link oder Knopf mit sichtbarem Fokus (Details und Ring: Phase 4).

**Bestätigt mit der Gliederung (2026-11-12):** (a) Letzte Chats listet **alle** Chats nach Aktivität, auch die in Projekten, damit nichts nur über ein Projekt auffindbar ist. (b) Chats lassen sich weiter auf ein Projekt ziehen oder über „Verschieben“ zuordnen; Projekt umbenennen und löschen wandern auf die Projektseite und ins Zeilenmenü (Umsetzung Phase 2).

### Eingeklappter Zustand (64 px)

Die Leiste zeigt nur Icons in denselben Zonen und derselben Reihenfolge, durch Abstände getrennt. Jedes Icon hat Tooltip mit Namen und Kürzel (das Ausklappen ist die Antwort auf die Beschwerde „Symbolleiste ohne Namen“; eingeklappt ist die bewusste Wahl des Nutzers).

| Zone | Eingeklappt |
|---|---|
| Kopf | Marke als Knopf „Seitenleiste ausklappen / Expand sidebar“ (Strg+B), darunter Lupe für die Palette (Strg+K) |
| Bereiche | 4 Icons: Chat, Vorlagen, Code, Modelle (aktueller hervorgehoben) |
| Listen | 2 Icons: Projekte, Letzte Chats. Klick öffnet ein **Popover** mit derselben Liste (gleiche Höchstzahlen, „Alle anzeigen“ führt in die Palette). Nichts geht verloren. |
| Fuß | Statuspunkt mit Tooltip („qwen3:14b · 9,3 GB“, Ollama erreichbar oder nicht) und Einstellungen |

Der gewählte Zustand (aus- oder eingeklappt) bleibt über Neustarts erhalten, **gilt aber nur bei Fensterbreite ab 1100 px** (siehe nächster Abschnitt). Fokus und Tastatur: siehe „Tastatur und Fokus“ oben.

### Verhalten bei 900 px Fensterbreite

Mindestgröße 900 × 600 (vom Fenster erzwungen, kein Handy-Layout).

| Breite | Leiste | Begründung |
|---|---|---|
| **ab 1100 px** | Der **gespeicherte** Zustand gilt (Standard ausgeklappt, 272 px). Inhalt = 1100 - 272 - 12 = mindestens 816 px. | Chat-Spalte bis 800 px passt. |
| **unter 1100 px** (also auch 900) | **Immer eingeklappt** (64 px), auch wenn der gespeicherte Zustand „ausgeklappt“ lautet. Der gespeicherte Wert wird nicht überschrieben und gilt wieder, sobald das Fenster 1100 px erreicht. Inhalt = 900 - 64 - 12 = **824 px**. | Der Inhalt behält seine Breite (Spalte 800 px) statt zusammengequetscht zu werden. |
| Ausklappen bei < 1100 px | Die ausgeklappte Leiste liegt als **Überlagerung** über dem Inhalt (ohne ihn zu verschieben), mit Abdunkelung dahinter. Sie ist nur vorübergehend und ändert den gespeicherten Zustand nicht. Schließt bei Auswahl, Esc oder Klick daneben; Fokus siehe „Tastatur und Fokus“. | Kein Umbruch des Inhalts, Zustand klar (Nielsen 1). |
| Konstante **Flächenrand = 12 px** | Rechter und unterer Abstand der Hauptfläche zum Fensterrand (im Mock `margin: 0 12px 12px 0`). Er geht in die Rechnung 900 - 64 - 12 ein. Ändert sich der Wert in `DESIGN.md`, ist die Rechnung neu zu prüfen. | |
| Seitenpanel (Kontext/Quellen) | Folgt demselben Muster: unter 1100 px als Überlagerung. | Gleiche Regel für alle Seitenflächen. Details Phase 2. |
| Palette | Breite 640 px, höchstens Fensterbreite minus 48 px; bei 900 px unverändert nutzbar. | |
| „+“-Menü | 410 px breit, bleibt am Eingabefeld, weicht am Rand aus (Phase 4). | |
| Höhe 600 px | Titelleiste 40 + Fläche 560 px. Die Listen-Zone scrollt früher; der Fuß bleibt sichtbar. | |

### Titelleiste

Eigene Titelleiste, 40 px, **ohne Menüzeile**. Inhalt: Ziehfläche zum Verschieben des Fensters, leiser Text „LocalDesk“ links, **Fensterknöpfe rechts** (Minimieren, Maximieren/Wiederherstellen, Schließen; die Windows-Konvention bleibt, Jakob). Kein weiterer Inhalt: Seitentitel und Breadcrumb gehören zur jeweiligen Seite (Phase 2). Doppelklick auf die Ziehfläche maximiert. Die Funktionen der entfallenden Menüzeile bleiben als Kürzel und Palettenbefehle erhalten (Tabelle „Menüzeile: Verbleib der Funktionen“ unten). Abgeleitet aus dem Mock; die Wiederholung der Marke in Titelleiste und Leiste klärt Phase 3.

### Kontextuelle Navigation: „+“-Menü

Das „+“-Menü im Eingabefeld enthält **nur das, was die Leiste nicht enthält**. Alles ist Schalter, außer den „Verwalten …“-Links, die in die Verwaltungsseite führen.

| Menüeintrag (DE / EN) | Art | „Verwalten …“ führt zu |
|---|---|---|
| Wissen / Knowledge | Schalter, Auswahl der Sammlung | Wissen (`/knowledge`) |
| Werkzeuge / Tools | Schalter | (keine Seite) |
| Skills / Skills | Schalter | Skills (`/skills`) |
| E-Mail / E-mail | Schalter | E-Mail (`/mail`) |
| Recherche / Research | Schalter | (keine Seite) |
| Internet / Internet | Schalter | (keine Seite) |

Eingeschaltetes erscheint als Chip über dem Textfeld (entfernbar). Die Startseite zeigt zusätzlich Einstiege (Tabelle auswerten, Recherche, E-Mail zusammenfassen, Aus Wissen fragen); sie sind Abkürzungen in den Chat, keine eigenen Ziele.

### Labeling

Bestehende i18n-Schlüssel bleiben, wo der Inhalt gleich bleibt. Neue Schlüssel nur für neue Ziele. **Endgültige Texte: Phase 5.** Die Spalte „Schlüssel“ zeigt den heutigen Bestand.

| Konzept | DE | EN | Schlüssel heute |
|---|---|---|---|
| Chat | Chat | Chat | `nav.chat` |
| Vorlagen | Vorlagen | Templates | `nav.templates` |
| Code | Code | Code | `nav.code` |
| Modelle | Modelle | Models | `nav.sectionModels` (nicht `nav.models` = „Installierte Modelle“) |
| Wissen | Wissen | Knowledge | `nav.knowledge` |
| Skills | Skills | Skills | `nav.skills` |
| E-Mail | E-Mail | E-mail | `nav.mail` |
| Status | Status | Status | `nav.status` |
| Einstellungen | Einstellungen | Settings | `nav.settings` |
| Projekte | Projekte | Projects | `folders.*` / `projects.*` (neu für Gruppenkopf) |
| Letzte Chats | Letzte Chats | Recent chats | neu |
| Suchzeile | Suchen … | Search … | neu (heute `search.placeholder`) |
| Verwalten | Verwalten … | Manage … | neu |
| Seitenleiste | Seitenleiste ein-/ausklappen | Collapse/expand sidebar | `nav.collapse`, `nav.expand` |

Der englische Text ist länger als der deutsche (Recent chats, Show all): in der schmalen Leiste kürzen statt umbrechen (Phase 5).

### Suche: Befehlspalette (Strg+K)

Strg+K öffnet die Palette **von jeder Seite aus, ohne Seitenwechsel** und übernimmt die heutige Chat-Suche (`useChatSearch`, Treffer in Titel und Inhalt). Die Kürzel-ID `search` bleibt, ihre Beschreibung ändert sich (Phase 5). AltGr bleibt unberührt (Strg nur ohne Alt, wie in `keymap.ts`).

**Bedienung:** Eingabezeile oben, Ergebnisliste darunter in Gruppen. Leere Eingabe zeigt zuerst „Zuletzt benutzt“ (die **5** zuletzt ausgeführten Ziele und Befehle, neueste zuerst, ohne einzelne Chats und Projekte), dann die Gruppen. Tippen filtert unscharf über Name und Stichwörter; Chats werden zusätzlich nach Inhalt durchsucht und mit Ausschnitt gezeigt. ↑/↓ wählt, Enter führt aus, Esc schließt und gibt den Fokus zurück, Strg+K bei offener Palette schließt sie. Ohne Treffer: Hinweis (Text Phase 5). Sichtbar höchstens 8 Zeilen, dann Scrollen.

**Reihenfolge und Obergrenzen der Projekt- und Chat-Zeilen (P-14, P-15):**

| Lage | Projekte | Chats |
|---|---|---|
| Leere Eingabe | die **5** zuletzt benutzten, neueste zuerst | die **8** mit der jüngsten Aktivität, neueste zuerst |
| Mit Eingabe | Treffer nach Übereinstimmung, bei Gleichstand zuletzt benutzt zuerst; höchstens **5** | Treffer nach Übereinstimmung (Titel vor Inhalt), bei Gleichstand jüngste Aktivität zuerst; höchstens **8** |
| Geöffnet über „Alle anzeigen“ | alle Projekte, nach zuletzt benutzt, ohne Obergrenze (scrollt) | alle Chats, nach Aktivität, ohne Obergrenze (scrollt) |

Gruppenreihenfolge in der Liste: Zuletzt benutzt, Gehen zu, Befehle, Projekte, Chats, Chat (Kontext), Darstellung, Fenster, Hilfe. Rechts steht, wo vorhanden, das Kürzel. Sie öffnet auch mit vorgewähltem Bereich („Alle anzeigen“).

**Befehlsliste.** Jede Zeile hat eine ID für den Abgleich. Dynamische Zeilen (P-14, P-15) gibt es je Projekt und je Chat.

| ID | Gruppe | Zeile (DE / EN) | Aktion | Kürzel |
|---|---|---|---|---|
| P-01 | Gehen zu | Chat / Chat | `/chat` | |
| P-02 | Gehen zu | Vorlagen / Templates | `/templates` | |
| P-03 | Gehen zu | Code / Code | `/code` | |
| P-04 | Gehen zu | Modelle / Models | `/models` | |
| P-05 | Gehen zu | Wissen verwalten / Manage knowledge | `/knowledge` | |
| P-06 | Gehen zu | Skills verwalten / Manage skills | `/skills` | |
| P-07 | Gehen zu | E-Mail verwalten / Manage e-mail | `/mail` | |
| P-08 | Gehen zu | Status / Status | `/status` | |
| P-09 | Gehen zu | Einstellungen / Settings | `/settings` | Strg+, |
| P-10 | Chats | **Chats durchsuchen / Search chats** | Eingabe wirkt als Suche über Titel und Inhalt; Treffer öffnen `/chat/:id` | Strg+K |
| P-11 | Befehle | Neuer Chat / New chat | `/chat`, Fokus ins Eingabefeld | Strg+N |
| P-12 | Befehle | Neues Projekt / New project | legt ein Projekt an | |
| P-13 | Befehle | Seitenleiste ein-/ausklappen / Toggle sidebar | wie Strg+B | Strg+B |
| P-14 | Projekte | `<Projektname>` | `/projects/:id` (eine Zeile je Projekt) | |
| P-15 | Chats | `<Chat-Titel>` | `/chat/:id` (eine Zeile je Chat, mit Ausschnitt bei Inhaltstreffer) | |
| P-16 | Chat (nur im Chat) | Ins Eingabefeld springen / Focus input | fokussiert das Eingabefeld | Strg+L |
| P-17 | Chat (nur im Chat) | Chat-Einstellungen öffnen/schließen / Toggle chat settings | Seitenpanel | Strg+J |
| P-18 | Chat (nur bei laufender Antwort) | Antwort stoppen / Stop response | bricht ab | Esc |
| P-19 | Darstellung | Design: Hell · Dunkel · Wie Windows / Theme: Light · Dark · System | schaltet das Farbschema (3 Zeilen); ersetzt den Wechsler der alten Symbolleiste | |
| P-20 | Hilfe | Tastenkürzel anzeigen / Show shortcuts | öffnet die Übersicht | Strg+/ · F1 |
| P-21 | Fenster | Vergrößern / Zoom in | Zoom der Oberfläche +1 Stufe | Strg+Plus |
| P-22 | Fenster | Verkleinern / Zoom out | Zoom -1 Stufe | Strg+Minus |
| P-23 | Fenster | Zoom zurücksetzen / Reset zoom | Zoom auf 100 % | Strg+0 |
| P-24 | Fenster | Vollbild ein/aus / Toggle full screen | Vollbild | F11 |
| P-25 | Fenster | Entwicklerwerkzeuge / Developer tools | öffnet die Entwicklerwerkzeuge | Strg+Umschalt+I |
Zeilen mit „nur im Chat“ oder „nur bei laufender Antwort“ erscheinen nur dann (Nielsen 5: keine nutzlosen Möglichkeiten anbieten).

### Routen-Abgleich (Bestand aus `App.tsx`)

Jede Route genau **eine Zeile**, jede mit einem Zuhause. Die Palette ist für alle Routen ein zweiter Weg (Suche), kein zweites Zuhause.

| # | Route (heute) | Name | Zuhause / Einstieg | „+“-Menü? | Palette (ID) |
|---|---|---|---|---|---|
| 1 | `chat/:chatId?` | Chat | **Seitenleiste** (Bereich „Chat“); Chats öffnen aus „Letzte Chats“ | nein | P-01, P-15, P-10 |
| 2 | `templates/:templateId?` | Vorlagen | **Seitenleiste** (Bereich „Vorlagen“) | nein | P-02 |
| 3 | `mail/:messageId?` | E-Mail | **„+“-Menü**, Eintrag „E-Mail“ -> „Verwalten …“; zusätzlich **Einstellungen**, Eintrag „E-Mail“ | ja | P-07 |
| 4 | `code/:sessionId?` | Code | **Seitenleiste** (Bereich „Code“) | nein | P-03 |
| 5 | `knowledge/:collectionId?` | Wissen | **„+“-Menü**, Eintrag „Wissen“ -> „Verwalten …“; zusätzlich **Einstellungen**, Eintrag „Wissen verwalten“ | ja | P-05 |
| 6 | `skills/:skillId?` | Skills | **„+“-Menü**, Eintrag „Skills“ -> „Verwalten …“; zusätzlich **Einstellungen**, Eintrag „Skills verwalten“ | ja | P-06 |
| 7 | `models` | Modelle | **Seitenleiste** (Bereich „Modelle“) | nein | P-04 |
| 8 | `status` | Status | **Seitenleiste, Fuß** (Modellstatus -> Popup -> Status-Seite) | nein | P-08 |
| 9 | `settings` | Einstellungen | **Seitenleiste, Fuß** (Einstellungen), Strg+, | nein | P-09 |
| 10 | `projects/:projectId` | Projekt | **Seitenleiste, Liste „Projekte“** | nein | P-14 |

Abgleich: 10 von 10 Routen in `App.tsx` stehen genau einmal in der Tabelle. Seitenleiste, feste Einträge (**6**, wie in der Zählregel): Chat, Vorlagen, Code, Modelle, Modellstatus (-> Status), Einstellungen; dazu die Zeilen der Liste „Projekte“ (-> Projekt) und „Letzte Chats“ (-> Chat). „+“-Menü = {Wissen, Skills, E-Mail}. **Schnittmenge Leiste und „+“-Menü = leer.** Die drei Einträge in Einstellungen sind ein dritter Ort, weder Leiste noch „+“-Menü, und ändern die Schnittmenge nicht. Werkzeuge, Recherche und Internet im „+“-Menü sind Schalter ohne Route und stehen deshalb nicht in der Tabelle.

### Abgleich Gliederung -> Palette

Jedes Ziel der Gliederung hat eine Palettenzeile: Bereiche (P-01 bis P-04), Wissen, Skills, E-Mail (P-05 bis P-07, auch die drei Einstellungs-Einträge führen auf diese Ziele), Status (P-08), Einstellungen (P-09), Projekt (P-14), Chat (P-15). Die **Chat-Suche** ist P-10. Die Leistenfunktionen „Neues Projekt“ (P-12), „Seitenleiste“ (P-13) und der Design-Wechsler (P-19, aus der alten Symbolleiste) sind ebenfalls als Befehle da, dazu die Fensterfunktionen P-21 bis P-25.

### Menüzeile: Verbleib der Funktionen

Es gibt keinen eigenen Menü-Code in `src/main` (gesucht: `buildFromTemplate`, `setApplicationMenu`); die App zeigt das **Standardmenü von Electron**. Bei seinem Wegfall verschwinden auch dessen Kürzel, wo sie nur über das Menü liefen. Deshalb bekommt jede Funktion einen Verbleib:

| Funktion der Menüzeile | Verbleib | Palette |
|---|---|---|
| Zoom (Ansicht): Vergrößern, Verkleinern, Zurücksetzen | Kürzel **Strg+Plus**, **Strg+Minus**, **Strg+0** | P-21, P-22, P-23 |
| Vollbild (Ansicht) | Kürzel **F11** | P-24 |
| Entwicklerwerkzeuge (Ansicht) | Kürzel **Strg+Umschalt+I** | P-25 |
| Bearbeiten: Ausschneiden, Kopieren, Einfügen, Alles auswählen, Rückgängig | Standardkürzel des Systems (Strg+X, C, V, A, Z) und Kontextmenü in Eingabefeldern; im Code-Umbau prüfen, dass sie ohne Menü weiter wirken | nein |
| Fenster minimieren, schließen | Fensterknöpfe der Titelleiste (Alt+F4 wie unter Windows üblich) | nein |
| Neu laden (Strg+R), Erzwungen neu laden | **Nicht vom Nutzer genannt.** Vorschlag: bleibt als Kürzel (Entwickler-Hilfe), kein Palettenbefehl; im Code-Umbau-Plan entscheiden | nein |

Alle Kürzel kommen in die zentrale Kürzel-Verwaltung (`keymap.ts`) und die Übersicht (Strg+/). AltGr-Regel bleibt (Strg nur ohne Alt).

### Verlagerungen gegenüber heute (zur Bestätigung)

| Heute | Neu | Wirkung |
|---|---|---|
| Symbolleiste links (60 px, ohne Namen) plus Chatliste (270 px) | eine beschriftete Seitenleiste | Zwei Leisten werden eine. |
| Wissen, Skills, E-Mail als Einträge der Symbolleiste | „+“-Menü („Verwalten …“), je ein Eintrag in Einstellungen („Wissen verwalten“, „Skills verwalten“, „E-Mail“) und Palette; nicht in der Seitenleiste | Risiko Auffindbarkeit (Nielsen 6) **gemildert**: zwei sichtbare Einstiege plus Palette. Restrisiko: Der Weg führt über „+“ oder Einstellungen statt über einen Klick in der Leiste. |
| Strg+B klappt die Chatliste ein | klappt die ganze Seitenleiste ein, auf jeder Seite | Bedeutung erweitert. |
| Strg+K fokussiert die Chat-Suche (wechselt zum Chat) | öffnet die Palette von jeder Seite | Bedeutung erweitert. |
| Design-Wechsler in der Symbolleiste (system, hell, dunkel) | in Einstellungen und als Palettenbefehl P-19 | Verlagerung, vom Nutzer bestätigt. |
| Menüzeile (File, Edit, View) | entfällt, eigene Titelleiste | Funktionen bleiben als Kürzel und Befehle (Tabelle „Menüzeile: Verbleib der Funktionen“). |
| Ordner im Code, „Projekt“ im UI | durchgehend „Projekt“ | Begriffstabelle Phase 5. |

### Validation

**NOT VALIDATED durch Test.** Kartensortieren und Baumtest sind mit einem einzelnen Nutzer nicht möglich (Rosenfeld/Morville verlangen sie vor dem Sperren der Beschriftungen). Ersatz: ausdrückliche Bestätigung durch den Nutzer (Plan, DW-1.6). **Bestätigung: erteilt am 2026-11-12**, mit den Ergänzungen zu Einstellungen und Menüzeile, die hier eingearbeitet sind. Sie ersetzt keinen Test (Sitemap ist nicht IA); fällt im Alltag etwas nicht auf, wird die Gliederung hier korrigiert.

---

## Flows

**Stand:** Phase 2, geschrieben am 2026-11-12, **vom Nutzer noch nicht bestätigt**. Grundlage: der Code unter `src/renderer` (gelesen, nicht geändert) und die freigegebenen Drahtgitter-Mocks. Alle Abläufe sind User Flows mit Verzweigungen (NN/g, „User Flows vs. Task Flows“). Schreibweise: **Schritt** = Handlung oder Fläche, **Entscheidung** = Verzweigung mit „ja“ und „nein“. Blöcke wie `EF-6` verweisen auf die Seiten-Specs unten.

**Für alle Abläufe gilt:** Wo der Nutzer wählt, stehen höchstens drei Möglichkeiten (Hick–Hyman 1952); Verzweigungen mit mehr Ästen sind Prüfungen der App, keine Wahl. Die Hauptaktion ist das größte Ziel und liegt am Eingabefeld oder an der Karte, an der der Blick schon ist (Fitts 1954). Kein Ablauf endet in einer Sackgasse: Jeder Fehlerpfad nennt die Ursache und den nächsten Schritt (Nielsen 9).

### Ablauf 1: Erste Nachricht von der Startseite

**Art:** User Flow · **Einstieg:** App-Start, Bereich „Chat“, Strg+N oder Palette P-11 · **Ziel:** eine Antwort auf die erste Frage, der Chat ist gespeichert und wiederzufinden.

1. Startseite „Dein PC“ erscheint. Der Cursor steht im Eingabefeld (`SS-4`).
2. **Entscheidung: Ist ein Modell wählbar?**
   - ja: Die Modellauswahl zeigt das zuletzt gewählte Modell, sonst das erste installierte. Weiter bei 3.
   - nein, Ollama antwortet nicht: Ablauf 5.
   - nein, Ollama läuft, aber kein Modell ist installiert: Das Eingabefeld ist gesperrt und nennt den Grund. Die Karte „Geladenes Modell“ führt zu „Modelle“ (`MO-2`, herunterladen). Nach dem Download ist das Feld ohne Neustart frei.
3. Text tippen. Wahlweise vorher eine Vorlage wählen (`SS-6`, erscheint als Chip) oder einen Einstieg anklicken (`SS-5`).
4. Enter oder „Senden“. Umschalt+Enter macht eine neue Zeile.
5. Der Chat wird angelegt, die Ansicht wechselt in den laufenden Chat, der neue Chat steht oben in „Letzte Chats“. „Senden“ wird zu „Stopp“.
6. Die Antwort baut sich auf: Wartezeile („Modell wird geladen“), Gedanken (aufklappbar), Text.
7. **Entscheidung: Läuft die Antwort durch?**
   - ja: Statistikzeile und Aktionen erscheinen. Ende.
   - Nutzer stoppt (Stopp, Esc, Palette P-18): Die Antwort bleibt bis dorthin stehen, markiert als abgebrochen. „Antwort wiederholen“ ist da.
   - Fehler: siehe Fehlerpfade.

**Fehlerpfade:**
- Modellliste lässt sich nicht laden: Meldung mit Ursache an der Stelle des Verlaufs, Eingabefeld gesperrt, Weg zur Status-Seite.
- Antwort bricht mit Fehler ab: Die Meldung steht in der Nachricht. „Antwort wiederholen“ und „Bearbeiten“ an der eigenen Nachricht bleiben.
- Modell passt nicht ganz in den Grafikspeicher: kein Abbruch; die Status-Seite und das Seitenpanel (GPU) nennen den Grund für die langsame Antwort.

**Erfolg:** Antwort steht, Chat hat einen Titel in der Leiste, das Eingabefeld ist wieder frei.

### Ablauf 2: Anhang und Schalter über das „+“-Menü, mit Chip

**Art:** User Flow · **Einstieg:** Eingabefeld auf der Startseite oder im Chat · **Ziel:** eine Nachricht mit Datei und eingeschaltetem Extra senden und jederzeit sehen, was eingeschaltet ist.

1. Datei anhängen: Büroklammer (`EF-6`), Ziehen auf das Fenster (`EF-1`) oder Strg+V.
2. **Entscheidung: Lässt sich die Datei verwenden?**
   - ja: Sie erscheint in der Anhang-Zeile (`EF-3`) mit Namen und Größe (Seiten, Tokens oder Zeilen und Spalten). Solange sie gelesen wird, steht dort „Wird gelesen“, „Senden“ ist gesperrt.
   - nein: Meldung im Eingabefeld (`EF-4`) mit Grund und Ausweg: zu groß, nicht lesbar, HEIC-Foto, zu viele (höchstens 4 Bilder, höchstens 3 Dateien und Tabellen zusammen), oder Bild bei einem Modell ohne Bild-Fähigkeit (mit Vorschlag eines passenden installierten Modells). Die übrigen Dateien werden trotzdem angehängt.
3. **Entscheidung: Passt die Datei in den Kontext?**
   - ja: weiter.
   - nein, mehr Kontext ist möglich: Hinweis mit Knopf „Kontextlänge auf N erhöhen“.
   - nein, auch der größte Kontext reicht nicht: Hinweis nennt den Ausweg (kürzere Datei oder Wissen).
4. „+“ öffnen (`EF-7`). Sechs Zeilen: Wissen, Werkzeuge, Skills, E-Mail, Recherche, Internet.
5. Eine Zeile wählen, zum Beispiel „Internet“. Das Untermenü (`EF-8`) öffnet sich, dort „Webseiten lesen“ anhaken.
6. **Entscheidung: Fehlt eine Voraussetzung?**
   - nein: Der Chip „Internet“ erscheint (`EF-2`), die Zeile zeigt ihren Zustand.
   - Das Modell kann keine Werkzeuge: Warnung im Untermenü und Warnzeichen an der Zeile; der Haken bleibt möglich, der Hinweis nennt geeignete Modelle.
   - Für „Im Web suchen“ fehlt der Schlüssel: Hinweis mit Weg zu Einstellungen → Internet-Suche.
   - Nichts eingerichtet (keine Sammlung, kein Server, kein Skill, kein Konto): Das Untermenü sagt, was fehlt, und führt zur Verwaltung.
7. Menü schließen (Esc oder Klick daneben). Der Fokus kehrt auf „+“ zurück.
8. Senden. Schalter und Auswahl bleiben für diesen Chat gespeichert, der Chip bleibt stehen. Ausnahme Recherche: gilt nur für die nächste Nachricht (Ablauf 6).
9. Ausschalten: × am Chip oder Haken im Untermenü entfernen. Ein Klick auf den Chip-Namen öffnet das Untermenü direkt.

**Fehlerpfade:** siehe Schritte 2, 3 und 6. Zusätzlich: Recherche eingeschaltet und Datei angehängt → Meldung, dass bei einer Recherche keine Dateien mitgehen; nichts wird gesendet, Text und Anhang bleiben.

**Erfolg:** Nachricht mit Anhang ist gesendet, eingeschaltete Extras stehen als Chips über dem Textfeld.

### Ablauf 3: Werkzeug-Rückfrage erlauben oder ablehnen

**Art:** User Flow · **Einstieg:** laufende Antwort, das Modell will ein Werkzeug benutzen · **Ziel:** Der Nutzer entscheidet vor jeder folgenreichen Aktion und sieht, was geschehen ist.

1. In der Antwort erscheint eine Werkzeug-Zeile (`CH-3`).
2. **Entscheidung der App: Braucht dieses Werkzeug eine Freigabe?**
   - nein (nur lesend oder „Immer“ erlaubt): Die Zeile zeigt „läuft“, dann „fertig“. Aufklappen zeigt Eingabe und Ergebnis. Weiter bei 6.
   - ja: Die Zeile zeigt „wartet auf Freigabe“ und darunter die Rückfrage-Karte. Die Antwort wartet.
3. Die Karte zeigt: was das Modell tun will, über welchen Server, eine Warnung bei verändernden Werkzeugen und die Vorschau (Vorher/Nachher bei Dateien, der Befehl, die Adresse, die Mail-Änderung).
4. **Entscheidung des Nutzers** (höchstens drei Knöpfe):
   - **Einmal erlauben** (je nach Art „Erlauben“, „Übernehmen“, „Ausführen“, „Committen“): gilt nur für diesen Aufruf.
   - **Immer erlauben** (nur wo angeboten): gilt für dieses Werkzeug auf diesem Server, auch in anderen Chats. Die Karte sagt das und nennt, wo es sich ändern lässt (Einstellungen → MCP-Server).
   - **Ablehnen:** Das Werkzeug läuft nicht.
5. Sonderformen derselben Stelle: „Erinnerung speichern“ (Text kürzen, Geltung wählen, speichern oder ablehnen) und „Zugriff anfragen“ (Postfach oder Datei-Server wählen; „Für diesen Chat erlauben“, „Nur diese Antwort“, „Ablehnen“).
6. Die Zeile zeigt das Ergebnis: fertig, abgelehnt, Fehler oder abgebrochen. Die Antwort läuft weiter.
7. Im Code-Bereich hat jede Änderung zusätzlich „Rückgängig“ an ihrer Zeile.

**Fehlerpfade:**
- Werkzeug meldet einen Fehler: Zeile „Fehler“, das Ergebnis ist aufklappbar, das Modell antwortet weiter.
- Nutzer reagiert nicht: Die Antwort wartet ohne Zeitlimit. Stopp und Esc beenden sie; die Zeile zeigt „abgebrochen“.
- Nichts freizugeben (kein Konto, kein Server): Die Karte sagt das und führt zu den Einstellungen; es bleibt nur „Ablehnen“.
- Rückgängig im Code-Bereich trifft auf spätere Änderungen: Bestätigungsdialog nennt den Verlust, bevor zurückgesetzt wird.
- Server auf einem anderen Rechner: Jedes Werkzeug fragt nach, auch lesende; „Immer“ greift dort nicht.

**Erfolg:** Die Entscheidung steht sichtbar in der Zeile, die Antwort ist vollständig.

### Ablauf 4: Strg+K bis zum Ziel

**Art:** User Flow · **Einstieg:** jede Seite, Strg+K oder Suchzeile der Leiste oder „Alle anzeigen“ · **Ziel:** in einem Zug zu einer Seite, einem Befehl, einem Projekt oder einem Chat.

1. Palette öffnet sich über der Seite. Der Cursor steht in der Eingabezeile (`PA-1`).
2. **Entscheidung: Tippt der Nutzer?**
   - nein: „Zuletzt benutzt“ und die Gruppen stehen da (`PA-2`, `PA-3`). ↑/↓ und Enter genügen.
   - ja: Die Liste filtert bei jedem Zeichen. Seiten und Befehle erscheinen sofort, Treffer aus Chat-Inhalten kommen nach.
3. **Entscheidung: Gibt es Treffer?**
   - ja: Der oberste ist vorgewählt.
   - nein: Hinweis „nichts gefunden“ mit dem getippten Wort; die Eingabe bleibt stehen und lässt sich ändern.
4. Enter oder Klick führt aus.
5. **Entscheidung: Was war die Zeile?**
   - Seite, Projekt oder Chat: Die Palette schließt, die Seite wechselt, der Fokus steht auf ihrer Überschrift. Bei einem Treffer im Inhalt springt der Chat zur Nachricht und hebt sie kurz hervor.
   - Befehl (Design wechseln, Seitenleiste, Zoom): wird ausgeführt, die Palette schließt, der Fokus kehrt an die alte Stelle zurück.
6. Esc oder Strg+K schließt ohne Aktion; der Fokus kehrt an die alte Stelle zurück.

**Fehlerpfade:**
- Die Chat-Suche schlägt fehl: Eine Zeile in der Gruppe „Chats“ nennt das; Seiten und Befehle bleiben benutzbar.
- Der gewählte Chat existiert nicht mehr: Die App öffnet einen neuen Chat (heutiges Verhalten).
- Eine Zeile gilt gerade nicht („Antwort stoppen“ ohne laufende Antwort): Sie wird nicht angeboten.

**Erfolg:** Das Ziel ist offen oder der Befehl ausgeführt, ohne Umweg über eine andere Seite.

### Ablauf 5: Ollama nicht erreichbar, bis wieder bereit

**Art:** User Flow · **Einstieg:** App-Start ohne Ollama, oder Ollama fällt während der Arbeit aus · **Ziel:** Der Nutzer weiß, was los ist und was zu tun ist, und sieht, wenn es wieder geht.

1. Die App fragt Ollama regelmäßig. Antwortet es nicht, wechselt der Modellstatus am Fuß der Leiste (`RA-6`) auf „nicht erreichbar“ (Text und Form, nicht nur Farbe).
2. Auf der Startseite und im Chat erscheint über dem Eingabefeld ein Banner: welcher Server nicht antwortet. Das Eingabefeld ist gesperrt und nennt den Grund.
3. Die App prüft die anderen eingetragenen Server.
4. **Entscheidung: Ist ein anderer Server erreichbar?**
   - ja: Der Banner nennt **einen** Server mit den Folgen: hat das Modell oder nicht, Wissen geht dort oder nicht, wohin die Daten dann gehen. Knopf „Zu diesem Server wechseln“. Sind mehrere erreichbar, steht der erste in der Reihenfolge der Einstellungen da; die übrigen liegen hinter „weitere Server (n)“ (aufklappbar, gleiche Angaben). So bleibt die Wahl bei wechseln oder nicht (Hick–Hyman 1952). Weiter bei 5.
   - nein: Der Banner sagt das und führt zu Einstellungen → Ollama-Server. Was zu tun ist (Ollama starten), steht im Text (Phase 5). Weiter bei 6.
5. **Entscheidung: Wechseln?**
   - ja: Modelle und Status kommen vom neuen Server. Fehlt dort das Modell, wird ein anderes gewählt und das gesagt. Arbeit geht weiter.
   - nein: wie 4 „nein“.
6. Der Nutzer startet Ollama außerhalb der App. Die Abfrage läuft weiter, niemand muss neu laden.
7. Ollama antwortet wieder: Der Modellstatus wechselt zurück, das Eingabefeld wird frei, der Banner verschwindet.
8. **Entscheidung (nur nach einem Wechsel): Zurück zum ursprünglichen Server?** Der Banner meldet, dass er wieder erreichbar ist: „Zurück“ oder „Hier bleiben“.

**Fehlerpfade:**
- Ausfall mitten in einer Antwort: Die Antwort endet mit Fehlermeldung in der Nachricht; „Antwort wiederholen“ bleibt. Der getippte Text im Eingabefeld bleibt erhalten.
- Ausfall, während eine Rückfrage-Karte wartet (Ablauf 3): Die Antwort endet mit der Fehlermeldung, die Werkzeug-Zeile wechselt auf „abgebrochen“, die Knöpfe der Karte sind nicht mehr bedienbar, und nichts wird ausgeführt. Nach der Rückkehr stellt „Antwort wiederholen“ die Frage neu; eine alte Freigabe gilt nicht weiter. (Zielverhalten; im Code-Umbau gegen das heutige Verhalten prüfen.)
- Ollama läuft, aber kein Modell ist installiert: kein Banner; das Eingabefeld nennt den Grund und führt zu „Modelle“.
- Keine NVIDIA-Karte oder Server auf anderem Rechner: kein Fehler. Die Grafikkarten-Anzeige sagt, warum sie nichts misst; die geladenen Modelle zeigen, was Ollama meldet.
- Andere Seiten: Modelle zeigt die Fehlermeldung mit „Aktualisieren“, Status zeigt die Verbindung als unterbrochen, Vorlagen, Skills, Einstellungen und Projekt bleiben benutzbar.

**Erfolg:** Modellstatus zeigt wieder ein bereites System, das Eingabefeld ist frei. Das Ende der Störung ist sichtbar und ruhig (Peak-End, Kahneman): Ohne Serverwechsel kehrt der Zustand zurück, ohne dass der Nutzer etwas bestätigen muss. Nach einem Wechsel arbeitet er ungestört auf dem Ausweich-Server weiter; die Frage aus Schritt 8 („Zurück“ oder „Hier bleiben“) ist ein Angebot im Banner, das die Arbeit nicht anhält.

### Ablauf 6: Recherche starten

**Art:** User Flow · **Einstieg:** „+“-Menü → Recherche, oder Einstieg „Recherche“ auf der Startseite · **Ziel:** ein Bericht mit Quellen, nach bewusster Zustimmung.

1. Recherche einschalten. Der Chip „Recherche“ erscheint.
2. Frage tippen, Enter.
3. **Entscheidung: Hängt eine Datei oder ein Bild an?**
   - ja: Meldung, dass bei einer Recherche nichts mitgeht. Anhang entfernen oder Recherche ausschalten. Zurück zu 2.
   - nein: Statt zu senden öffnet sich die Startkarte im Eingabefeld (`EF-4`).
4. Die Startkarte zeigt: die Frage, drei Stufen (Schnell, Normal, Gründlich) mit Zahl der Suchen, Seiten und Dauer, und den Hinweis, was dabei den PC verlässt.
5. **Entscheidung: Fehlt eine Voraussetzung?**
   - Schlüssel fehlt: Warnung mit Weg zu Einstellungen → Internet-Suche. „Starten“ ist gesperrt.
   - Kontext zu klein, mehr ist möglich: Warnung mit Knopf „Kontextlänge auf N erhöhen“.
   - Kontext zu klein, Modell kann nicht mehr: Warnung nennt den Ausweg (kleinere Stufe oder anderes Modell).
   - nichts fehlt: weiter.
6. **Entscheidung: Starten oder Abbrechen?**
   - Starten (zugleich die Zustimmung): Die Frage wird gesendet. Der Chip verschwindet, weil der Schalter nur für diese Nachricht gilt.
   - Abbrechen: Die Karte schließt, Text und Chip bleiben.
7. Die Antwort zeigt den Fortschritt als Werkzeug-Zeilen (Plan, Suche, Seiten lesen). „Stopp“ ist die ganze Zeit da.
8. Der Bericht erscheint mit Quellen.

**Fehlerpfade:** Abbruch durch den Nutzer → das bis dahin Gesammelte bleibt in den Zeilen sichtbar, die Antwort ist als abgebrochen markiert. Suche oder Seite schlägt fehl → die betroffene Zeile zeigt „Fehler“, die Recherche läuft mit dem Rest weiter oder endet mit Meldung in der Nachricht. Ollama fällt aus → Ablauf 5.

**Erfolg:** Bericht mit Quellen steht im Chat, die Recherche ist wieder ausgeschaltet.

### Ablauf 7: Wissen vom Chat aus verwalten und zurück

**Art:** User Flow · **Einstieg:** „+“-Menü → Wissen → „Verwalten …“; gleichwertig: Einstellungen → „Wissen verwalten“ oder Palette P-05 · **Ziel:** eine Sammlung anlegen oder auffrischen und im Chat benutzen.

1. „+“ → Wissen. Das Untermenü zeigt die Sammlungen mit Haken.
2. **Entscheidung: Gibt es die gesuchte Sammlung, und ist sie aktuell?**
   - ja: anhaken, Chip erscheint. Ende.
   - nein: „Verwalten …“ (letzter Punkt des Untermenüs).
3. Die Seite „Wissen“ öffnet sich. Ihr Seitenkopf zeigt „Zurück zum Chat“, solange der Nutzer von dort kam.
4. „Neue Sammlung“, Namen vergeben, Ordner oder Dateien hinzufügen, „Einlesen“.
5. **Entscheidung: Läuft das Einlesen durch?**
   - ja: Ergebniszeile (neu, geändert, entfernt, unverändert) und Dateiliste.
   - Embedding-Modell fehlt: Warnung mit Weg zu „Modelle“.
   - Ollama nicht erreichbar: Einlesen ist gesperrt und nennt den Grund.
   - einzelne Dateien scheitern: Die Liste zeigt sie mit Grund; Filter „nur Probleme“.
   - abgebrochen: Fertiges bleibt, der Rest kommt beim nächsten Mal.
6. „Zurück zum Chat“. Im „+“-Menü steht die neue Sammlung, anhaken.

**Fehlerpfade:** siehe Schritt 5. Hinweis für den Code-Umbau: Heute geht ein getippter, noch nicht gesendeter Text verloren, wenn die Seite gewechselt wird. Der Umbau soll den Entwurf je Chat behalten, sonst kostet „Verwalten …“ Arbeit (Nielsen 3, Kontrolle und Freiheit).

**Erfolg:** Die Sammlung ist eingelesen und im Chat eingeschaltet.

---

## Page specs

**Stand:** Phase 2, geschrieben am 2026-11-12, **vom Nutzer noch nicht bestätigt**. 15 Flächen. Farben, Schrift und fertige Texte fehlen hier mit Absicht (Phasen 3 und 5), Diagramm- und Tabellen-Regeln ebenso (Phase 6). Jeder Block hat eine Kennung (`RA-1`, `EF-7` …); die Abgleich-Tabelle am Ende ordnet jedes heutige Bedienelement einem Block zu.

### Gemeinsame Regeln für alle Flächen

**Seitenkopf-Muster.** Jede Seite beginnt mit einem Seitenkopf: Überschrift (bekommt den Fokus nach einem Seitenwechsel), rechts die Aktionen der Seite. Höchstens eine Aktion ist als Hauptaktion hervorgehoben; Löschen steht räumlich getrennt davon (Fitts 1954). Wer über „Verwalten …“ aus einem Chat kam, sieht links von der Überschrift „Zurück zum Chat“.

**Liste und Detail.** Vorlagen, Wissen, Skills, E-Mail und Code haben links eine Liste und rechts das Gewählte. Die Liste gehört zur Seite, nicht zur Seitenleiste. Ist nichts gewählt, zeigt die rechte Seite, was hier hingehört, und die Hauptaktion (Antwort auf die Beschwerde „kahl“).

**Leere Zustände.** Ein leerer Zustand sagt in einem Satz, was hier steht, sobald etwas da ist, und bietet genau eine Aktion an. Ist Ollama die Ursache, nennt er diese Ursache statt „noch nichts da“ (Nielsen 9).

**Muster „Ollama nicht erreichbar“** (gilt, wo die Zustands-Tabelle darauf verweist): (1) Der Modellstatus am Fuß der Leiste zeigt es auf jeder Seite. (2) Flächen mit Eingabefeld zeigen den Ausweich-Banner und sperren das Feld mit Grund. (3) Flächen mit Daten von Ollama zeigen statt der Daten die Ursache und den Weg zur Status-Seite. (4) Die Rückkehr geschieht von selbst über die laufende Abfrage. Ablauf 5 beschreibt den Weg.

**Folgenreiches wird bestätigt.** Löschen fragt immer über den Bestätigungsdialog (`RA-7`) und nennt, was erhalten bleibt (heutiges Verhalten, bleibt).

**Breiten.** Maßgeblich ist die **Inhaltsbreite** = Fensterbreite − Leiste (272 oder 64 px) − Flächenrand (12 px). Rechnung und Grenze 1100 px für die Leiste stehen in §IA und gelten weiter.

| Fenster | Leiste | Inhaltsbreite | Stufe |
|---|---|---|---|
| 900 px (Minimum) | eingeklappt (erzwungen) | 824 px | schmal |
| 1100 px | ausgeklappt | 816 px | schmal |
| 1100 px | eingeklappt | 1024 px | breit |
| 1440 px | ausgeklappt | 1156 px | breit |
| 1440 px | eingeklappt | 1364 px | breit |

Stufe **schmal** = Inhaltsbreite unter 1000 px, **breit** = ab 1000 px. Nichts scrollt waagerecht, nichts wird abgeschnitten. Was sich je Stufe ändert, steht bei der Fläche unter „Breite“. Lesespalten (Chat, Startseite) sind höchstens 800 px breit und stehen mittig; Formulare höchstens 720 px.

---

### 1. Rahmen (Titelleiste und Seitenleiste)

**Zweck:** Hält auf jeder Seite dieselben Wege bereit: Fenster bedienen, Bereich wechseln, suchen, Projekte und letzte Chats öffnen, den Zustand von Ollama sehen.

**Einstiege:** immer sichtbar. Seitenleiste ein- und ausklappen: Knopf im Kopf, Strg+B, Palette P-13.

**Blöcke (in Reihenfolge):**
1. `RA-1` **Titelleiste.** Ziehfläche, leiser Name, Fensterknöpfe rechts (Minimieren, Maximieren oder Wiederherstellen, Schließen). Doppelklick maximiert.
2. `RA-2` **Leisten-Kopf.** Marke, Knopf zum Einklappen, Suchzeile mit sichtbarem „Strg+K“ (öffnet die Palette).
3. `RA-3` **Bereiche.** Chat, Vorlagen, Code, Modelle. Der aktuelle ist hervorgehoben. „Chat“ öffnet immer einen neuen, leeren Chat (die Startseite).
4. `RA-4` **Projekte.** Kopf (klappt die Gruppe ein und aus) mit „+“ für ein neues Projekt: Ein Namensfeld erscheint in der Liste, Enter legt an, Esc verwirft. Zeilen: Projektname, Marke „hat Anweisungen oder Dokumente“. Klick öffnet die Projektseite. Jede Zeile ist Ablageziel für einen gezogenen Chat. Zeilenmenü: Umbenennen (an Ort und Stelle), Löschen. Darunter „Alle anzeigen (n)“.
5. `RA-5` **Letzte Chats.** Kopf (klappt ein und aus). Zeilen: Titel, Datum im Tooltip, ziehbar auf ein Projekt. Klick öffnet den Chat. Zeilenmenü: Verschieben nach … (Projekte und „ohne Projekt“), Umbenennen (an Ort und Stelle), Löschen. Darunter „Alle anzeigen“.
6. `RA-6` **Fuß.** Modellstatus: erreichbar oder nicht, geladenes Modell und Größe; weitere geladene Modelle als „+n“; ohne geladenes oder ohne installiertes Modell der passende Satz (Zustand „Leer“). Klick öffnet das Status-Popup (Grafikkarte, geladene Modelle, „Ganze Seite“, Schließen). Daneben oder darunter „Einstellungen“.
7. `RA-7` **Überlagerungen des Rahmens.** Bestätigungsdialog (Frage, was betroffen ist, Abbrechen, Bestätigen oder Löschen) und Tastenkürzel-Übersicht (Strg+/ oder F1, Liste aller Kürzel, Schließen). Beide halten den Fokus und geben ihn beim Schließen zurück.
8. `RA-8` **Hauptfläche.** Platz der jeweiligen Seite, beginnt mit dem Seitenkopf-Muster.

Das Zeilenmenü öffnet über einen Knopf „Mehr“, der bei Mauszeiger und bei Tastatur-Fokus an der Zeile erscheint, und über die Kontextmenü-Taste. Die drei heutigen Symbole je Zeile werden damit zu einem beschrifteten Menü (Beschwerde „Symbole ohne Namen“).

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | **Projekte ohne Projekt:** unter dem Kopf ein Satz, wozu Projekte da sind (Chats bündeln, mit eigenen Anweisungen und Dokumenten), und die Aktion „Neues Projekt“ (öffnet das Namensfeld wie das „+“). **Letzte Chats ohne Chat:** ein Satz, dass hier die Chats nach Aktivität stehen, und die Aktion „Neuer Chat“ (Startseite, Cursor im Eingabefeld). Eingeklappt zeigen die Popover der beiden Listen dasselbe. Wortlaut: Phase 5. **Fuß ohne Modell:** Ollama erreichbar, nichts geladen → „kein Modell geladen“ (wird beim ersten Senden geladen), das Popup sagt dasselbe; Ollama erreichbar, nichts installiert → „kein Modell installiert“ mit Weg zu „Modelle“. Die Bereiche sind nie leer. |
| Keine NVIDIA-Karte oder Server auf anderem Rechner | Kein Fehler, ein normaler Zustand: Der Fuß zeigt Modell und Größe wie sonst. Im Status-Popup sagt der Teil „Grafikkarte“ in einem Satz, warum er nichts misst, und verweist auf die geladenen Modelle darunter, die zeigen, wie viel Speicher Ollama meldet. |
| Lädt | Listen: Platzhalter-Zeilen, bis die gespeicherten Chats gelesen sind. Modellstatus: „prüfe Verbindung“. |
| Fehler | Listen lassen sich nicht lesen: Hinweis in der Listen-Zone mit Ursache; Bereiche, Suche und Fuß bleiben benutzbar. Anlegen, Umbenennen oder Verschieben scheitert: Meldung an der Zeile, der alte Stand bleibt. |
| Ollama nicht erreichbar | Modellstatus zeigt es mit Text und Form. Das Popup nennt den Server und führt zur Status-Seite. Alles andere im Rahmen bleibt benutzbar (liest nur gespeicherte Daten). |
| Eingeklappt und Überlagerung | siehe §IA „Eingeklappter Zustand“ und „Verhalten bei 900 px“. |

**Hauptaktion:** keine eigene. Am häufigsten: „Chat“ (neuer Chat) und die Suchzeile.

**Ausgang:** jede Seite der Gliederung; die Palette; die Status-Seite über das Popup.

**Breite:** siehe §IA (ab 1100 px gilt der gemerkte Zustand, darunter eingeklappt, Ausklappen als Überlagerung).

---

### 2. Befehlspalette

**Zweck:** Bringt von jeder Seite aus in einem Zug zu einer Seite, einem Befehl, einem Projekt oder einem Chat, und durchsucht die Chats nach Titel und Inhalt.

**Einstiege:** Strg+K, Suchzeile der Leiste (`RA-2`), Lupe der eingeklappten Leiste, „Alle anzeigen“ unter Projekte und Letzte Chats (öffnet mit vorgewähltem Bereich).

**Blöcke (in Reihenfolge):**
1. `PA-1` **Eingabezeile.** Suchfeld mit Platzhalter. Bei vorgewähltem Bereich steht davor eine Marke („Projekte“ oder „Chats“); Rücktaste im leeren Feld entfernt sie.
2. `PA-2` **Zuletzt benutzt.** Nur bei leerer Eingabe: die fünf zuletzt ausgeführten Ziele und Befehle.
3. `PA-3` **Ergebnisgruppen.** In der Reihenfolge aus §IA: Gehen zu, Befehle, Projekte, Chats, Chat (Kontext), Darstellung, Fenster, Hilfe. Leere Gruppen erscheinen nicht.
4. `PA-4` **Ergebniszeile.** Symbol, Name, bei Chats eine zweite Angabe (Projekt, Datum oder Textausschnitt mit dem Treffer), rechts das Kürzel. Genau eine Zeile ist gewählt.
5. `PA-5` **Fußzeile.** Tastenhinweise: ↑↓ wählen, Enter ausführen, Esc schließen.

Inhalt und Obergrenzen der Zeilen: Befehlsliste P-01 bis P-25 in §IA. Bedienung per Tastatur: §IA und Ablauf 4.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Leere Eingabe: `PA-2` und die Gruppen. Frische App ohne Verlauf: nur „Gehen zu“ und „Befehle“; Projekte und Chats fehlen, statt leere Überschriften zu zeigen. Kein Treffer: Hinweis mit dem getippten Wort und genau eine Aktion, „Eingabe leeren“ (zeigt wieder alle Ziele; bei vorgewähltem Bereich die volle Liste). Die Eingabe bleibt und lässt sich ändern. |
| Lädt | Seiten und Befehle sind sofort da. In der Gruppe „Chats“ steht eine Zeile „sucht in Chats“, bis die Inhaltssuche fertig ist; die Wahl springt dabei nicht. |
| Fehler | Die Chat-Suche scheitert: eine Zeile in „Chats“ nennt das. Alles andere bleibt benutzbar. |
| Ollama nicht erreichbar | Trifft nicht zu: Die Palette liest nur gespeicherte Chats und feste Befehle, nichts von Ollama. Der Zustand selbst ist am Fuß der Leiste sichtbar. |

**Hauptaktion:** Enter führt die gewählte Zeile aus.

**Ausgang:** die gewählte Seite (Fokus auf ihrer Überschrift) oder zurück an die alte Stelle (nach Befehl, Esc, Strg+K).

**Breite:** 640 px, höchstens Fensterbreite minus 48 px; höchstens 8 sichtbare Zeilen, bei 600 px Fensterhöhe höchstens 6.

---

### 3. Startseite „Dein PC“

**Zweck:** Zeigt beim Ankommen ohne Klick, dass alles auf diesem PC läuft und bereit ist, und lässt sofort die erste Frage stellen.

**Einstiege:** App-Start, Bereich „Chat“, Strg+N, Palette P-01 und P-11, „Neuer Chat im Projekt“ (dann mit Projekt-Marke), „Chat damit starten“ auf der Vorlagen-Seite (dann mit Vorlagen-Chip). Technisch ist sie der Chat ohne Nachricht (`/chat` ohne Kennung).

**Blöcke (in Reihenfolge):**
1. `SS-1` **Kopf.** Überschrift „Dein PC“ und eine Zeile darunter. Gehört der neue Chat zu einem Projekt: Projekt-Marke mit Link zur Projektseite.
2. `SS-2` **PC-Status.** Zwei Karten nebeneinander, beide führen zur Status-Seite. Karte „Geladenes Modell“: Name, Größe, Fähigkeiten; mehrere geladene als „+n weitere“. Karte „Grafikspeicher“: belegt und frei von gesamt, als Zahl und als Balken (Regeln Phase 6).
3. `SS-3` **Banner-Zone.** Nur bei Bedarf: Ausweich-Banner (Ollama nicht erreichbar, wieder erreichbar).
4. `SS-4` **Eingabefeld.** Die Fläche 5 in voller Breite der Spalte, mit Fokus.
5. `SS-5` **Einstiege.** Vier Kacheln, jede mit Titel und einer Zeile. Sie stellen das Eingabefeld ein und setzen den Cursor hinein, sie senden nichts:
   - **Tabelle auswerten:** öffnet die Dateiauswahl für Tabellen (CSV, TSV, Excel).
   - **Recherche:** schaltet Recherche ein (Chip).
   - **E-Mail zusammenfassen:** schaltet E-Mail ein; bei mehreren Konten öffnet sich das Untermenü.
   - **Aus Wissen fragen:** schaltet Wissen ein; bei mehreren Sammlungen öffnet sich das Untermenü.
   Fehlt die Voraussetzung (kein Konto, keine Sammlung, kein Schlüssel), öffnet die Kachel das Untermenü, das sagt, was fehlt und wohin es geht. Dasselbe gilt, wenn das gewählte Modell keine Werkzeuge kann: „E-Mail zusammenfassen“ öffnet das Untermenü E-Mail mit der Warnung und den geeigneten Modellen, statt still einzuschalten; die Kachel trägt dann ein Warnzeichen. „Aus Wissen fragen“ und „Tabelle auswerten“ brauchen keine Werkzeuge und sind nicht betroffen.
6. `SS-6` **Mit Vorlage starten.** Die gespeicherten Vorlagen als Knöpfe (Name, festes Modell oder „kein festes Modell“). Ein Klick übernimmt Modell und Einstellungen und zeigt die Vorlage als Chip im Eingabefeld. Die gewählte ist markiert.

**„Zuletzt“ entfällt, begründet:** Der Block aus dem Mock zeigte Chats und Projekte, die 272 px weiter links schon in der Leiste stehen (Nielsen 8). An seine Stelle tritt `SS-6`: Vorlagen zeigt die Leiste nicht einzeln, die Auswahl steht heute schon im leeren Chat und braucht ein Zuhause, und sie kommt aus vorhandenen Daten.

**Nur vorhandene Daten:** `SS-2` nutzt, was die App heute schon abfragt (geladene Modelle von Ollama, Grafikkarte über `nvidia-smi`). Keine neuen Messwerte.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Kein Modell geladen: Karte sagt das und dass es beim ersten Senden geladen wird; die Modellauswahl im Eingabefeld zeigt, welches. Kein Modell installiert: Karte führt zu „Modelle“, Eingabefeld gesperrt mit Grund. Keine Vorlagen: `SS-6` zeigt einen Satz, wozu Vorlagen gut sind, und „Neue Vorlage“. Keine NVIDIA-Karte oder Server auf anderem Rechner: Karte „Grafikspeicher“ sagt, warum sie nichts misst, und zeigt, wie viel Speicher Ollama für die geladenen Modelle meldet. |
| Lädt | Karten zeigen Platzhalter für die Werte, bis die erste Abfrage da ist. Das Eingabefeld ist sichtbar, aber gesperrt, bis die Modellliste da ist; ein gewünschter Fokus wird nachgeholt. |
| Fehler | Modellliste lässt sich nicht laden: Meldung mit Ursache über dem Eingabefeld, Weg zur Status-Seite. Grafikkarte lässt sich nicht abfragen: Karte nennt die Ursache, der Rest der Seite bleibt. |
| Ollama nicht erreichbar | Muster von oben: Karte „Geladenes Modell“ nennt die Ursache und führt zur Status-Seite, Banner in `SS-3`, Eingabefeld gesperrt mit Grund. `SS-5` und `SS-6` bleiben sichtbar. Die drei Kacheln, die nur einen Schalter setzen (Recherche, E-Mail zusammenfassen, Aus Wissen fragen), und die Vorlagen bleiben bedienbar, genau wie das „+“-Menü: Sie ändern nur die Einstellung des Chats und brauchen Ollama nicht; gesendet wird erst, wenn Ollama wieder da ist. Gesperrt ist allein „Tabelle auswerten“, weil es wie die Büroklammer einen Anhang lädt. |

**Hauptaktion:** Senden (im Eingabefeld).

**Ausgang:** der laufende Chat (nach dem Senden); Status-Seite (Karten); Vorlagen-Seite („Neue Vorlage“).

**Breite und Höhe (auch unter 1440 px):**

| Lage | Verhalten |
|---|---|
| Spalte | Mittig, höchstens 800 px, mindestens 24 px Rand links und rechts. Bei 900 px Fenster: 824 − 48 = 776 px. |
| `SS-2` | Zwei Karten nebeneinander ab 560 px Spaltenbreite, darunter untereinander. |
| `SS-5` | Vier Kacheln in einer Reihe ab 720 px Spaltenbreite, darunter zwei mal zwei. Titel einzeilig, die zweite Zeile wird gekürzt; alle Kacheln sind gleich hoch. |
| `SS-6` | Knöpfe brechen in Zeilen um; mehr als zwei Zeilen werden zu „Alle Vorlagen“ (Link zur Vorlagen-Seite). |
| Seitenpanel offen (ab 1100 px Fenster) | Die Spalte wird schmaler; die Regeln oben greifen (zum Beispiel zwei mal zwei Kacheln). Unter 1100 px liegt das Panel als Überlagerung darüber und ändert nichts. |
| Höhe 600 px | Die Seite scrollt senkrecht. Kopf, Karten und Eingabefeld passen ohne Scrollen (zusammen unter 400 px von 560 px); Kacheln und Vorlagen dürfen darunter liegen. |
| Höhe ab 900 px | Der Inhalt steht im oberen Drittel, nicht senkrecht zentriert, damit das Eingabefeld beim Wechsel in den Chat möglichst wenig springt. |

---

### 4. Laufender Chat

**Zweck:** Zeigt das Gespräch mit dem Modell so, dass der Nutzer jederzeit sieht, was es tut, es anhalten kann und vor jeder folgenreichen Aktion gefragt wird.

**Einstiege:** Senden auf der Startseite; „Letzte Chats“; Palette (P-15, Treffer im Inhalt springt zur Nachricht); Projektseite (`PR-6`); „Zurück zum Chat“ von einer Verwaltungsseite.

**Blöcke (in Reihenfolge):**
1. `CH-1` **Seitenkopf.** Titel des Chats. Projekt-Marke mit Link zur Projektseite (nur in einem Projekt). Aktionen rechts: „Ganzen Chat in Obsidian speichern“ und „Zusammenfassen“ (beide nur mit eingerichtetem Vault, gespeichertem Chat, mindestens einer Antwort und ohne laufende Antwort); „Chat-Einstellungen“ (Strg+J, Punkt bei eigenen Einstellungen); „Seitenpanel“ (Punkt in zwei Stufen, wenn der Kontext knapp wird); Menü „Mehr“ mit Umbenennen, Verschieben nach … und Löschen.
2. `CH-2` **Verlauf.** Lesespalte, höchstens 800 px. Scrollt mit, solange der Nutzer unten ist; eine eigene neue Nachricht holt immer nach unten.
   - **Eigene Nachricht:** Anhänge (Datei- und Tabellen-Karten, Bild-Vorschauen; Klick vergrößert ein Bild, Schließen oder Esc beendet das), Text. Aktionen: Kopieren, Bearbeiten, Merken (nur mit Vault). Bearbeiten öffnet ein Feld an Ort und Stelle mit dem Hinweis, dass diese und alle folgenden Nachrichten ersetzt werden; „Senden und neu antworten“ (Strg+Enter), Abbrechen (Esc).
   - **Antwort:** Gedanken (aufklappbar, während des Denkens als laufend markiert); Werkzeug-Zeilen (`CH-3`); Wartezeile (Modell wird geladen, Wissen wird durchsucht, arbeitet mit Werkzeugen); Text (Links öffnen im Browser, Bilder aus Antworten werden nie geladen, Quellen-Marken springen zur Quelle im Seitenpanel); Diagramm (Regeln Phase 6); Hinweise (Wissen nicht durchsucht, keine passende Stelle gefunden, Fehler, abgebrochen); Statistikzeile (Modell, Tokens, Tokens je Sekunde, Dauer). Aktionen: Kopieren, Antwort wiederholen (nur an der letzten Antwort), In Obsidian speichern, Merken.
   - **Verdichtungs-Marke:** „bis hier verdichtet“ mit Zahl der Nachrichten; „Zusammenfassung ansehen“ (aufklappbar), „Verdichtung aufheben“.
   - **Sprungziel:** Eine über die Suche geöffnete Nachricht steht in der Mitte und ist kurz hervorgehoben.
3. `CH-3` **Werkzeug-Zeile und Rückfrage-Karte.** Zeile: Zustand (wartet auf Freigabe, läuft, fertig, Fehler, abgelehnt, abgebrochen) als Text und Symbol, Name der Aktion in Klartext, aufklappbar zu Server, Eingabe und Ergebnis. Bei „wartet auf Freigabe“ steht darunter die Rückfrage-Karte (Ablauf 3). Im Code-Bereich hat eine Änderungs-Zeile zusätzlich die Vorher/Nachher-Ansicht und „Rückgängig“.
4. `CH-4` **„Nach unten“.** Knopf über dem Eingabefeld, nur wenn der Nutzer hochgescrollt hat.
5. `CH-5` **Karten über dem Eingabefeld.** Nur bei Bedarf, in dieser Reihenfolge: Zusammenfassungs-Karte (Vorschlag bei einem ruhenden Chat oder nach Klick: Zusammenfassen oder „Nein danke“; läuft mit Abbrechen; Entwurf mit Titel und Text, In Obsidian speichern, Neu erzeugen, Verwerfen; Ergebnis oder Fehler mit Erneut versuchen und Zurück zum Entwurf); Ausweich-Banner (Ablauf 5); Hinweis, dass der Chat Bilder enthält, die das gewählte Modell nicht lesen kann.
6. `CH-6` **Eingabefeld.** Die Fläche 5, fest am unteren Rand der Spalte.
7. `CH-7` **Dialog „Älteren Teil verdichten“.** Geöffnet aus dem Seitenpanel (`SP-4`): läuft mit Hinweis auf die Dauer; Entwurf zum Prüfen und Ändern, Zahl der ersetzten Nachrichten und gesparte Tokens, Hinweis auf den Verlust von Details; Übernehmen, Nochmal versuchen, Abbrechen.

Rechts neben der Spalte: das Seitenpanel (Fläche 6).

**Feste Anker** (bleiben bei jeder Antwort an derselben Stelle, egal was das Modell erzeugt):

| Anker | Wo | Immer erreichbar über |
|---|---|---|
| **Eingabefeld** | unten in der Spalte, gleiche Reihenfolge der Bedienelemente wie auf der Startseite | Klick, Strg+L, Palette P-16 |
| **Stopp** | an der Stelle von „Senden“, solange eine Antwort läuft | Klick, Esc, Palette P-18 |
| **Weg zurück** | Seitenleiste (Bereich „Chat“, Letzte Chats); an der Nachricht: Bearbeiten und Antwort wiederholen; an Folgen: Rückgängig (Code), Verdichtung aufheben | Klick, Strg+N, Strg+K; Esc schließt jede Überlagerung, bevor es eine Antwort stoppt |

**Bestätigungspunkte** (das Modell hält an und fragt; alle bestehen heute und bleiben):

| Vor welcher Aktion | Karte zeigt | Wahl |
|---|---|---|
| Werkzeug eines MCP-Servers mit Freigabe „Fragen“ (Standard bei verändernden Werkzeugen) | Werkzeug, Server, Warnung bei Überschreiben, Eingabe | Einmal erlauben · Immer erlauben · Ablehnen |
| Webseite lesen, deren Adresse der Nutzer nicht selbst geschrieben hat | ganze Adresse, was die Seite dabei sieht | Erlauben · Ablehnen |
| Im Web suchen, wo die App heute nachfragt | Suchanfrage, wohin sie geht | Erlauben · Ablehnen |
| Änderung im Postfach (Label, Stern, Label anlegen oder umbenennen) | die Änderung | Übernehmen · Ablehnen |
| Etwas über den Nutzer merken | Text (änderbar), Geltung (alle Chats oder Projekt) | Speichern · Ablehnen |
| Zugriff auf Postfach oder Dateien, der im Chat nicht eingeschaltet ist | Begründung des Modells, Auswahl von Konto oder Server | Für diesen Chat erlauben · Nur diese Antwort · Ablehnen |
| Code: Datei ändern, anlegen, löschen; Befehl ausführen; Commit | Vorher/Nachher oder Befehl | Erlauben (je nach Art benannt) · Ablehnen; danach Rückgängig |
| Recherche starten | Stufe, was den PC verlässt | Starten · Abbrechen |
| Verdichtung und Zusammenfassung | Entwurf zum Prüfen und Ändern | Übernehmen oder Speichern · Neu erzeugen · Verwerfen |
| Jedes Werkzeug, wenn der Ollama-Server auf einem anderen Rechner läuft | wie oben | wie oben, ohne „Immer“ |

**Kanon-Hinweis.** Die Aussagen zu festen Ankern, zu einsehbaren Zwischenschritten und zu Bestätigungspunkten sind **aus Prinzipien abgeleitet, kein gesicherter Kanon**. Für die Gestaltung von KI- und Agenten-Oberflächen gibt es kein Standardwerk; die Quellen sind Praxis-Essays (Dibia, Prinzipien für Agenten-UX; Wilson, *Age of Invisible Machines*, 2022; Smashing Magazine, „Designing for AI Beyond Conversational“, 2024). Der heutige Stand des Denkens: Rückgängig ist besser als Bestätigen, Bestätigen besser als stilles Handeln; Zwischenschritte sollen einsehbar sein. Ungeklärt ist unter anderem, ab wie vielen Rückfragen Nutzer sie ungelesen bestätigen; „Immer erlauben“ je Werkzeug ist dafür die heutige Antwort, kein Beweis. Für die festen Teile gilt dagegen gesicherte Bedienbarkeit: Fehlervermeidung (Nielsen 5), Kontrolle und Freiheit (Nielsen 3), Konsistenz (Nielsen 4), Wiedererkennen statt Erinnern (Nielsen 6). Diese Spec ist bei jedem neuen Design-Plan gegen die Erfahrung des Nutzers zu lesen.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Ein Chat ohne Nachricht ist die Startseite (Fläche 3). Einen leeren laufenden Chat gibt es nicht. |
| Lädt | Chat wird geöffnet: Platzhalter im Verlauf, Titel aus der Liste sofort. Antwort läuft: Wartezeile, dann Gedanken und Text; „Stopp“ statt „Senden“; Modellauswahl, Bearbeiten und Wiederholen sind so lange gesperrt. |
| Fehler | Antwort scheitert: Meldung in der Nachricht, „Antwort wiederholen“ bleibt. Wissen ließ sich nicht durchsuchen: Hinweis in der Antwort, die Antwort kommt trotzdem. Chat gibt es nicht mehr: Die App öffnet die Startseite. Speichern in Obsidian scheitert: Meldung am Knopf mit Ursache. |
| Ollama nicht erreichbar | Muster von oben: Banner in `CH-5`, Eingabefeld gesperrt mit Grund, der Verlauf bleibt lesbar, Kopieren und Speichern gehen weiter. |
| Modell ohne Werkzeuge | Kein Fehler: Warnzeichen an den betroffenen Zeilen des „+“-Menüs und an ihren Chips, mit Vorschlag geeigneter Modelle. |

**Hauptaktion:** Senden; solange eine Antwort läuft: Stopp.

**Ausgang:** bleibt im Chat; Projektseite (Marke); Verwaltungsseiten über „+“; jede Seite über Leiste und Palette.

**Breite:** Die Lesespalte bleibt mittig im Platz neben dem Seitenpanel. Ab 1100 px Fenster schiebt das Panel (310 px) die Spalte; sie hat dann mindestens 506 px. Unter 1100 px liegt das Panel als Überlagerung darüber. Die Aktionen im Seitenkopf bleiben bei jeder Breite sichtbar; der Titel wird gekürzt (voll im Tooltip).

---

### 5. Eingabefeld mit „+“-Menü

**Zweck:** Nimmt Text und Anhänge entgegen, zeigt alles Eingeschaltete als Chip und hält Senden und Stopp immer an derselben Stelle.

**Einstiege:** Startseite (`SS-4`), laufender Chat (`CH-6`), Code-Agent (`CO-4`, verkürzte Form). Fokus: Klick, Strg+L, Strg+N, Palette P-16.

**Blöcke (in Reihenfolge, von oben nach unten):**
1. `EF-1` **Ablegezone.** Nur während eine Datei über das Fenster gezogen wird: Das Feld ist hervorgehoben und sagt, dass hier abgelegt wird.
2. `EF-2` **Chip-Zeile.** Ein Chip je eingeschalteter Kategorie, in der Reihenfolge des Menüs, dazu der Vorlagen-Chip auf der Startseite. Der Chip nennt Kategorie und Auswahl („Wissen: Name“ bei einer Sammlung, sonst die Zahl). Klick auf den Namen öffnet das Untermenü, das × schaltet die Kategorie aus (beim Vorlagen-Chip: entfernt die Vorlage). Lange Namen werden gekürzt.
3. `EF-3` **Anhang-Zeile.** Karten für Dateien (Name, Seiten, Tokens) und Tabellen (Name, Zeilen, Spalten), Vorschau für Bilder, jede mit „Entfernen“. Während des Lesens „Wird gelesen“.
4. `EF-4` **Hinweis-Zone.** Bei Bedarf: Warnung „Kontext zu knapp“ mit Knopf zum Erhöhen; Recherche-Startkarte (Stufe wählen, Hinweis, Warnungen, Starten, Abbrechen); Meldung zu einem Anhang-Problem.
5. `EF-5` **Textfeld.** Wächst mit dem Text bis zu einer Höchsthöhe, dann scrollt es. Enter sendet, Umschalt+Enter macht eine neue Zeile, Strg+V hängt eine Datei aus der Zwischenablage an.
6. `EF-6` **Werkzeugzeile.** Links: Büroklammer (Dateiauswahl), „+“ (Menü, zeigt offen oder zu). Rechts: Modellauswahl (zugänglicher Name beginnt mit „Modell“ und nennt das gewählte Modell), dann Senden (zugänglicher Name „Senden“) oder, solange eine Antwort läuft, Stopp an derselben Stelle.
7. `EF-7` **„+“-Menü, erste Ebene.** Sechs Zeilen in fester Reihenfolge: Wissen, Werkzeuge, Skills, E-Mail, Recherche, Internet. Jede Zeile: Symbol, Name, eine erklärende Zeile, rechts der Zustand in Worten (zum Beispiel der Name der Sammlung, „2 Server“, „aus“).
8. `EF-8` **Untermenüs.** Je Zeile außer Recherche:
   - **Wissen:** Sammlungen mit Haken (je mit Dateien und Abschnitten oder „noch nicht eingelesen“); Haken „Treffer vom Modell neu sortieren“; Trennlinie; „Verwalten …“.
   - **Werkzeuge:** MCP-Server mit Haken (je mit Zahl der nutzbaren Werkzeuge oder „ausgeschaltet“); Weg zu Einstellungen → MCP-Server.
   - **Skills:** Skills mit Haken (je mit Beschreibung); Hinweis, wenn das Modell nicht alle sieht; Trennlinie; „Verwalten …“.
   - **E-Mail:** Konten mit Haken; Trennlinie; „Verwalten …“ (Postfach). Ohne Konto: Weg zu Einstellungen → E-Mail.
   - **Internet:** Haken „Webseiten lesen“ und „Im Web suchen“, je mit einer Zeile, was dabei den PC verlässt; ohne Schlüssel Weg zu Einstellungen → Internet-Suche.
9. `EF-9` **Hinweiszeile.** Unter dem Feld, leise: Enter sendet, Umschalt+Enter neue Zeile, Strg+/ zeigt alle Kürzel.

**Aufbau des Menüs für Hilfstechnik** (Auftrag aus dem Mock-Review; Markup und Zustände im Detail: Phase 4):

| Teil | Rolle | Verhalten |
|---|---|---|
| „+“-Knopf | Knopf, der ein Menü öffnet; meldet offen oder zu | Enter, Leertaste oder Klick öffnet; der Fokus geht auf die erste Zeile |
| Erste Ebene | Menü mit sechs Punkten | ↑/↓ wechselt, Esc schließt und gibt den Fokus an „+“ zurück |
| Zeile „Recherche“ | **ankreuzbarer Menüpunkt** (an oder aus) | Enter oder Leertaste schaltet um; das Menü bleibt offen |
| Übrige fünf Zeilen | Menüpunkt, der ein Untermenü öffnet; der Zustand steht im zugänglichen Namen | Enter, → oder Klick öffnet; ← oder Esc kehrt zur Zeile zurück |
| Einträge im Untermenü | **ankreuzbare Menüpunkte** | Enter oder Leertaste schaltet um; das Untermenü bleibt offen, damit mehrere Haken in einem Zug gehen |
| „Verwalten …“ | **ein eigener, letzter Menüpunkt des Untermenüs**, nach einer Trennlinie, als Link zur Seite | nie ein zweiter Punkt in derselben Zeile; in der Reihenfolge der Pfeiltasten erreichbar |
| Warnungen und Hinweise | Text, der zum betroffenen Punkt gehört | wird mit dem Punkt vorgelesen |

In jeder Zeile gibt es damit genau ein Ziel. Der Preis: „Verwalten …“ liegt einen Schritt tiefer als im Mock (dort neben dem Eintrag). Dagegen stehen die zwei weiteren Einstiege aus §IA (Einstellungen, Palette P-05 bis P-07). Esc im Menü stoppt keine laufende Antwort (heutiges Verhalten).

**Form im Code-Bereich:** ohne Büroklammer, ohne „+“ und ohne Chips. An der Stelle von „+“ steht die Wahl der Arbeitsweise (Manuell fragen, Plan). Die Modellauswahl bietet nur Modelle an, die Werkzeuge können.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Kein Text und kein Anhang: Platzhalter im Textfeld, „Senden“ gesperrt. Untermenü ohne Einträge (keine Sammlung, kein Server, kein Skill, kein Konto): ein Satz, was hier stünde, und der Weg zur Verwaltung. |
| Lädt | Anhang wird gelesen: „Wird gelesen“, „Senden“ gesperrt. Untermenü fragt seine Liste ab: Platzhalter-Zeile. Antwort läuft: „Stopp“ statt „Senden“, Tippen bleibt möglich. |
| Fehler | Anhang-Problem: Meldung in `EF-4` mit Grund und Ausweg. Heute verschwindet sie nach 8 Sekunden; Empfehlung für den Umbau: Sie bleibt bis zur nächsten Eingabe, damit niemand sie verpasst (WCAG 2.2.1). Kontext zu knapp: Warnung mit Knopf oder Ausweg. |
| Ollama nicht erreichbar | Textfeld, Büroklammer und Senden gesperrt; der Platzhalter nennt den Grund. Die Modellauswahl zeigt „keine Modelle“. Chips bleiben sichtbar. „+“ bleibt bedienbar, damit „Verwalten …“ erreichbar bleibt. |
| Kein Modell installiert | wie oben, mit Weg zu „Modelle“ statt zur Status-Seite. |
| Modell ohne Werkzeuge | Warnzeichen an Werkzeuge, E-Mail und Internet in `EF-7` und an ihren Chips; das Untermenü erklärt es und nennt geeignete Modelle. Skills: Hinweis, dass nur eingeschaltete Skills gelten. |
| Modell ohne Bild-Fähigkeit | Bilder werden abgelehnt, mit Vorschlag eines installierten Modells, das Bilder kann. |

**Hauptaktion:** Senden. Es ist das größte Ziel der Zeile und liegt rechts unten, wo Text und Blick enden (Fitts 1954).

**Ausgang:** laufender Chat; Verwaltungsseiten über „Verwalten …“; Einstellungen über die Hinweise.

**Breite:** so breit wie die Lesespalte. Das „+“-Menü ist 410 px breit und öffnet nach oben; das Untermenü öffnet rechts daneben, bei zu wenig Platz ersetzt es die erste Ebene (mit „Zurück“ als erstem Punkt). Mehr Chips als eine Zeile brechen um.

---

### 6. Seitenpanel (Kontext und Quellen)

**Zweck:** Beantwortet neben dem Chat zwei Fragen: Woher kommt die Antwort, und wie viel Platz hat das Modell noch.

**Einstiege:** Knopf „Seitenpanel“ im Chat-Kopf (öffnet „Kontext“, wenn der Kontext knapp ist, sonst „Quellen“); Quellen-Marke in einer Antwort; Strg+J und Palette P-17 öffnen die zweite Ansicht „Chat-Einstellungen“. Rechts ist Platz für genau eine der beiden Ansichten; die eine schließt die andere (wie heute).

**Blöcke (in Reihenfolge):**
1. `SP-1` **Kopf.** Vier Reiter: Quellen, Projekt, Kontext, GPU. Der Reiter „Kontext“ trägt den Füllstand als Punkt mit Text für Hilfstechnik. Rechts „Schließen“.
2. `SP-2` **Quellen.** Eine Zeile, worauf sich die Liste bezieht (die letzte Antwort mit Wissen). Liste der Textstellen: Nummer, Datei, aufklappbar zum Text, Ähnlichkeit, „Datei öffnen“. Hinweis, wenn das Modell die Reihenfolge geprüft hat.
3. `SP-3` **Projekt.** Link „Projekt bearbeiten“, die Anweisungen (nur lesen), Projekt-Dokumente mit „Einlesen“, Fortschritt und Dateiliste (Filter „nur Probleme“).
4. `SP-4` **Kontext.** Füllstand: belegt von gesamt, aufgeteilt nach Teilen (Zusammenfassung, Erinnerungen, Anweisungen, Verlauf, Bilder, Dateien, Wissen, Werkzeuge, Skills), mit dem Hinweis, dass es eine Schätzung ist. Bei knappem oder vollem Kontext: Warnung, Knopf „Kontextlänge auf N erhöhen“ mit Schätzung des zusätzlichen Grafikspeichers, oder der Hinweis, dass das Modell nicht mehr kann. „Älteren Teil verdichten“ (öffnet `CH-7`). Bei aktiver Verdichtung: was sie spart und „Verdichtung aufheben“. Darunter die gemessenen Werte der letzten Antwort. Lässt sich der zusätzliche Grafikspeicher nicht schätzen (keine NVIDIA-Karte, Server auf anderem Rechner oder das Modell erlaubt keine Schätzung), bleibt „Erhöhen“ benutzbar und sagt in einem Satz, dass der Mehrbedarf nicht vorab bekannt ist. Ist kein Modell gewählt, weil keines installiert ist, steht statt des Füllstands ein Satz mit Weg zu „Modelle“; Erhöhen und Verdichten sind gesperrt. Darstellung des Füllstands: Phase 6.
5. `SP-5` **GPU.** Grafikkarte und geladene Modelle in Kurzform (dieselben Inhalte wie die Status-Seite). Ohne NVIDIA-Karte oder bei einem Server auf anderem Rechner steht statt der Messwerte der Grund; das ist ein normaler Zustand, kein Fehler.
6. `SP-6` **Zweite Ansicht: Chat-Einstellungen.** Kopf mit Titel und „Schließen“. Felder: Systemprompt; Kontextlänge (Auswahl, Standard von Ollama); Temperatur (Regler, „Auf Standard zurücksetzen“); Seed; Denken (An, Aus oder Stufen, je nach Modell). „Als Vorlage speichern“ (Name, Speichern, Rückmeldung). Fußzeile: gilt ab der nächsten Nachricht und wird mit dem Chat gespeichert.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Quellen: Satz, dass sie erscheinen, sobald eine Antwort Wissen benutzt hat, mit Weg zum „+“-Menü. Projekt: Satz, dass der Chat zu keinem Projekt gehört und wie er in eines kommt. Projekt ohne Anweisungen oder Dokumente: je ein Satz. Kontext: bei neuem Chat der Grundbedarf; ohne installiertes Modell der Satz mit Weg zu „Modelle“ (`SP-4`). GPU, kein Modell geladen: Satz, dass es beim nächsten Senden geladen wird und dann hier steht, mit Link zur Status-Seite. |
| Keine NVIDIA-Karte oder Server auf anderem Rechner | Normaler Zustand, kein Fehler (wie Ablauf 5 und `ST-3`). GPU (`SP-5`): ein Satz, warum hier nichts gemessen wird; die geladenen Modelle darunter zeigen weiter, wie viel Speicher Ollama meldet. Kontext (`SP-4`): „Erhöhen“ ohne Speicherschätzung, mit dem Satz dazu. |
| Lädt | Projekt-Dokumente und GPU: Platzhalter, bis die Abfrage da ist. Einlesen läuft: Fortschritt mit Abbrechen. |
| Fehler | Datei lässt sich nicht öffnen oder Einlesen scheitert: Meldung im Reiter mit Ursache. Grafikkarte vorhanden, aber die Abfrage scheitert: Ursache im Reiter GPU (eine fehlende NVIDIA-Karte ist kein Fehler, siehe eigene Zeile). |
| Ollama nicht erreichbar | Kontext: Die Schätzung bleibt (sie wird in der App gerechnet); Erhöhen und Verdichten sind gesperrt mit Grund. GPU: nennt die Ursache und führt zur Status-Seite. Quellen und Projekt bleiben lesbar. Chat-Einstellungen bleiben änderbar. |

**Hauptaktion:** keine feste. Bei knappem Kontext: „Kontextlänge erhöhen“, sonst „Älteren Teil verdichten“.

**Ausgang:** zurück in den Chat (Schließen, Esc in der Überlagerung); Projektseite; Status-Seite; die geöffnete Datei im zugehörigen Programm.

**Breite:** 310 px. Ab 1100 px Fenster neben dem Chat, darunter als Überlagerung mit Abdunkelung (§IA): Fokus bleibt im Panel, Esc und Klick daneben schließen, der Fokus kehrt auf den öffnenden Knopf zurück.

---

### 7. Vorlagen

**Zweck:** Wiederkehrende Aufgaben als Vorlage anlegen (Modell, Systemprompt, Wissen, Werkzeuge, Skills, Parameter) und einen Chat damit starten.

**Einstiege:** Seitenleiste (Bereich „Vorlagen“), Palette P-02, „Neue Vorlage“ und „Alle Vorlagen“ auf der Startseite, nach „Als Vorlage speichern“ im Chat.

**Blöcke (in Reihenfolge):**
1. `VO-1` **Liste.** Oben „Neue Vorlage“. Zeilen: Name, festes Modell oder „kein festes Modell“. Die gewählte ist markiert.
2. `VO-2` **Seitenkopf.** Name der Vorlage. Aktionen: „Chat damit starten“ (Hauptaktion; gesperrt mit Grund, solange Änderungen nicht gespeichert sind), „Speichern“, getrennt davon „Löschen“.
3. `VO-3` **Formular.** Name. Modell (Auswahl; Hinweis, wenn das Modell nicht mehr installiert ist). Wissen (Sammlungen mit Haken). MCP-Server (mit Haken). Skills (mit Haken). Parameter wie in `SP-6` (Systemprompt, Kontextlänge, Temperatur, Seed, Denken). Kann das fest gewählte Modell keine Werkzeuge, tragen „MCP-Server“ und „Skills“ ein Warnzeichen und einen Satz: MCP-Server wirken mit diesem Modell nicht, Skills gelten nur, soweit sie hier angehakt sind (das Modell lädt keine selbst); dazu geeignete Modelle. Die Haken bleiben möglich, weil die Vorlage auch mit einem anderen Modell benutzt werden kann. Ohne festes Modell entfällt die Warnung; sie erscheint dann im Chat am „+“-Menü.
4. `VO-4` **Nichts gewählt.** Was Vorlagen sind, ein Beispiel, „Neue Vorlage“.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Keine Vorlage: Liste zeigt nur „Neue Vorlage“, rechts `VO-4`. Auswahlfelder ohne Einträge (keine Sammlung, kein Server, kein Skill): je ein Satz mit Weg zur Verwaltung. Kein Modell installiert: Die Modellauswahl bietet nur „kein festes Modell“ und sagt das in einem Satz mit Weg zu „Modelle“; Anlegen und Speichern bleiben möglich, „Chat damit starten“ führt auf die Startseite mit gesperrtem Eingabefeld und Grund. |
| Lädt | Liste: Platzhalter-Zeilen. Modellauswahl: gesperrt, bis die Modelle da sind. |
| Fehler | Speichern oder Löschen scheitert: Meldung am Formular mit Ursache, Eingaben bleiben. Ungespeicherte Änderungen beim Verlassen: Die App fragt nicht nach (heutiges Verhalten); Empfehlung für den Umbau: nachfragen. |
| Ollama nicht erreichbar | Vorlagen sind gespeichert und bleiben lesbar und änderbar. Die Modellauswahl zeigt nur das gespeicherte Modell und nennt den Grund. „Chat damit starten“ bleibt möglich und führt in den gesperrten Chat mit Banner. |

**Hauptaktion:** „Chat damit starten“; bei neuer Vorlage „Speichern“.

**Ausgang:** Startseite mit Vorlagen-Chip; bleibt auf der Seite nach dem Speichern.

**Breite:** Liste 270 px, Formular im Rest (mindestens 546 px), höchstens 720 px breit. Bei jeder Stufe zweispaltig.

---

### 8. Wissen

**Zweck:** Sammlungen von eigenen Dokumenten anlegen, einlesen und aktuell halten, damit das Modell im Chat daraus antworten kann.

**Einstiege:** „+“-Menü → Wissen → „Verwalten …“; Einstellungen → „Wissen verwalten“; Palette P-05; Einstellungen → Obsidian → „Zur Sammlung“; Kachel „Aus Wissen fragen“, wenn keine Sammlung da ist. **Kein Eintrag in der Seitenleiste** (bewusst, §IA): Der Seitenkopf zeigt deshalb, wo der Nutzer ist, und „Zurück zum Chat“.

**Blöcke (in Reihenfolge):**
1. `WI-1` **Liste.** Oben „Neue Sammlung“. Zeilen: Name, Dateien und Abschnitte oder, während des Einlesens, der Fortschritt.
2. `WI-2` **Seitenkopf.** Name der Sammlung. Aktionen: „Einlesen“ oder „Neu einlesen“ (Hauptaktion; während des Einlesens „Abbrechen“), getrennt davon „Sammlung löschen“.
3. `WI-3` **Hinweise.** Bei Bedarf: Embedding-Modell fehlt (mit Weg zu „Modelle“); die Sammlung gehört zum Obsidian-Vault und wird in den Einstellungen verwaltet (mit Link).
4. `WI-4` **Name.** Eingabefeld, speichert beim Verlassen.
5. `WI-5` **Quellen.** Liste der Ordner und Dateien, jede mit „Entfernen“. „Ordner hinzufügen“, „Dateien hinzufügen“. Hinweis, was gelesen wird und was nicht.
6. `WI-6` **Fortschritt und Ergebnis.** Während des Einlesens: Zahl und aktuelle Datei. Danach: Dateien, Abschnitte, Zeitpunkt, und was sich geändert hat.
7. `WI-7` **Dateiliste.** Filter „nur Probleme“. Zeilen: Datei, Zustand (eingelesen, leer, übersprungen, Fehler), Abschnitte oder Fehlergrund. Lange Listen enden mit „und n weitere“.
8. `WI-8` **Fußnote.** Mit welchem Modell die Fingerabdrücke gerechnet wurden, lokal über Ollama.
9. `WI-9` **Nichts gewählt.** Was eine Sammlung ist und dass die Dateien bleiben, wo sie sind; „Neue Sammlung“.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Keine Sammlung: `WI-9`. Sammlung ohne Quellen: `WI-5` erklärt den ersten Schritt, „Einlesen“ ist gesperrt. Noch nicht eingelesen: `WI-7` sagt das und zeigt auf „Einlesen“. |
| Lädt | Liste: Platzhalter. Einlesen läuft: `WI-6` mit Fortschritt, „Abbrechen“ im Kopf, die Zeile in der Liste zeigt den Stand. |
| Fehler | Einzelne Dateien scheitern: in `WI-7` mit Grund, Zähler am Filter. Einlesen bricht ab: Meldung, Fertiges bleibt. Embedding-Modell fehlt: `WI-3`. |
| Ollama nicht erreichbar | Sammlungen und Dateilisten bleiben lesbar, Quellen bleiben änderbar. „Einlesen“ ist gesperrt und nennt den Grund (die Fingerabdrücke rechnet Ollama). |

**Hauptaktion:** „Einlesen“ (bei nichts Gewähltem: „Neue Sammlung“).

**Ausgang:** „Zurück zum Chat“; „Modelle“ (fehlendes Modell); Einstellungen (Obsidian).

**Breite:** Liste 270 px, Detail im Rest, höchstens 720 px. Bei jeder Stufe zweispaltig.

---

### 9. E-Mail

**Zweck:** Das eigene Postfach lesen, eine Mail zusammenfassen lassen und Vorschläge zum Sortieren prüfen; nichts wird gesendet oder gelöscht.

**Einstiege:** „+“-Menü → E-Mail → „Verwalten …“; Einstellungen → Eintrag zum Postfach; Palette P-07. Kein Eintrag in der Seitenleiste; „Zurück zum Chat“ im Seitenkopf wie bei Wissen.

**Blöcke (in Reihenfolge):**
1. `EM-1` **Listenkopf.** Konto-Auswahl (nur bei mehreren Konten). Suchfeld (Enter sucht, leer zeigt den Posteingang). „Sortieren vorschlagen“. „Neu laden“.
2. `EM-2` **Liste.** Überschrift „Posteingang“ oder „Suchergebnis“. Zeilen: Marke „ungelesen“, Stern, Absender, Betreff, Datum. Am Ende „Mehr laden“.
3. `EM-3` **Leser.** Betreff als Überschrift. Aktion „Zusammenfassen“ (während des Laufens „Abbrechen“). Von, An, Cc, Datum. Liste der Anhänge (werden nicht geladen). Text der Mail, nur als Text. Hinweis, wenn nur der Anfang gezeigt wird.
4. `EM-4` **Zusammenfassung.** Karte über dem Text: Zusammenfassung, Hinweis, welches Modell sie auf diesem PC erstellt hat und dass sie Fehler enthalten kann, „Schließen“.
5. `EM-5` **Sortieren.** Ersetzt den Leser: Erklärung, was das Modell sieht; „Vorschläge holen“ (während des Laufens „Abbrechen“), „Schließen“. „Labels verwalten“ (aufklappbar: Label umbenennen, neues Label anlegen). Vorschläge je Mail mit Haken (Label hinzufügen, neues Label anlegen, Stern setzen oder entfernen). „Alle auswählen“ oder „Keine auswählen“. Hauptaktion „n Änderungen in Gmail übernehmen“. Danach die Zahl der übernommenen Änderungen.
6. `EM-6` **Nichts gewählt oder nicht eingerichtet.** Ohne Konto: was nötig ist und „Zu den Einstellungen“. Mit Konto, ohne Auswahl: dass Mails nur als Text gezeigt werden und nichts als gelesen markiert wird.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Kein Konto: `EM-6` mit Weg zu den Einstellungen. Keine Mails oder kein Suchtreffer: Satz in der Liste, bei einer Suche mit dem Suchwort und „Posteingang zeigen“. Keine Vorschläge: Satz, dass nichts klar passt, und die Aktion „Labels verwalten“ (mehr passende Labels führen zu mehr Vorschlägen). Keine eigenen Labels: Hinweis, dass das Modell neue vorschlagen darf, und die Aktion „Label anlegen“ (öffnet „Labels verwalten“ mit dem Feld für ein neues Label). |
| Lädt | Liste und Mail: Platzhalter; „Neu laden“ zeigt die Bewegung. Zusammenfassen und Vorschläge: laufend markiert, mit „Abbrechen“. |
| Fehler | Postfach antwortet nicht oder die Anmeldung ist abgelaufen: Meldung in der Liste mit Ursache und „Zu den Einstellungen und neu anmelden“. Zusammenfassung oder Vorschläge scheitern: Meldung an der Karte, erneut versuchen. |
| Ollama nicht erreichbar | Lesen und Suchen gehen weiter (das Postfach kommt von Google, nicht von Ollama). „Zusammenfassen“ und „Vorschläge holen“ sind gesperrt und nennen den Grund. |

**Hauptaktion:** im Leser „Zusammenfassen“; in der Sortier-Ansicht „Änderungen übernehmen“.

**Ausgang:** „Zurück zum Chat“; Einstellungen (Konto).

**Breite:** Liste 320 px, Leser im Rest (mindestens 496 px). Bei jeder Stufe zweispaltig.

---

### 10. Code

**Zweck:** Einen Agenten in einem gewählten Projektordner arbeiten lassen: lesen ohne Rückfrage, ändern nur nach Freigabe, mit Vorher/Nachher und Rückgängig.

**Einstiege:** Seitenleiste (Bereich „Code“), Palette P-03.

**Blöcke (in Reihenfolge):**
1. `CO-1` **Sitzungen.** Oben „Neue Sitzung“ (öffnet die Ordnerauswahl). Zeilen: Titel, Ordner (voll im Tooltip), „Sitzung löschen“.
2. `CO-2` **Dateibaum.** Titel der Sitzung. Ordner klappen auf und zu, Klick auf eine Datei öffnet sie.
3. `CO-3` **Dateiansicht.** Ersetzt den Agenten, solange eine Datei offen ist (der Agent läuft weiter): Pfad, „Datei schließen“, Inhalt; oder der Hinweis „zu groß“ oder „keine Textdatei“.
4. `CO-4` **Agent.** Verlauf wie im Chat (`CH-2`, `CH-3`), mit Rückfrage vor jeder Änderung, jedem Befehl und jedem Commit und „Rückgängig“ an jeder Änderung. Plan-Karte über dem Eingabefeld, wenn im Plan-Modus ein Plan fertig ist: „Plan umsetzen“. Eingabefeld in der Code-Form (Fläche 5): Arbeitsweise (Manuell fragen, Plan), Modellauswahl, Senden oder Stopp.
5. `CO-5` **Nichts gewählt.** Was der Agent darf und was nicht (nur dieser Ordner, Lesen ohne Rückfrage, kein Push), „Neue Sitzung“.

Die festen Anker und die Bestätigungspunkte der Chat-Spec (Fläche 4) gelten hier unverändert, mit demselben Kanon-Hinweis.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Keine Sitzung: `CO-5`. Sitzung ohne Nachricht: Frage, was der Agent tun soll, mit zwei Beispielen. Leerer Ordner: Satz im Dateibaum und die Aktion „Anderen Ordner wählen“ (startet wie „Neue Sitzung“ die Ordnerauswahl); der Agent bleibt benutzbar und kann Dateien anlegen. |
| Lädt | Sitzungen, Dateibaum und Datei: Platzhalter. Antwort läuft: wie im Chat. |
| Fehler | Ordner lässt sich nicht öffnen oder Sitzung nicht anlegen: Meldung unter „Neue Sitzung“. Rückgängig trifft auf spätere Änderungen: Bestätigungsdialog. Werkzeug scheitert: Zeile „Fehler“. |
| Ollama nicht erreichbar | Sitzungen, Dateibaum und Dateien bleiben lesbar. Eingabefeld gesperrt mit Grund; Muster von oben. |
| Kein Modell mit Werkzeugen | Warnung im Verlauf mit Beispielen geeigneter Modelle und Weg zu „Modelle“; Eingabefeld gesperrt. |

**Hauptaktion:** Senden; ohne Sitzung „Neue Sitzung“.

**Ausgang:** bleibt auf der Seite; „Modelle“ (fehlendes Modell).

**Breite:**

| Stufe | Aufbau |
|---|---|
| breit (Inhalt ab 1000 px) | drei Spalten: Sitzungen 270 px, Dateibaum 240 px, Agent im Rest (mindestens 490 px) |
| schmal (Inhalt unter 1000 px) | zwei Spalten: Dateibaum 240 px, Agent im Rest (mindestens 576 px). Die Sitzungen wandern als Auswahl in den Seitenkopf (aktuelle Sitzung, Liste, „Neue Sitzung“, „Sitzung löschen“ im Menü). |

---

### 11. Skills

**Zweck:** Anleitungen für wiederkehrende Aufgaben schreiben, hinzufügen und prüfen, die im Chat eingeschaltet oder vom Modell selbst geladen werden.

**Einstiege:** „+“-Menü → Skills → „Verwalten …“; Einstellungen → „Skills verwalten“; Palette P-06. Kein Eintrag in der Seitenleiste; „Zurück zum Chat“ im Seitenkopf.

**Blöcke (in Reihenfolge):**
1. `SK-1` **Liste.** Oben „Neuer Skill“ (Hauptaktion der Liste) und ein beschriftetes Menü „Hinzufügen und mehr“: Von GitHub, Skill-Dateien hinzufügen, Alle neu laden, Skill-Ordner öffnen (heute vier Symbole ohne Namen). Die Liste ist Ablageziel für Skill-Dateien. Zeilen: Name, Beschreibung, Marke bei einem fehlerhaften Skill. Rückmeldung nach dem Hinzufügen.
2. `SK-2` **Seitenkopf.** Name des Skills. Aktionen: „Speichern“ (Hauptaktion), Menü „Mehr“ mit „Neu von der Festplatte laden“ und „Ordner öffnen“, getrennt davon „Skill löschen“.
3. `SK-3` **Formular.** Fehlerkasten, wenn die Datei nicht benutzbar ist. Name. „Wann passt dieser Skill?“ (mit Warnung bei fehlender oder sehr kurzer Beschreibung). Anleitung (mit Zähler für Zeichen und Tokens und Warnung, wenn sie nicht in den Standard-Kontext passt). Zusatzdateien (nur lesen). Speicherort. Sicherheitsprüfung mit dem Hinweis, dass sie eine Hilfe ist und kein Beweis.
4. `SK-4` **Dialog „Skill hinzufügen“.** Ablegen oder „Dateien wählen“; Formate; Prüfung läuft; Vorschau je Skill mit Haken, Größe, Zusatzdateien, nicht übernommenen Dateien, „Anleitung lesen“, Sicherheitsprüfung; Haken „Ich habe die Warnungen gelesen“ (Pflicht bei Warnungen); „Andere Dateien“, Abbrechen, „n Skills hinzufügen“.
5. `SK-5` **Dialog „Von GitHub“.** Suchfeld und „Los“; Warnhinweis; Treffer (Projekt, Beschreibung, Sterne, zuletzt geändert, Lizenz, archiviert) mit „Skills ansehen“; Skills eines Projekts mit Haken und Obergrenze; „Zurück zu den Treffern“; Abbrechen, „Prüfen (n)“; danach die Vorschau aus `SK-4` mit „Zurück zur Auswahl“.
6. `SK-6` **Nichts gewählt.** Was Skills sind, dass ein Skill nur Text ist und nichts ausführt, „Neuer Skill“.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Kein Skill: `SK-6`, die Liste lädt zum Ablegen ein. Dateien ohne Skill: Satz im Dialog. Kein Treffer bei GitHub: Satz mit Rat zum Suchwort. |
| Lädt | Liste: Platzhalter. Dialoge: „prüfe die Dateien“, „lade und prüfe“; „Los“ zeigt die Bewegung. |
| Fehler | Fehlerhafte Skill-Datei: Marke in der Liste, Fehlerkasten im Formular. Speichern scheitert: Meldung am Formular. GitHub nicht erreichbar oder Link ungültig: Meldung im Dialog mit Ursache. |
| Ollama nicht erreichbar | Trifft nicht zu: Skills sind Textdateien auf diesem PC, nichts kommt von Ollama. Der Zustand selbst steht am Fuß der Leiste. |

**Hauptaktion:** „Speichern“; ohne Auswahl „Neuer Skill“.

**Ausgang:** „Zurück zum Chat“; der Explorer (Ordner öffnen).

**Breite:** Liste 270 px, Formular im Rest, höchstens 720 px. Dialoge höchstens 720 px breit und höchstens Fensterhöhe minus 48 px, der Inhalt scrollt, die Knöpfe bleiben unten stehen.

---

### 12. Modelle

**Zweck:** Zeigen, welche Modelle installiert sind und was sie können, neue herunterladen und alte entfernen.

**Einstiege:** Seitenleiste (Bereich „Modelle“), Palette P-04, Hinweise „Modell fehlt“ auf anderen Flächen.

**Blöcke (in Reihenfolge):**
1. `MO-1` **Seitenkopf.** Überschrift, „Aktualisieren“.
2. `MO-2` **Herunterladen.** Feld für den Modellnamen und „Herunterladen“; Hinweis mit Link zur Ollama-Bibliothek (öffnet im Browser); Meldung bei ungültigem Namen.
3. `MO-3` **Laufende Downloads.** Je Download: Name, Phase (verbindet, lädt, prüft, fertig, Fehler, abgebrochen), Fortschritt als Zahl und Balken, „Download abbrechen“ oder „Aus der Liste entfernen“. Regeln für den Balken: Phase 6.
4. `MO-4` **Installierte Modelle.** Tabelle: Name, Parameter, Quantisierung, Größe, größter Kontext, Fähigkeiten (Bilder, Audio, Werkzeuge, Denken, Embedding, Einfügen), geändert, je Zeile „löschen“. Meldung, wenn das Löschen scheitert. Regeln für die Tabelle: Phase 6.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Kein Modell installiert: Satz an der Stelle der Tabelle, der auf `MO-2` zeigt, mit einem Beispielnamen. Kein Download: `MO-3` erscheint nicht. |
| Lädt | Tabelle: Platzhalter-Zeilen; „Aktualisieren“ zeigt die Bewegung. |
| Fehler | Liste lässt sich nicht laden: Meldung mit Ursache und „Aktualisieren“. Download scheitert: Phase „Fehler“ mit Ursache in der Zeile. Löschen scheitert: Meldung über der Tabelle. |
| Ollama nicht erreichbar | An der Stelle der Tabelle die Ursache, „Aktualisieren“ und der Weg zur Status-Seite. Das Download-Feld ist gesperrt und nennt den Grund. |

**Hauptaktion:** „Herunterladen“.

**Ausgang:** bleibt auf der Seite; Browser (Bibliothek).

**Breite:** eine Spalte in voller Inhaltsbreite. Auf der Stufe schmal rücken Spalten zusammen (welche, legt Phase 6 fest); jeder Wert bleibt erreichbar, nichts scrollt waagerecht.

---

### 13. Status

**Zweck:** Diagnose, wenn etwas nicht oder langsam läuft: Verbindung zu Ollama, Grafikkarte, geladene Modelle. Keine Verwaltung.

**Einstiege:** Modellstatus am Fuß → Popup → „Ganze Seite“; Karten der Startseite; Palette P-08; Hinweise „Ollama nicht erreichbar“ auf anderen Flächen.

**Blöcke (in Reihenfolge):**
1. `ST-1` **Seitenkopf.** Überschrift.
2. `ST-2` **Verbindung.** Zustand (erreichbar mit Version, wird geprüft, nicht erreichbar), aktiver Server, Link zu Einstellungen → Ollama-Server. Bei „nicht erreichbar“: Ursache und was zu tun ist. Nutzt die vorhandene Abfrage; heute steht dieser Wert nur im Tooltip der Leiste.
3. `ST-3` **Grafikkarte.** Name, Auslastung, Grafikspeicher (belegt von gesamt, aufgeteilt in Ollama, andere Programme, frei), Temperatur, Stromverbrauch. Darstellung: Phase 6.
4. `ST-4` **Geladene Modelle.** Erklärung, wann Ollama lädt und entlädt. Zusammenfassung (Zahl, belegter Speicher). Je Modell: Name, Speicher und Aufteilung Grafikkarte und Prozessor, Kontextlänge, Zeit bis zum Entladen; Warnung, wenn ein Teil auf dem Prozessor läuft, mit Abhilfe.

Die Seite frischt sich von selbst auf; es gibt keinen Knopf dafür.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Kein Modell geladen: Satz in `ST-4`, dass es beim nächsten Chat erscheint. Keine NVIDIA-Karte: `ST-3` nennt das und verweist auf `ST-4`, das trotzdem zeigt, wie viel Speicher Ollama nutzt. Server auf anderem Rechner: `ST-3` sagt, dass nur auf diesem PC gemessen werden kann. |
| Lädt | Jeder Block zeigt Platzhalter, bis seine erste Abfrage da ist; danach wechseln nur noch die Werte, nichts springt. |
| Fehler | Grafikkarte nicht abfragbar: Ursache in `ST-3`, die anderen Blöcke bleiben. |
| Ollama nicht erreichbar | `ST-2` zeigt es als Erstes, mit Ursache und nächstem Schritt. `ST-4` zeigt statt Modellen den Verweis auf `ST-2`. `ST-3` misst weiter, wenn die Karte lokal ist. Sobald Ollama antwortet, kehren die Werte von selbst zurück. |

**Hauptaktion:** keine (Lesefläche). Bei unterbrochener Verbindung: Link zu Einstellungen → Ollama-Server.

**Ausgang:** Einstellungen; zurück über Leiste oder Palette.

**Breite:** unter 1000 px Inhaltsbreite eine Spalte, höchstens 800 px. Ab 1000 px stehen `ST-3` und `ST-4` nebeneinander.

---

### 14. Einstellungen

**Zweck:** Alles einrichten, was selten geändert wird: Darstellung, Server, Werkzeuge, Vault, Konto, Suche; dazu die sichtbaren Einstiege zu Wissen, Skills und Postfach.

**Einstiege:** Fuß der Seitenleiste, Strg+,, Palette P-09; Hinweise auf anderen Flächen führen direkt zum passenden Abschnitt.

**Blöcke (in Reihenfolge):**
1. `ES-1` **Sprungliste.** Links, bleibt beim Scrollen stehen, markiert den Abschnitt, der gerade oben steht. Einträge in der Reihenfolge der Blöcke.
2. `ES-2` **Verwalten.** Drei Zeilen, die auf eine Seite führen: „Wissen verwalten“, „Skills verwalten“, Postfach (E-Mail). Je mit einer Zeile, was dort geschieht. Neu, aus §IA.
3. `ES-3` **Darstellung.** Design: Hell, Dunkel, Wie Windows (eine Wahl aus drei). Sprache: Wie Windows, Deutsch, English.
4. `ES-4` **Ollama-Server.** Liste der Server mit Wahl des aktiven, Marke „aktiv“, „Testen“ (mit Ergebnis), Bearbeiten, Löschen. „Server hinzufügen“ öffnet Name und Adresse mit Speichern und Abbrechen. Aufklappbare Hilfe, was auf dem anderen Rechner einzustellen ist.
5. `ES-5` **MCP-Server.** „Dateisystem-Server hinzufügen“ (Name, freigegebene Ordner hinzufügen und entfernen, Speichern, Abbrechen). Je Server: Zustand (aus, startet, läuft, Fehler), Haken „eingeschaltet“, Neu starten, Bearbeiten, Löschen; aufklappbar: Meldungen des Servers; aufklappbar: Werkzeuge mit Freigabe je Werkzeug (Immer, Fragen, Aus; „Zurück auf Standard“), Marke bei Werkzeugen, die überschreiben können. „Immer“ bei einem solchen Werkzeug fragt über den Bestätigungsdialog nach.
6. `ES-6` **Obsidian.** Ohne Vault: „Vault einrichten“ (Ordner eintragen oder „Ordner wählen“, eigener Unterordner, Speichern, Abbrechen). Mit Vault: erkannt oder nicht, wohin geschrieben wird, Ändern, Entfernen, Stand als Wissen mit Link „Zur Sammlung“. Darunter **Erinnerungen**: Zahl, „Neu laden“, Liste nach Geltung (alle Chats, je Projekt) mit „Notiz öffnen“ und „Erinnerung löschen“; neue Erinnerung (Text, Geltung, „Merken“).
7. `ES-7` **E-Mail-Konto.** Ohne eigene Google-App: „Gmail einrichten“ (Client-ID, Clientschlüssel, Speichern, Abbrechen). Mit App: Ändern, Entfernen (erst wenn alle Konten abgemeldet sind). Angemeldete Konten mit „Abmelden“. „Mit Google anmelden“ oder „Weiteres Konto anmelden“; während der Anmeldung im Browser ein Wartehinweis mit „Abbrechen“. Link zum Postfach.
8. `ES-8` **Internet-Suche.** Erklärung und was dabei den PC verlässt. Ohne Schlüssel: Feld, Speichern, Abbrechen. Mit Schlüssel: „Testen“ (mit Ergebnis), „Ersetzen“, „Entfernen“.
9. `ES-9` **Datenschutz.** Kurzfassung, „Datenschutzerklärung anzeigen“ oder „ausblenden“.
10. `ES-10` **Über LocalDesk.** Version, Datenordner. Update: „Nach Updates suchen“, Ergebnis, „Herunterladen und installieren“ mit Fortschritt und „Abbrechen“, „Jetzt neu starten und installieren“. Lizenzen anzeigen oder ausblenden.

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Je Abschnitt ein Satz und die erste Aktion: kein MCP-Server, kein Vault, keine Erinnerung, keine Google-App, kein Konto, kein Schlüssel. |
| Lädt | Abschnitte zeigen Platzhalter, bis ihr Stand da ist. Laufende Vorgänge sind benannt: Server startet, Test läuft, Anmeldung wartet auf den Browser, Update lädt. |
| Fehler | Jeder Abschnitt meldet an Ort und Stelle mit Ursache: Server-Test scheitert, MCP-Server im Zustand Fehler (Meldungen aufklappbar), Ordner nicht verwendbar, Schlüssel-Test scheitert, Abmelden nur lokal gelungen, Datei für Datenschutz oder Lizenzen fehlt. |
| Ollama nicht erreichbar | `ES-4` ist der Ort, das zu beheben: Der aktive Server zeigt „nicht erreichbar“, „Testen“ und das Umschalten bleiben benutzbar. Alle anderen Abschnitte bleiben benutzbar; sie hängen nicht an Ollama. |

**Hauptaktion:** keine für die ganze Seite; je Abschnitt höchstens eine hervorgehobene Aktion.

**Ausgang:** Wissen, Skills, Postfach (`ES-2`); Browser (Google-Anmeldung); Neustart (Update).

**Breite:** Sprungliste 176 px, Abschnitte im Rest, höchstens 720 px. Die Sprungliste bleibt bei jeder Stufe sichtbar (bei 824 px Inhalt: 824 − 176 = 648 px, abzüglich 40 px Abstand zwischen Sprungliste und Abschnitten bleiben 608 px); heute verschwindet sie bei schmalem Fenster.

---

### 15. Projekt

**Zweck:** Für ein Projekt festlegen, was in jedem seiner Chats gilt (Anweisungen, Skills, Dokumente), und seine Chats finden.

**Einstiege:** Seitenleiste (Liste „Projekte“), Palette P-14, Projekt-Marke im Chat-Kopf und auf der Startseite, „Projekt bearbeiten“ im Seitenpanel.

**Blöcke (in Reihenfolge):**
1. `PR-1` **Seitenkopf.** Name des Projekts. Aktionen: „Neuer Chat im Projekt“ (Hauptaktion), „Einlesen“ oder „Neu einlesen“ für die Dokumente, getrennt davon „Projekt löschen“.
2. `PR-2` **Name.** Eingabefeld, speichert beim Verlassen (das ist das Umbenennen).
3. `PR-3` **Anweisungen.** Großes Textfeld mit Beispiel als Platzhalter; speichert beim Verlassen und bestätigt das mit „gespeichert“. Hinweis, dass sie für jeden Chat des Projekts gelten.
4. `PR-4` **Skills.** Skills mit Haken; gelten in jedem Chat des Projekts zusätzlich.
5. `PR-5` **Projekt-Dokumente.** Quellen (Ordner und Dateien hinzufügen, entfernen), Fortschritt und Ergebnis, Dateiliste mit Filter „nur Probleme“ (wie `WI-5` bis `WI-7`). Hinweis bei fehlendem Embedding-Modell.
6. `PR-6` **Chats.** Zahl der Chats, Liste mit Titel und Datum. Klick öffnet den Chat. Zeilenmenü wie in `RA-5` (Verschieben, Umbenennen, Löschen).

**Zustände:**

| Zustand | Inhalt |
|---|---|
| Leer | Neues Projekt: `PR-3` bis `PR-5` zeigen je einen Satz, was hier eingetragen wird. Keine Chats: Satz in `PR-6` mit „Neuer Chat im Projekt“. Keine Skills angelegt: Satz mit Weg zur Skills-Seite. |
| Lädt | Platzhalter, bis Projekt und Dokumentenstand da sind. Einlesen läuft: Fortschritt mit „Abbrechen“. |
| Fehler | Projekt gibt es nicht mehr: Hinweis mit Weg zur Startseite. Einlesen scheitert oder einzelne Dateien scheitern: wie auf der Wissen-Seite. Speichern scheitert: Meldung am Feld, der Text bleibt. |
| Ollama nicht erreichbar | Name, Anweisungen, Skills und die Chat-Liste bleiben benutzbar. „Einlesen“ ist gesperrt und nennt den Grund. „Neuer Chat im Projekt“ führt auf die Startseite mit Banner. |

**Hauptaktion:** „Neuer Chat im Projekt“.

**Ausgang:** Startseite mit Projekt-Marke; ein Chat des Projekts; nach dem Löschen die Startseite (die Chats bleiben und stehen dann ohne Projekt da).

**Breite:** eine Spalte, höchstens 720 px. Ab 1000 px Inhaltsbreite steht `PR-6` als zweite Spalte rechts daneben.

---

### Abgleich: heutige Bedienelemente → Blöcke

Bestand aus dem Code (Stand des Zweigs, nur gelesen). Jede Zeile nennt die heutige Stelle und den Block, in dem das Element künftig liegt. **V** = verlagert (anderer Ort oder andere Form, gleiche Funktion).

**Eingabefeld** (`components/chat/ChatInput.tsx` und die Knöpfe, die `ChatPage.tsx` hineinreicht)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| E-01 | Textfeld (Enter sendet, Umschalt+Enter neue Zeile) | `EF-5` |
| E-02 | Einfügen einer Datei oder eines Bilds mit Strg+V | `EF-5` → `EF-3` |
| E-03 | Datei auf das Fenster ziehen, Ablege-Hinweis | `EF-1` |
| E-04 | Büroklammer „Datei, Tabelle oder Bild anhängen“ | `EF-6` |
| E-05 | Datei-Karte mit „Entfernen“ | `EF-3` |
| E-06 | Tabellen-Karte mit „Entfernen“ | `EF-3` |
| E-07 | Bild-Vorschau mit „Entfernen“ | `EF-3` |
| E-08 | Anzeige „Wird gelesen“ | `EF-3` |
| E-09 | Warnung „Kontext zu knapp“ mit Knopf „Kontextlänge erhöhen“ | `EF-4` |
| E-10 | Meldung zu Anhang-Problemen | `EF-4` |
| E-11 | Recherche-Startkarte: drei Stufen, Kontext erhöhen, Link zu den Einstellungen, Starten, Abbrechen | `EF-4` |
| E-12 | „Senden“ | `EF-6` |
| E-13 | „Stopp“ | `EF-6` |
| E-14 | Schalter **Wissen**: Sammlungen mit Haken, Haken „neu sortieren“, Link zur Wissen-Seite | `EF-7`, `EF-8`, Chip `EF-2` (V) |
| E-15 | Schalter **Werkzeuge**: MCP-Server mit Haken, Link zu den Einstellungen, Warnung „Modell ohne Werkzeuge“ | `EF-7`, `EF-8`, Chip `EF-2` (V) |
| E-16 | Schalter **Skills**: Skills mit Haken, „Skills verwalten …“, Link zur Skills-Seite, Hinweise | `EF-7`, `EF-8`, Chip `EF-2` (V) |
| E-17 | Schalter **E-Mail**: Konten mit Haken, Link zu den Einstellungen, Warnung | `EF-7`, `EF-8`, Chip `EF-2` (V) |
| E-18 | Schalter **Recherche** (gilt für die nächste Nachricht) | `EF-7`, Chip `EF-2` (V) |
| E-19 | Schalter **Internet**: Haken „Webseiten lesen“, Haken „Im Web suchen“, Link zu den Einstellungen, Warnung | `EF-7`, `EF-8`, Chip `EF-2` (V) |
| E-20 | Zähler am Schalter (Zahl der gewählten Einträge) | Zustand in `EF-7`, Chip `EF-2` |
| E-21 | Vorlagen-Marke mit „Vorlage entfernen“ | `EF-2` |
| E-22 | Hinweiszeile unter dem Feld | `EF-9` |
| E-23 | Code-Bereich: Arbeitsweise „Manuell fragen“ oder „Plan“ | `EF-6` (Code-Form) |

**Chat** (`pages/ChatPage.tsx`, `components/chat/*`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| C-01 | Titel des Chats | `CH-1` |
| C-02 | „Chatliste ausklappen“ im Seitenkopf | `RA-2` (V) |
| C-03 | Projekt-Marke mit Link | `CH-1`, `SS-1` |
| C-04 | „Ganzen Chat in Obsidian speichern“ | `CH-1` |
| C-05 | „Chat zusammenfassen und in Obsidian speichern“ | `CH-1` |
| C-06 | Modellauswahl | `EF-6` (V) |
| C-07 | „Chat-Einstellungen“ mit Punkt | `CH-1` |
| C-08 | „Seitenbereich“ mit Füllstands-Punkt | `CH-1` |
| C-09 | Meldung „Modelle konnten nicht geladen werden“ | Zustand Fehler, Fläche 3 und 4 |
| C-10 | Hinweis im leeren Chat | `SS-1` (V) |
| C-11 | Vorlagen-Auswahl im leeren Chat, Link „Neue Vorlage“ | `SS-6` (V) |
| C-12 | Hervorhebung der angesprungenen Nachricht | `CH-2` |
| C-13 | „Nach unten“ | `CH-4` |
| C-14 | Eigene Nachricht: Kopieren | `CH-2` |
| C-15 | Eigene Nachricht: Bearbeiten (Feld, Abbrechen, „Senden und neu antworten“) | `CH-2` |
| C-16 | „Merken“ mit Editor (Text, Geltung, Speichern, Abbrechen) | `CH-2` |
| C-17 | Anhänge in der Nachricht, Bild vergrößern, Schließen | `CH-2` |
| C-18 | Gedanken aufklappen | `CH-2` |
| C-19 | Werkzeug-Zeile aufklappen (Server, Eingabe, Ergebnis) | `CH-3` |
| C-20 | Rückfrage-Karte: Einmal erlauben (auch als Erlauben, Übernehmen, Ausführen, Committen), Immer erlauben, Ablehnen | `CH-3` |
| C-21 | Rückfrage „Erinnerung speichern“ (Text, Geltung, Speichern, Ablehnen) | `CH-3` |
| C-22 | Zugriffs-Karte: Konto wählen, Server ankreuzen, „Für diesen Chat erlauben“, „Nur diese Antwort“, Ablehnen | `CH-3` |
| C-23 | Links im Text, Quellen-Marken | `CH-2` |
| C-24 | Diagramm in der Antwort | `CH-2` |
| C-25 | Antwort: Kopieren, Antwort wiederholen, In Obsidian speichern, Merken | `CH-2` |
| C-26 | Verdichtungs-Marke: „Zusammenfassung ansehen“, „Verdichtung aufheben“ | `CH-2` |
| C-27 | Zusammenfassungs-Karte: Zusammenfassen, Nein danke, Abbrechen, Titel, Text, In Obsidian speichern, Neu erzeugen, Verwerfen, Zurück zum Entwurf, Erneut versuchen, Schließen | `CH-5` |
| C-28 | Ausweich-Banner: „Zu … wechseln“, „Zurück zu …“, „Hier bleiben“, „Server verwalten“ | `CH-5`, `SS-3` |
| C-29 | Hinweis „Chat enthält Bilder, Modell kann keine“ | `CH-5` |
| C-30 | Dialog „Älteren Teil verdichten“: Text, Nochmal versuchen, Abbrechen, Übernehmen | `CH-7` |
| C-31 | Code: Änderungs-Zeile aufklappen, „Rückgängig“ | `CH-3`, `CO-4` |

**Seitenbereich und Chat-Einstellungen** (`SidePanel.tsx`, `SourceList.tsx`, `ChatSettingsPanel.tsx`, `SettingsFields.tsx`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| B-01 | Reiter Quellen, Projekt, Kontext, GPU | `SP-1` |
| B-02 | „Seitenbereich schließen“ | `SP-1` |
| B-03 | Quelle aufklappen, „Datei öffnen“ | `SP-2` |
| B-04 | „Projekt bearbeiten“ | `SP-3` |
| B-05 | Projekt-Dokumente „Einlesen“, Abbrechen, Filter „nur Probleme“ | `SP-3` |
| B-06 | „Verdichtung aufheben“ | `SP-4` |
| B-07 | „Kontextlänge auf N erhöhen“ | `SP-4` |
| B-08 | „Älteren Teil verdichten“ | `SP-4` |
| B-09 | Chat-Einstellungen: Schließen | `SP-6` |
| B-10 | Systemprompt | `SP-6` |
| B-11 | Kontextlänge (Auswahl) | `SP-6` |
| B-12 | Temperatur (Regler), „Auf Standard zurücksetzen“ | `SP-6` |
| B-13 | Seed | `SP-6` |
| B-14 | Denken (Auswahl) | `SP-6` |
| B-15 | „Als Vorlage speichern“, Namensfeld, Speichern | `SP-6` |

**Rahmen** (`NavRail.tsx`, `ChatList.tsx`, `ChatRow.tsx`, `FolderSection.tsx`, `MoveMenu.tsx`, `SearchResults.tsx`, `StatusFlyout.tsx`, `StatusPill.tsx`, `ShortcutHelp.tsx`, `ConfirmDialog.tsx`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| R-01 | Symbolleiste: Chat, Vorlagen, Code, Modelle | `RA-3` |
| R-02 | Symbolleiste: E-Mail, Wissen, Skills | `EF-8` „Verwalten …“, `ES-2`, Palette P-05 bis P-07 (V) |
| R-03 | Symbolleiste: Status-Knopf mit Popup („Ganze Seite“, Schließen) | `RA-6` |
| R-04 | Symbolleiste: Farbschema-Wechsler | `ES-3`, Palette P-19 (V) |
| R-05 | Symbolleiste: Einstellungen | `RA-6` |
| R-06 | Chatliste: „Neuer Chat“ | `RA-3` (Bereich „Chat“), Strg+N, Palette P-11 (V) |
| R-07 | Chatliste: „Neues Projekt“ mit Namensfeld | `RA-4`, Palette P-12 |
| R-08 | Chatliste: „Chatliste einklappen“ | `RA-2` (V: klappt die ganze Leiste) |
| R-09 | Chatliste: Suchfeld, „Suche leeren“ | `PA-1`, Auslöser `RA-2` (V) |
| R-10 | Suchergebnisse: Chats und Nachrichten-Treffer | `PA-3`, `PA-4` (V) |
| R-11 | Projekt-Zeile: auf- und zuklappen | `RA-4` (V: Klick öffnet die Projektseite, die Chats stehen in `PR-6`) |
| R-12 | Projekt-Zeile: „Projekt öffnen“ | `RA-4` |
| R-13 | Projekt-Zeile: „Projekt umbenennen“ | `RA-4` Zeilenmenü, `PR-2` |
| R-14 | Projekt-Zeile: „Projekt löschen“ | `RA-4` Zeilenmenü, `PR-1` |
| R-15 | Projekt-Zeile als Ablageziel für Chats; Marke „mit Anweisungen oder Dokumenten“ | `RA-4` |
| R-16 | Abschnitt „Chats“ mit Tagesgruppen (Heute, Gestern, …); der Abschnitt als Ablageziel, um einen Chat aus einem Projekt zu lösen | `RA-5` ohne Gruppen, Datum in `PA-4`; Lösen über „Verschieben nach … → ohne Projekt“ im Zeilenmenü (V) |
| R-17 | Chat-Zeile: öffnen, Datum im Tooltip, ziehen | `RA-5`, `PR-6` |
| R-18 | Chat-Zeile: „Verschieben nach …“ mit Menü | Zeilenmenü `RA-5`, `PR-6`; „Mehr“ in `CH-1` |
| R-19 | Chat-Zeile: „Umbenennen“ | Zeilenmenü `RA-5`, `PR-6`; „Mehr“ in `CH-1` |
| R-20 | Chat-Zeile: „Löschen“ | Zeilenmenü `RA-5`, `PR-6`; „Mehr“ in `CH-1` |
| R-21 | Status-Zeile am Fuß der Chatliste | `RA-6` |
| R-22 | Tastenkürzel-Übersicht, Schließen | `RA-7` |
| R-23 | Bestätigungsdialog: Abbrechen, Bestätigen | `RA-7` |
| R-24 | Menüzeile des Fensters | siehe §IA „Menüzeile: Verbleib der Funktionen“ |

**Tastenkürzel** (`shortcuts/keymap.ts`)

| Nr. | Kürzel heute | Künftig |
|---|---|---|
| K-01 | Strg+N neuer Chat | bleibt; Startseite, Fokus in `EF-5` |
| K-02 | Strg+K Chats durchsuchen | öffnet die Palette (Fläche 2) |
| K-03 | Strg+L ins Eingabefeld | bleibt; `EF-5` |
| K-04 | Strg+J Chat-Einstellungen | bleibt; `SP-6` |
| K-05 | Strg+B Chatliste | klappt die Seitenleiste; `RA-2` |
| K-06 | Strg+, Einstellungen | bleibt; Fläche 14 |
| K-07 | Esc stoppt die Antwort | bleibt; `EF-6`. Schließt zuerst jede offene Überlagerung. |
| K-08 | Strg+/ und F1 Übersicht | bleibt; `RA-7` |

**Vorlagen** (`pages/TemplatesPage.tsx`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| V-01 | „Neue Vorlage“ | `VO-1` |
| V-02 | Zeile der Liste | `VO-1` |
| V-03 | „Chat damit starten“ | `VO-2` |
| V-04 | „Vorlage löschen“ | `VO-2` |
| V-05 | „Speichern“ | `VO-2` |
| V-06 | Name, Modell (Auswahl) | `VO-3` |
| V-07 | Wissen, MCP-Server, Skills (je Haken-Liste) | `VO-3` |
| V-08 | Parameter (Systemprompt, Kontextlänge, Temperatur mit Zurücksetzen, Seed, Denken) | `VO-3` |

**Wissen** (`pages/KnowledgePage.tsx`, `components/knowledge/CollectionEditor.tsx`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| W-01 | „Neue Sammlung“ | `WI-1` |
| W-02 | Zeile der Liste | `WI-1` |
| W-03 | „Einlesen“, „Neu einlesen“, „Abbrechen“ | `WI-2` |
| W-04 | „Sammlung löschen“ | `WI-2` |
| W-05 | Link „Einstellungen → Obsidian“ | `WI-3` |
| W-06 | Name | `WI-4` |
| W-07 | „Ordner hinzufügen“, „Dateien hinzufügen“, „Quelle entfernen“ | `WI-5` |
| W-08 | Filter „nur Probleme“ | `WI-7` |

**E-Mail** (`pages/MailPage.tsx`, `components/mail/*`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| M-01 | „Zu den Einstellungen“ (ohne Konto) | `EM-6` |
| M-02 | Konto-Auswahl | `EM-1` |
| M-03 | Suchfeld | `EM-1` |
| M-04 | „Sortieren vorschlagen“ | `EM-1` |
| M-05 | „Neu laden“ | `EM-1` |
| M-06 | Zeile der Liste | `EM-2` |
| M-07 | „Mehr laden“ | `EM-2` |
| M-08 | „Zu den Einstellungen und neu anmelden“ | Zustand Fehler, `EM-2` |
| M-09 | „Zusammenfassen“, „Abbrechen“ | `EM-3` |
| M-10 | Zusammenfassung „Schließen“ | `EM-4` |
| M-11 | Sortieren: „Vorschläge holen“, „Abbrechen“, „Schließen“ | `EM-5` |
| M-12 | Sortieren: Haken je Vorschlag, „Alle auswählen“ oder „Keine auswählen“, „Änderungen übernehmen“ | `EM-5` |
| M-13 | „Labels verwalten“: aufklappen, Umbenennen (Feld, Speichern, Abbrechen), neues Label (Feld, Anlegen) | `EM-5` |

**Code** (`pages/CodePage.tsx`, `components/code/*`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| O-01 | „Neue Sitzung“ | `CO-1` |
| O-02 | Zeile der Sitzungsliste, „Sitzung löschen“ | `CO-1` |
| O-03 | Dateibaum: Ordner auf und zu, Datei wählen | `CO-2` |
| O-04 | „Datei schließen“ | `CO-3` |
| O-05 | Modellauswahl des Agenten | `EF-6` (Code-Form) (V) |
| O-06 | „Plan umsetzen“ | `CO-4` |
| O-07 | Arbeitsweise, Eingabefeld, Senden, Stopp | `CO-4` über `EF-5`, `EF-6` |
| O-08 | Rückfragen und „Rückgängig“ | `CO-4` über `CH-3` |

**Skills** (`pages/SkillsPage.tsx`, `components/skills/*`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| S-01 | „Neuer Skill“ | `SK-1` |
| S-02 | „Von GitHub“ | `SK-1` Menü → `SK-5` |
| S-03 | „Skill-Dateien hinzufügen“ | `SK-1` Menü → `SK-4` |
| S-04 | „Alle neu laden“ | `SK-1` Menü |
| S-05 | „Skill-Ordner im Explorer öffnen“ | `SK-1` Menü |
| S-06 | Ablegen von Dateien auf die Liste | `SK-1` |
| S-07 | Zeile der Liste | `SK-1` |
| S-08 | „Diesen Skill neu laden“, „Ordner dieses Skills öffnen“ | `SK-2` Menü |
| S-09 | „Skill löschen“ | `SK-2` |
| S-10 | „Speichern“ | `SK-2` |
| S-11 | Name, Beschreibung, Anleitung | `SK-3` |
| S-12 | Dialog „Skill hinzufügen“: Ablegen, „Dateien wählen“, Haken je Skill, aufklappbar (Zusatzdateien, nicht übernommen, Anleitung lesen), Haken „Warnungen gelesen“, „Andere Dateien“ oder „Zurück zur Auswahl“, Abbrechen, „Hinzufügen“ | `SK-4` |
| S-13 | Dialog „Von GitHub“: Feld, „Los“, „Skills ansehen“, „Zurück zu den Treffern“, Haken je Skill, Abbrechen, „Prüfen“ | `SK-5` |

**Modelle** (`pages/ModelsPage.tsx`, `components/models/DownloadPanel.tsx`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| D-01 | „Aktualisieren“ | `MO-1` |
| D-02 | Feld für den Modellnamen, „Herunterladen“ | `MO-2` |
| D-03 | Link zur Ollama-Bibliothek | `MO-2` |
| D-04 | „Download abbrechen“, „Aus der Liste entfernen“ | `MO-3` |
| D-05 | „löschen“ je Modell | `MO-4` |

**Status** (`pages/StatusPage.tsx`, `components/status/*`): keine Bedienelemente; Inhalte in `ST-3` und `ST-4`, die Verbindung aus dem Tooltip der Leiste in `ST-2`.

**Einstellungen** (`pages/SettingsPage.tsx`, `components/settings/*`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| G-01 | Sprungliste (acht Einträge) | `ES-1` |
| G-02 | Farbschema (drei), Sprache (drei) | `ES-3` |
| G-03 | Ollama-Server: aktiven wählen, Testen, Bearbeiten, Löschen | `ES-4` |
| G-04 | Ollama-Server: „Server hinzufügen“, Name, Adresse, Speichern, Abbrechen, Hilfe aufklappen | `ES-4` |
| G-05 | MCP: „Dateisystem-Server hinzufügen“, Name, Ordner hinzufügen und entfernen, Speichern, Abbrechen | `ES-5` |
| G-06 | MCP je Server: Haken „eingeschaltet“, Neu starten, Bearbeiten, Löschen, Meldungen aufklappen | `ES-5` |
| G-07 | MCP je Werkzeug: Freigabe Immer, Fragen, Aus; „Zurück auf Standard“; Werkzeuge aufklappen | `ES-5` |
| G-08 | Obsidian: „Vault einrichten“, Vault-Ordner, „Ordner wählen“, Unterordner, Speichern, Abbrechen, Ändern, Entfernen, „Zur Sammlung“ | `ES-6` |
| G-09 | Erinnerungen: „Neu laden“, „Notiz öffnen“, „Erinnerung löschen“, neues Textfeld, Geltung, „Merken“ | `ES-6` |
| G-10 | E-Mail: „Gmail einrichten“, Client-ID, Clientschlüssel, Speichern, Abbrechen, Ändern, Entfernen | `ES-7` |
| G-11 | E-Mail: „Mit Google anmelden“ oder „Weiteres Konto anmelden“, Abbrechen (Warten), „Abmelden“ | `ES-7` |
| G-12 | Internet-Suche: Schlüssel-Feld, Speichern, Abbrechen, Testen, Ersetzen, Entfernen | `ES-8` |
| G-13 | Datenschutzerklärung anzeigen oder ausblenden | `ES-9` |
| G-14 | Update: „Nach Updates suchen“, „Herunterladen und installieren“, Abbrechen, „Jetzt neu starten und installieren“ | `ES-10` |
| G-15 | Lizenzen anzeigen oder ausblenden | `ES-10` |

**Projekt** (`pages/ProjectPage.tsx`)

| Nr. | Heutiges Bedienelement | Block |
|---|---|---|
| J-01 | „Neuer Chat im Projekt“ | `PR-1` |
| J-02 | „Einlesen“, „Neu einlesen“, „Abbrechen“ | `PR-1` |
| J-03 | „Projekt löschen“ | `PR-1` |
| J-04 | Name | `PR-2` |
| J-05 | Anweisungen | `PR-3` |
| J-06 | Skills (Haken-Liste) | `PR-4` |
| J-07 | Dokumente: „Ordner hinzufügen“, „Dateien hinzufügen“, „Quelle entfernen“, Filter „nur Probleme“ | `PR-5` |
| J-08 | Zeile der Chat-Liste | `PR-6` |

**Ergebnis des Abgleichs:** Kein heutiges Bedienelement bleibt ohne Block. Verlagert (V) sind: die sechs Schalter des Eingabefelds (ins „+“-Menü mit Chips), die Modellauswahl (ins Eingabefeld), Suche und Suchergebnisse (in die Palette), der Farbschema-Wechsler (Einstellungen und Palette), „Neuer Chat“ (Bereich „Chat“), das Aufklappen der Projekte und die Tagesgruppen (Projektseite und Palette), die Vorlagen-Auswahl (Startseite). Neu hinzugekommen und ohne heutiges Gegenstück: Palette, „+“-Menü mit Chips, Startseite mit `SS-2` und `SS-5`, Titelleiste, `ES-2`, `ST-2`, das Menü „Mehr“ in `CH-1` und „Zurück zum Chat“.

### Abweichungen und offene Punkte

**Gegenüber der bestätigten Gliederung (§IA), nicht stillschweigend geändert:**

1. (Vom Nutzer bestätigt am 2026-11-14.) §IA nennt die Einträge des „+“-Menüs „Schalter“ und stellt „Verwalten …“ an den Menüeintrag. Im Code haben fünf der sechs Einträge eine Auswahl dahinter. Diese Spec macht daraus ein zweistufiges Menü und setzt „Verwalten …“ ans Ende des Untermenüs. Die Tabelle in §IA bleibt unverändert, bis der Nutzer entschieden hat.
2. (Vom Nutzer bestätigt am 2026-11-14.) §IA beschreibt „Chat“ in der Leiste als Bereich. Diese Spec legt fest, dass ein Klick darauf immer einen neuen Chat (die Startseite) öffnet, weil es keinen eigenen Knopf „Neuer Chat“ gibt.
3. Palettenbefehl P-17 nennt als Aktion „Seitenpanel“. Gemeint ist hier die zweite Ansicht „Chat-Einstellungen“ (`SP-6`).
4. §IA, Tabelle „Überlauf“, Zeile „Leere Listen“: mit Zustimmung des Nutzers am 2026-11-14 an die Rahmen-Spec angeglichen (je ein Satz und genau eine Aktion). Kein Widerspruch mehr.

**Gegenüber dem freigegebenen Mock:** „Zuletzt“ ist durch „Mit Vorlage starten“ ersetzt. Die Statistikzeile zeigt keinen Wert „bis zum ersten Wort“, weil die App ihn nicht hat. „Verwalten …“ steht nicht neben dem Eintrag.

**Vom Nutzer bestätigt am 2026-11-14 (DW-2.7), alle acht Punkte:**

1. „+“-Menü zweistufig, „Verwalten …“ als letzter Punkt des Untermenüs statt neben dem Eintrag.
2. Startseite: „Zuletzt“ entfällt, an seiner Stelle „Mit Vorlage starten“.
3. „Chat“ in der Leiste öffnet immer einen neuen Chat; es gibt keinen eigenen Knopf „Neuer Chat“ (Alternative: ein „+“ am Kopf „Letzte Chats“).
4. Rechts ein Platz mit zwei Ansichten wie heute (Seitenpanel oder Chat-Einstellungen), statt eines Panels mit fünf Reitern.
5. Chat umbenennen, verschieben, löschen über das Menü „Mehr“ im Chat-Kopf und das Zeilenmenü; in der Leiste keine Tagesgruppen mehr, Projekte klappen nicht mehr auf.
6. Modellauswahl im Eingabefeld statt im Seitenkopf (wie im Mock).
7. Code bei schmaler Inhaltsfläche: Die Sitzungsliste wird zur Auswahl im Seitenkopf.
8. Einstellungen: neue Gruppe „Verwalten“ ganz oben (Wissen, Skills, Postfach); der bestehende Abschnitt heißt dann „E-Mail-Konto“, damit „E-Mail“ nicht zweimal vorkommt (Name endgültig in Phase 5).

**Hinweise für den späteren Code-Umbau (keine Entscheidung nötig):** Entwurf im Eingabefeld je Chat behalten; Anhang-Meldung nicht nach 8 Sekunden ausblenden; bei ungespeicherten Änderungen in Vorlagen und Skills vor dem Verlassen fragen.

### Validation

**NOT VALIDATED durch Test.** Abläufe und Seiten-Specs sind aus dem Code, den freigegebenen Mocks und den Aussagen eines Nutzers abgeleitet; es gab keine Beobachtung und keinen Test mit Hilfstechnik. Die Prüfung durch den design-review-agent findet wahrscheinliche Probleme, keine gemessenen (Heuristik ersetzt keinen Nutzertest). Bestätigung durch den Nutzer: **offen**.
