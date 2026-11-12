# JOURNEY.md

<!-- Struktur- und Ablauf-Spezifikation von LocalDesk. Gehört zu DESIGN.md (visuelle Tokens). Für Farben, Schrift und Abstände siehe DESIGN.md (entsteht in Phase 3). -->

**Status:** Gliederung vom Nutzer bestätigt am 2026-11-12 (Phase 1: Job, Journey, IA). Flows und Seiten-Specs folgen in Phase 2.
**Grenze dieses Dokuments:** `journey` regelt die **Struktur** (Gliederung, Navigation, Wege zwischen Flächen). Die Bedienung **im** Chat (Eingabefeld, Rückfrage-Karten, laufende Antwort) wird in Phase 2 mit `usability` und `ai-native` spezifiziert und steht hier nicht.
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
| Leere Listen | „Projekte“ zeigt nur den Kopf mit „+“; „Letzte Chats“ zeigt einen Hinweis (Text Phase 5). |

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

<!-- Phase 2: Abläufe mit Entscheidungen und Fehlerpfaden (erste Nachricht von der Startseite; Anhang und Schalter über „+“-Menü mit Chip; Werkzeug-Rückfrage erlauben/ablehnen; Strg+K bis zum Ziel; Ollama nicht erreichbar bis wieder bereit; Recherche starten). -->

*Phase 2.* Noch nicht geschrieben.

---

## Page specs

<!-- Phase 2: Seiten-Specs für 15 Flächen: Rahmen (Titelleiste + Seitenleiste), Befehlspalette, Startseite, laufender Chat, Eingabefeld mit „+“-Menü, Seitenpanel (Kontext/Quellen), Vorlagen, Wissen, E-Mail, Code, Skills, Modelle, Status, Einstellungen, Projekt. Texte kommen in Phase 5, Diagramm-Regeln in Phase 6. -->

*Phase 2.* Noch nicht geschrieben. Offene Punkte, die dort geklärt werden: „Zuletzt“ auf der Startseite wiederholt die Leiste (begründen oder ersetzen); Verhalten der Startseite unter 1440 px; Wissen-Verwaltung ist nur über „Verwalten …“ und Strg+K erreichbar (bewusst); Ziehen von Chats auf Projekte; Zeilenmenü der Projekte.
