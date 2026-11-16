# Design: Späte Stunde

**Datum:** 2026-11-15 · **Status:** confirmed – gesperrt vom Nutzer am 2026-11-15
**Archetyp:** Creator, mit Sage als Beiklang · **Register:** ruhige Struktur · ausdrucksvoll an: Startseite „Dein PC“, Antwort mit Quellen
**Grounding:** Saul Bass’ Filmvorspann-Collagen: versetzte, sich überlappende Flächen + die Relief-Schummerung der Schweizer Landeskarte: schräges Licht, kühler Schatten, Tiefe ohne Linien
**DNA:** Cinematic Dark + Schrift aus Swiss (Inter, Vorgabe) + kühle Tiefe aus Organic / Natural („Blaue Stunde“) · **Dominante Achse:** Farbe und Licht
**Composition:** <dealt> (Cinematic Dark + Fractured Grid; Hand 5 aus `scripts/dealer.mjs --project localdesk --date 2026-11-14 --reroll 1`, Seed `localdesk|2026-11-14|1`). Die Hand steht auf Regler 9 von 10. **Ausgeführt wird sie gedämpft, etwa bei 4 bis 5:** Die Struktur ist ruhig (Leiste, Spalte und Listen sitzen im Raster), versetzt sind nur die schwebenden Flächen in Chat und Startseite. Höher dreht der Regler allein auf der Startseite „Dein PC“. Grund: Register „Produkt“, tägliche Arbeit.
**Deal:** Der erste Deal (`--reroll 0`) wurde verworfen, weil er „Terminal / Mono-Core“ (Mono-Schrift überall) und „Neo-Brutalist“ (dicke Rahmen, harte Kanten) enthielt; beides steht gegen den Geschmack des Nutzers. Es gilt der zweite Deal (`--reroll 1`). Beide stehen in `.design-foundations/used-dna.json`.
**Pins:** Schrift Inter (Vorgabe) · Fließtext mindestens 15 px (Vorgabe) · Dunkel zuerst, Hell vollwertig (Vorgabe) · Synthese des Nutzers vom 2026-11-15 aus Kandidat 5 „Späte Lampe“ und Kandidat 1 „Blaue Stunde“: Bernstein führt, blaue Tiefe; kein Kasten um den Inhalt; versetzte Flächen und Licht; Quellen als Fußnoten; schräger Ton-Schnitt · Getauscht gegenüber Hand 5: Signatur (jetzt der Ton-Schnitt aus 1), zweiter Farbton 230° nur für Tiefe und Schatten
**Entscheidungen des Nutzers bei der Sperre (2026-11-15):** Die Farbe gilt so, wie sie im Vorschau-Blatt zu sehen war: Bernstein `#e69a58` in Dunkel trotz der Nähe zum früheren „Werkbank“-Orange, dunkler Bernstein `#825936` als Vollton in Hell. Die eine feine Kante am Eingabefeld ist angenommen („Ja, passt“). Sperre: „Ja, sperren“.

<!-- Gehört zu JOURNEY.md (Aufbau, Abläufe, Seiten). Dieses Dokument regelt das Aussehen. Bausteine stehen unten (Phase 4), die Stimme gleich nach „Nie“ (Phase 5); die Daten-Palette steht unten (Phase 6). -->

## Richtung

Dein PC am Abend. Von oben links fällt warmes Lampenlicht auf die Arbeitsfläche, rechts davon liegt kühler, blauer Schatten. Darauf schweben warme, runde Flächen, leicht versetzt, ohne Rahmen. Das soll sich anfühlen wie ein ruhiges, hochwertiges Werkzeug, das bei dir zu Hause läuft, und nicht wie ein beliebiger Chat.

Warum das zu LocalDesk passt: Die App läuft lokal und wird täglich lange benutzt. Warme Flächen mit großer Schrift sind lange gut lesbar; die Tiefe kommt aus Ton und weichem Schatten statt aus Kästen und Linien (das war die Hauptbeschwerde am alten Stand).

**Wie die zwei Wünsche „kein Kasten“ und „versetzte, schwebende Flächen“ zusammengehen:** Um den Inhalt liegt keine Hauptfläche und nirgends ein Rahmen. Seitenleiste und Inhalt teilen sich einen durchgehenden Grund. Was schwebt, sind nur einzelne Dinge: die eigene Nachricht, ein Diagramm, das Eingabefeld, Menüs. Sie heben sich allein durch eine hellere Tonstufe und einen weichen, blau getönten Schatten ab. Die einzige Kante im ganzen System trägt das Eingabefeld (siehe „Rand von Bedienelementen“).

## Signatur

**Der Lichtschnitt.** Durch jedes Fenster läuft genau eine schräge Kante, immer im Winkel von 104° und immer bei 61,8 % der Fensterbreite. Links davon ist der Grund warm (`--background`), rechts kühl (`--background-deep`). Es ist die Grenze zwischen Lampenlicht und Schatten: eine harte Tonkante, kein Verlauf.

Regeln, damit sie überall gleich bleibt:

- Sie liegt im Grund des Fensters, hinter allem. Flächen, Text und Leiste liegen darüber und werden von ihr nicht geschnitten.
- Es gibt keine zweite Schräge im Bild: keine schrägen Knöpfe, keine schrägen Trenner, keine schrägen Bilder.
- Sie bewegt sich nie und reagiert auf nichts.
- Bei eingeklappter Seitenleiste und bei 900 px Breite bleiben Winkel und Anteil gleich.

CSS des Grunds (verbindlich):

```css
background-color: var(--background);
background-image:
  linear-gradient(104deg, transparent 0 61.8%, var(--background-deep) 61.8% 100%),
  radial-gradient(900px 620px at 8% -8%, var(--glow), transparent 72%);
```

## Ausdrucksvolle Momente

Alles andere bleibt ruhig. An drei Stellen darf es mehr sein:

1. **Ankommen (Startseite „Dein PC“):** Der Lichtschein oben links ist hier am deutlichsten sichtbar, weil die Seite fast leer ist. Stärke: mittel. Der Schein ist der einzige Verlauf im System.
2. **Ergebnis prüfen (Antwort mit Quellen): Fußnoten.** Quellen und Messwerte stehen als echte Fußnoten unter der Antwort: hochgestellte Ziffer im Text (`--accent-text`, Tabellenziffern), darunter eine kurze Linie von 120 px, dann die nummerierten Quellen in `--text-xs`, darunter die Messwerte. Keine Kästen, keine Chips. Stärke: leise, aber bei jeder Antwort mit Quelle. Die Fußnoten sind bewusst **nicht** die Signatur: Sie kommen nur in Antworten vor, der Lichtschnitt in jedem Fenster. Zwei gleichrangige Erkennungszeichen würden sich die Aufmerksamkeit teilen; so gehört dem einen das Fenster und dem anderen der Inhalt.
3. **Versatz der schwebenden Flächen:** Die eigene Nachricht ragt 36 px nach rechts über die Lesespalte, ein Diagramm 36 px nach links, das Eingabefeld 24 px nach links (jeweils die Obergrenze; bei schmalem Fenster gilt die Regel „Versatz bei schmalem Fenster“ unter „Abstände, Form, Tiefe“: bei 900 px Fenster 12 px). Nur im Chat und auf der Startseite. Auf Listen- und Formularseiten (Modelle, Einstellungen, Wissen, Skills) sitzt alles bündig, sonst wirkt es unordentlich.

## Schrift

- **Schrift für alles:** Inter (Variable Font, liegt der App bei als `@fontsource-variable/inter`; Ersatz: `system-ui, "Segoe UI", sans-serif`). Keine zweite Familie, keine Mono-Schrift als Stilmittel.
- **Festbreite (`--font-mono`) nur für Code und Programm-Ausgaben** (Entscheidung des Nutzers, 2026-11-20): in der Rückfrage-Karte (Befehl, Eingabe des Werkzeugs), in der Code-Dateiansicht (Dateiinhalt), im Vorher/Nachher einer Änderung und bei den Meldungen eines MCP-Servers. **Nirgends sonst:** nicht in Überschriften, Knöpfen, Listen, Tabellen, Chips, Menüs, Zahlen oder Fließtext, auch nicht „zur Betonung“; alles andere bleibt Inter (Zahlen mit Tabellenziffern aus Inter). Der frühere Einwand gegen Mono als Stilmittel bleibt: Die Festbreite zeigt hier, dass etwas Text der Maschine ist, kein Stil.
- **Skala:** Verhältnis 1,25 ab 16 px aufwärts; darunter feste Stufen mit mindestens 2 px Abstand (Auftrag aus der Mock-Prüfung: 14/15/17 lag zu dicht).

```css
:root {
  --text-xs: 12px;    /* Fußnoten, Messwerte, Kürzel, Gruppenköpfe */
  --text-sm: 14px;    /* Leiste, Knöpfe, Chips, Tabellen, Beschriftungen */
  --text-base: 16px;  /* Fließtext, Nachrichten, Eingabefeld */
  --text-lg: 20px;    /* Überschriften in Antworten, Kartentitel */
  --text-xl: 25px;    /* Seitentitel */
  --text-2xl: 31px;   /* Titel der Startseite */
  --text-3xl: 39px;   /* große Zahl (Status, Startseite) */
  --text-4xl: 49px;   /* Reserve für einen einzelnen großen Wert */

  --leading-body: 1.6;
  --leading-ui: 1.35;
  --leading-display: 1.15;

  --weight-body: 400;
  --weight-ui: 500;
  --weight-strong: 600;

  --tracking-display: -0.02em;  /* ab --text-xl */
  --tracking-body: 0;
}
```

- **Fließtext ist 16 px** (Vorgabe: mindestens 15 px). Kleiner als 12 px wird nichts gesetzt.
- **Gewichte:** 400 Text, 500 Bedienung, 600 Titel und Hervorhebung. Kein 700, kein dünner Schnitt.
- **Optische Größe:** bleibt auf automatisch (`font-optical-sizing: auto`); Titel ab `--text-xl` bekommen dadurch die engere Display-Form.
- **Ziffern:** Tabellenziffern (`font-feature-settings: "tnum"`) überall, wo Zahlen untereinander stehen oder sich ändern: Diagrammwerte, Messwerte, Tabellen, Fußnoten-Ziffern.
- **Zeilenlänge:** Fließtext höchstens rund 66 Zeichen je Zeile. Als Token: `--measure: 58ch` (die Einheit `ch` ist die Breite der Null und damit breiter als ein durchschnittlicher Buchstabe von Inter; 66ch ergäbe rund 87 Zeichen).
- **Grenze der mitgelieferten Datei:** Sie kennt Tabellenziffern und die optische Größe, aber nicht die alternativen Buchstabenformen (einstöckiges a, durchgestrichene Null). Die Stimme entsteht also nur aus Größe, Gewicht, Laufweite und Ziffern.

## Farb-Tokens

Zwei Läufe von `scripts/palette.mjs`, beide wörtlich. Kein Farbwert ist nach Augenmaß gewählt: Alle Stufen stammen aus `palette.mjs`; die einzige Ausnahme ist `--control-edge`, das nach einer festen Regel gerechnet ist (siehe „Rand von Bedienelementen“).

**Lauf 1: Bernstein, die führende Farbe.** `node scripts/palette.mjs --seed 60.38 --chroma balanced --harmony mono` (Exit 0)

```css
/* Generated by design-for-ai palette.mjs */
/* seed: hue 60.379999999999995 · chroma: balanced · harmony: mono */

:root {
  --neutral-1: #fdfdfc;
  --neutral-2: #faf8f7;
  --neutral-3: #f2f0ee;
  --neutral-4: #ebe7e4;
  --neutral-5: #e2ddd9;
  --neutral-6: #d7d1cc;
  --neutral-7: #cac2bc;
  --neutral-8: #b2a9a2;
  --neutral-9: #b7aca3;
  --neutral-10: #a49991;
  --neutral-11: #68625d;
  --neutral-12: #302d2b;
  --accent-1: #fffcfa;
  --accent-2: #fff7f1;
  --accent-3: #ffeddf;
  --accent-4: #fce2ce;
  --accent-5: #fad6bb;
  --accent-6: #f5c8a5;
  --accent-7: #ecb78c;
  --accent-8: #d99c68;
  --accent-9: #e69a58;
  --accent-10: #d0894b;
  --accent-11: #825936;
  --accent-12: #3e2917;
  --accent-on-solid: #140b05;
  --error-3: #ffebe9;
  --error-9: #e1524f;
  --error-11: #974843;
  --success-3: #e0f8e0;
  --success-9: #5ad664;
  --success-11: #337437;
  --warning-3: #f9f0dd;
  --warning-9: #dbb155;
  --warning-11: #76602f;
  --info-3: #e3f3ff;
  --info-9: #5baee5;
  --info-11: #3d6886;
  --background: var(--neutral-1);
  --surface: var(--neutral-2);
  --surface-hover: var(--neutral-3);
  --surface-active: var(--neutral-4);
  --border-subtle: var(--neutral-6);
  --border: var(--neutral-7);
  --border-strong: var(--neutral-8);
  --text-secondary: var(--neutral-11);
  --text: var(--neutral-12);
  --accent-bg-subtle: var(--accent-3);
  --accent-solid: var(--accent-9);
  --accent-solid-hover: var(--accent-10);
  --accent-text: var(--accent-11);
}

[data-theme="dark"] {
  --neutral-1: #131312;
  --neutral-2: #1a1919;
  --neutral-3: #242220;
  --neutral-4: #2c2927;
  --neutral-5: #35312e;
  --neutral-6: #403b37;
  --neutral-7: #4e4842;
  --neutral-8: #675f58;
  --neutral-9: #b7aca3;
  --neutral-10: #cabfb6;
  --neutral-11: #bdb6b1;
  --neutral-12: #ebe7e4;
  --accent-1: #15120f;
  --accent-2: #1e1814;
  --accent-3: #2c1f15;
  --accent-4: #382515;
  --accent-5: #462b14;
  --accent-6: #563211;
  --accent-7: #693d11;
  --accent-8: #89511a;
  --accent-9: #e69a58;
  --accent-10: #f8af70;
  --accent-11: #dbad88;
  --accent-12: #fee2cc;
  --accent-on-solid: #140b05;
  --error-3: #331a18;
  --error-9: #e1524f;
  --error-11: #f49c95;
  --success-3: #152715;
  --success-9: #5ad664;
  --success-11: #88cb8a;
  --warning-3: #282113;
  --warning-9: #dbb155;
  --warning-11: #cdb482;
  --info-3: #17242d;
  --info-9: #5baee5;
  --info-11: #90bedf;
  --background: var(--neutral-1);
  --surface: var(--neutral-2);
  --surface-hover: var(--neutral-3);
  --surface-active: var(--neutral-4);
  --border-subtle: var(--neutral-6);
  --border: var(--neutral-7);
  --border-strong: var(--neutral-8);
  --text-secondary: var(--neutral-11);
  --text: var(--neutral-12);
  --accent-bg-subtle: var(--accent-3);
  --accent-solid: var(--accent-9);
  --accent-solid-hover: var(--accent-10);
  --accent-text: var(--accent-11);
}
```

**Lauf 2: Blau, nur für Tiefe.** `node scripts/palette.mjs --seed 230.34 --chroma balanced --harmony mono --prefix depth` (Exit 0). Der Farbton ist der gedealte Ton von „Blaue Stunde“ und liegt dem Bernstein fast gegenüber (170° Abstand, Komplementär-Beziehung: warm vorn, kühl hinten).

```css
/* Generated by design-for-ai palette.mjs */
/* seed: hue 230.34000000000003 · chroma: balanced · harmony: mono */

:root {
  --depth-neutral-1: #fcfdfd;
  --depth-neutral-2: #f8f9fa;
  --depth-neutral-3: #eef1f3;
  --depth-neutral-4: #e4e9eb;
  --depth-neutral-5: #d9dfe2;
  --depth-neutral-6: #ccd4d8;
  --depth-neutral-7: #bcc5ca;
  --depth-neutral-8: #a2adb2;
  --depth-neutral-9: #a6b3ba;
  --depth-neutral-10: #94a1a7;
  --depth-neutral-11: #5d6468;
  --depth-neutral-12: #2b2e30;
  --depth-accent-1: #fafdff;
  --depth-accent-2: #f2faff;
  --depth-accent-3: #e1f4fe;
  --depth-accent-4: #d2edfb;
  --depth-accent-5: #bfe5f8;
  --depth-accent-6: #abdaf2;
  --depth-accent-7: #93cdea;
  --depth-accent-8: #6eb5d8;
  --depth-accent-9: #62bee8;
  --depth-accent-10: #54aad1;
  --depth-accent-11: #3a6a81;
  --depth-accent-12: #19313d;
  --depth-accent-on-solid: #050f14;
  --depth-error-3: #ffebe9;
  --depth-error-9: #e1524f;
  --depth-error-11: #974843;
  --depth-success-3: #e0f8e0;
  --depth-success-9: #5ad664;
  --depth-success-11: #337437;
  --depth-warning-3: #f9f0dd;
  --depth-warning-9: #dbb155;
  --depth-warning-11: #76602f;
  --depth-info-3: #e3f3ff;
  --depth-info-9: #5baee5;
  --depth-info-11: #3d6886;
  --depth-background: var(--depth-neutral-1);
  --depth-surface: var(--depth-neutral-2);
  --depth-surface-hover: var(--depth-neutral-3);
  --depth-surface-active: var(--depth-neutral-4);
  --depth-border-subtle: var(--depth-neutral-6);
  --depth-border: var(--depth-neutral-7);
  --depth-border-strong: var(--depth-neutral-8);
  --depth-text-secondary: var(--depth-neutral-11);
  --depth-text: var(--depth-neutral-12);
  --depth-accent-bg-subtle: var(--depth-accent-3);
  --depth-accent-solid: var(--depth-accent-9);
  --depth-accent-solid-hover: var(--depth-accent-10);
  --depth-accent-text: var(--depth-accent-11);
}

[data-theme="dark"] {
  --depth-neutral-1: #121313;
  --depth-neutral-2: #191a1a;
  --depth-neutral-3: #202224;
  --depth-neutral-4: #272b2c;
  --depth-neutral-5: #2e3336;
  --depth-neutral-6: #373d40;
  --depth-neutral-7: #434a4e;
  --depth-neutral-8: #586267;
  --depth-neutral-9: #a6b3ba;
  --depth-neutral-10: #bac6cd;
  --depth-neutral-11: #b1b9bd;
  --depth-neutral-12: #e4e9eb;
  --depth-accent-1: #101315;
  --depth-accent-2: #151a1d;
  --depth-accent-3: #16242b;
  --depth-accent-4: #172d38;
  --depth-accent-5: #163746;
  --depth-accent-6: #134155;
  --depth-accent-7: #135069;
  --depth-accent-8: #1c6988;
  --depth-accent-9: #62bee8;
  --depth-accent-10: #7bd0f9;
  --depth-accent-11: #8dc0d9;
  --depth-accent-12: #d0edfc;
  --depth-accent-on-solid: #050f14;
  --depth-error-3: #331a18;
  --depth-error-9: #e1524f;
  --depth-error-11: #f49c95;
  --depth-success-3: #152715;
  --depth-success-9: #5ad664;
  --depth-success-11: #88cb8a;
  --depth-warning-3: #282113;
  --depth-warning-9: #dbb155;
  --depth-warning-11: #cdb482;
  --depth-info-3: #17242d;
  --depth-info-9: #5baee5;
  --depth-info-11: #90bedf;
  --depth-background: var(--depth-neutral-1);
  --depth-surface: var(--depth-neutral-2);
  --depth-surface-hover: var(--depth-neutral-3);
  --depth-surface-active: var(--depth-neutral-4);
  --depth-border-subtle: var(--depth-neutral-6);
  --depth-border: var(--depth-neutral-7);
  --depth-border-strong: var(--depth-neutral-8);
  --depth-text-secondary: var(--depth-neutral-11);
  --depth-text: var(--depth-neutral-12);
  --depth-accent-bg-subtle: var(--depth-accent-3);
  --depth-accent-solid: var(--depth-accent-9);
  --depth-accent-solid-hover: var(--depth-accent-10);
  --depth-accent-text: var(--depth-accent-11);
}
```

**Was aus Lauf 2 benutzt werden darf (und sonst nichts):** `--depth-accent-1` und `--depth-accent-2` als kühler Grund rechts vom Lichtschnitt, `--depth-accent-2` und `--depth-accent-11` als Tönung der Schatten. Blau ist **kein zweiter Akzent**: kein blauer Knopf, kein blauer Text, kein blauer Balken, kein blauer Link. Die übrigen Werte des zweiten Laufs (Neutral-Stufen, Meldefarben, Aliase mit `depth-`) stehen nur da, weil die Ausgabe wörtlich bleibt; sie sind gesperrt.

### Semantische Zuordnung

Diese Schicht steht **nach** den beiden Blöcken und überschreibt die Standard-Aliase von Lauf 1 dort, wo diese DNA es verlangt (warmer statt neutraler Grund, Vollton je Schema). Sie verweist nur auf Stufen von oben; die zwei gerechneten Werte sind gekennzeichnet.

```css
:root {                                       /* Hell */
  --background: var(--accent-2);              /* warmer Grund (links vom Schnitt) */
  --background-deep: var(--depth-accent-2);   /* kühler Grund (rechts vom Schnitt) */
  --glow: var(--accent-3);                    /* Lichtschein oben links */
  --surface: var(--accent-1);                 /* schwebende Fläche: Diagramm, Karte */
  --surface-raised: var(--accent-1);          /* höchste Ebene: Eingabefeld, Menü, Palette (unterscheidet sich durch Rand und Schatten) */
  --surface-hover: var(--accent-3);           /* Zeile unter dem Zeiger, Suchzeile, geöffneter Chat */
  --surface-active: var(--accent-5);          /* gewählter Bereich der Leiste, Chip, Kürzel */
  --surface-voice: var(--accent-4);           /* eigene Nachricht */
  --text: var(--neutral-12);
  --text-secondary: var(--neutral-11);
  --text-on-tint: var(--accent-12);           /* Text auf --surface-active und --surface-voice; auf --surface-active der EINZIGE erlaubte Text */
  --accent-solid: var(--accent-11);           /* Vollton: Senden, Marke, Balken */
  --accent-solid-hover: var(--accent-12);
  --accent-solid-fg: var(--neutral-1);        /* Symbol und Text auf dem Vollton */
  --accent-text: var(--accent-11);
  --accent-bg-subtle: var(--accent-3);
  --focus-ring: var(--accent-11);
  --control-edge: #92877e;                    /* gerechnet, siehe unten */
  --shadow-ink: oklch(from var(--depth-accent-11) l c h / 0.2);
  --status-mark-error: var(--error-11);       /* Symbole und Punkte: in Hell Stufe 11 */
  --status-mark-success: var(--success-11);
  --status-mark-warning: var(--warning-11);
  --status-mark-info: var(--info-11);
}
[data-theme="dark"] {                         /* Dunkel */
  --background: var(--accent-1);
  --background-deep: var(--depth-accent-1);
  --glow: var(--accent-4);
  --surface: var(--accent-2);
  --surface-raised: var(--accent-3);
  --surface-hover: var(--accent-3);
  --surface-active: var(--accent-5);
  --surface-voice: var(--accent-4);
  --accent-solid: var(--accent-9);
  --accent-solid-hover: var(--accent-10);
  --accent-solid-fg: var(--accent-on-solid);
  --control-edge: #7b7169;                    /* gerechnet, siehe unten */
  --shadow-ink: oklch(from var(--depth-accent-2) 0.05 c h / 0.78);
  --status-mark-error: var(--error-9);        /* Symbole und Punkte: in Dunkel Stufe 9 */
  --status-mark-success: var(--success-9);
  --status-mark-warning: var(--warning-9);
  --status-mark-info: var(--info-9);
}
```

**Vollton je Schema.** `palette.mjs` gibt für Stufe 9 in Hell und Dunkel denselben Wert aus (`#e69a58`). Auf hellen Flächen erreicht er nur 2,0 bis 2,3 : 1. Deshalb ist `--accent-solid` in Hell Stufe 11 (ein dunkler Bernstein, mit hellem Symbol) und in Dunkel Stufe 9 (mit dunklem Symbol).

**Verbotene Paare.** Auf `--surface-active` (gewählter Bereich, Chip, Kürzel) steht nur `--text-on-tint`. `--text-secondary` und `--accent-text` sind dort verboten: In Hell erreichen sie nur 4,41 und 4,49 : 1. Auch Symbole auf dieser Fläche nehmen `--text-on-tint`.

**Meldefarben.** `--error-*`, `--success-*`, `--warning-*`, `--info-*` kommen aus Lauf 1, je Stufe 3 (Fläche), 9 (Vollton) und 11 (Text). Regel: Text immer Stufe 11; Symbole und Punkte über `--status-mark-*` (Hell Stufe 11, Dunkel Stufe 9); Fläche Stufe 3. Eine Meldung trägt immer Symbol **und** Wort, nie nur Farbe.

**Rand von Bedienelementen (`--control-edge`).** Die Palette hat keine Stufe, die als Rand eines Eingabefelds 3 : 1 hält (`--border-strong` erreicht 2,0 bis 3,0). Der Wert ist deshalb gerechnet: gleicher Farbton (60,38°) und gleiche Buntheit (0,018) wie die Neutral-Stufen, die Helligkeit so weit verschoben, bis 3 : 1 gegen die Füllung des Feldes **und** gegen jeden Grund daneben hält (Ziel 3,05 als Reserve). Ergebnis: Hell `#92877e` (OKLCH-Helligkeit 0,63), Dunkel `#7b7169` (OKLCH-Helligkeit 0,56). Rechnung: `.design-foundations/previews/_src/build.mjs` (lokal). Benutzt wird er nur für Felder, in die man schreibt oder aus denen man wählt. Schwebende Inhaltsflächen bekommen keinen Rand.

### Kontrast-Bericht

Bericht von `palette.mjs`, wörtlich (beide Läufe, alle Paare bestanden):

```
Lauf 1 (Bernstein 60,38°)
/* Contrast report (WCAG 2.x)
   PASS  [light] neutral-11 on neutral-2: 5.69:1 (target 4.5:1)
   PASS  [light] neutral-12 on neutral-2: 12.92:1 (target 7:1)
   PASS  [light] neutral-12 on neutral-3: 12:1 (target 4.5:1)
   PASS  [light] accent-11 on neutral-2: 5.8:1 (target 4.5:1)
   PASS  [light] accent-11 on accent-2: 5.79:1 (target 4.5:1)
   PASS  [light] accent-on-solid on accent-9: 8.49:1 (target 4.5:1)
   PASS  [dark] neutral-11 on neutral-2: 8.74:1 (target 4.5:1)
   PASS  [dark] neutral-12 on neutral-2: 14.24:1 (target 7:1)
   PASS  [dark] neutral-12 on neutral-3: 12.94:1 (target 4.5:1)
   PASS  [dark] accent-11 on neutral-2: 8.62:1 (target 4.5:1)
   PASS  [dark] accent-11 on accent-2: 8.63:1 (target 4.5:1)
   PASS  [dark] accent-on-solid on accent-9: 8.49:1 (target 4.5:1)
*/

Lauf 2 (Blau 230,34°, --prefix depth)
/* Contrast report (WCAG 2.x)
   PASS  [light] neutral-11 on neutral-2: 5.66:1 (target 4.5:1)
   PASS  [light] neutral-12 on neutral-2: 12.89:1 (target 7:1)
   PASS  [light] neutral-12 on neutral-3: 11.99:1 (target 4.5:1)
   PASS  [light] accent-11 on neutral-2: 5.59:1 (target 4.5:1)
   PASS  [light] accent-11 on accent-2: 5.6:1 (target 4.5:1)
   PASS  [light] accent-on-solid on accent-9: 9.23:1 (target 4.5:1)
   PASS  [dark] neutral-11 on neutral-2: 8.77:1 (target 4.5:1)
   PASS  [dark] neutral-12 on neutral-2: 14.27:1 (target 7:1)
   PASS  [dark] neutral-12 on neutral-3: 12.95:1 (target 4.5:1)
   PASS  [dark] accent-11 on neutral-2: 8.88:1 (target 4.5:1)
   PASS  [dark] accent-11 on accent-2: 8.86:1 (target 4.5:1)
   PASS  [dark] accent-on-solid on accent-9: 9.23:1 (target 4.5:1)
*/
```

Dazu nachgerechnet: **212 Paare der Zuordnung oben, hell und dunkel, alle bestanden.** Text gegen 4,5 : 1, Bedienelemente und Zustandsmarken gegen 3 : 1 (WCAG 2.x). Die Tabelle zeigt je Art den schlechtesten Wert.

| Art | Ziel | Paare | schlechtester Wert Dunkel | schlechtester Wert Hell |
|---|---|---|---|---|
| Text | 4,5 : 1 | 14 | 11,83 (`--text` auf `--glow`) | 12,00 (`--text` auf `--glow`) |
| Nebentext | 4,5 : 1 | 14 | 7,27 (`--text-secondary` auf `--glow`) | 5,28 (`--text-secondary` auf `--glow`) |
| Zustand fertig | 4,5 : 1 | 6 | 7,59 (`--ok-fg` auf `--glow`) | 4,99 (`--ok-fg` auf `--glow`) |
| Quellen-Ziffer | 4,5 : 1 | 6 | 7,17 (`--fn-fg` auf `--glow`) | 5,37 (`--fn-fg` auf `--glow`) |
| Nachricht | 4,5 : 1 | 2 | 11,75 (`--bubble-fg` auf `--bubble-bg`) | 11,02 (`--bubble-fg` auf `--bubble-bg`) |
| Nebentext in Nachricht | 4,5 : 1 | 2 | 7,27 (`--text-secondary` auf `--bubble-bg`) | 4,84 (`--text-secondary` auf `--bubble-bg`) |
| Leiste aktiv | 4,5 : 1 | 2 | 10,50 (`--nav-active-fg` auf `--nav-active-bg`) | 10,04 (`--nav-active-fg` auf `--nav-active-bg`) |
| Chip | 4,5 : 1 | 2 | 10,50 (`--chip-fg` auf `--chip-bg`) | 10,04 (`--chip-fg` auf `--chip-bg`) |
| Kürzel | 4,5 : 1 | 2 | 10,50 (`--kbd-fg` auf `--kbd-bg`) | 10,04 (`--kbd-fg` auf `--kbd-bg`) |
| Senden-Symbol | 4,5 : 1 | 2 | 8,45 (`--send-fg` auf `--send-bg`) | 6,01 (`--send-fg` auf `--send-bg`) |
| Tasten-Symbol auf Eingabefeld | 4,5 : 1 | 2 | 7,98 (`--btn-fg` auf `--input-bg`) | 5,88 (`--btn-fg` auf `--input-bg`) |
| Balken (nicht Text) | 3 : 1 | 8 | 6,32 (`--bar` auf `--glow`) | 5,37 (`--bar` auf `--glow`) |
| Statuspunkt (nicht Text) | 3 : 1 | 6 | 7,78 (`--lamp` auf `--glow`) | 4,99 (`--lamp` auf `--glow`) |
| Fokusring (nicht Text) | 3 : 1 | 8 | 7,17 (`--focus-ring` auf `--glow`) | 5,37 (`--focus-ring` auf `--glow`) |
| Senden-Fläche gegen Eingabefeld (nicht Text, Symbol trägt) | 3 : 1 | 2 | 6,95 (`--send-bg` auf `--input-bg`) | 5,99 (`--send-bg` auf `--input-bg`) |
| Rand Eingabefeld (nicht Text) | 3 : 1 | 8 | 3,05 (`--control-edge` auf `--glow`) | 3,08 (`--control-edge` auf `--glow`) |
| Meldetext | 4,5 : 1 | 48 | 6,95 (`--error-11` auf `--glow`) | 4,99 (`--success-11` auf `--glow`) |
| Melde-Symbol (nicht Text) | 3 : 1 | 40 | 3,82 (`--error-9` auf `--glow`) | 4,99 (`--success-11` auf `--glow`) |
| Akzent als Text | 4,5 : 1 | 10 | 7,17 (`--accent-11` auf `--glow`) | 5,37 (`--accent-11` auf `--glow`) |
| Vollton-Fläche (nicht Text) | 3 : 1 | 10 | 6,32 (`--accent-solid` auf `--glow`) | 5,37 (`--accent-solid` auf `--glow`) |
| Text auf Vollton | 4,5 : 1 | 2 | 8,45 (`--accent-solid-fg` auf `--accent-solid`) | 6,01 (`--accent-solid-fg` auf `--accent-solid`) |
| Text auf getönter Fläche | 4,5 : 1 | 6 | 10,57 (`--text` auf `--accent-5`) | 10,03 (`--text` auf `--accent-5`) |
| Akzent-Text hell auf getönter Fläche | 4,5 : 1 | 6 | 10,50 (`--accent-12` auf `--accent-5`) | 10,04 (`--accent-12` auf `--accent-5`) |
| Nebentext auf getönter Fläche | 4,5 : 1 | 4 | 7,27 (`--text-secondary` auf `--accent-4`) | 4,84 (`--text-secondary` auf `--accent-4`) |

Verbotene Paare (zur Kontrolle mitgerechnet, dürfen nicht benutzt werden):

| Paar | Dunkel | Hell | Ziel |
|---|---|---|---|
| `--text-secondary` auf `--surface-active` | 6,49 | 4,41 | 4,5 : 1 |
| `--accent-text` auf `--surface-active` | 6,40 | 4,49 | 4,5 : 1 |

Die Namen in der Tabelle sind die des Vorschau-Blatts: `--bubble-bg` = `--surface-voice`, `--input-bg` = `--surface-raised`, `--bar` und `--send-bg` = `--accent-solid`, `--send-fg` = `--accent-solid-fg`, `--lamp` = `--status-mark-success`, `--ok-fg` = `--success-11`, `--fn-fg` = `--accent-text`, `--nav-active-bg`, `--chip-bg` und `--kbd-bg` = `--surface-active`, `--btn-fg` = `--text-secondary`. Alle Einzelwerte: `.design-foundations/previews/_src/contrast.json` (lokal).

Nicht gemessen und in Phase 7 auf den fertigen Seiten zu prüfen: Text über dem weichen Rand des Lichtscheins (gemessen ist die hellste Stelle `--glow` und der Grund, dazwischen liegt jede Mischung) und Text auf Flächen mit Schatten darunter.

## Abstände, Form, Tiefe

**Abstände** (4er-Raster):

```css
:root {
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;  --space-8: 64px;
}
```

Eng innerhalb einer Gruppe (4 bis 12 px), weit zwischen Gruppen (24 bis 48 px). Zwischen zwei Nachrichten 24 px, zwischen Absätzen einer Antwort 12 px. Klickflächen mindestens 32 px hoch, Zeilen der Leiste 38 px.

**Radien:**

```css
:root {
  --radius-sm: 8px;    /* Kürzel, kleine Marken */
  --radius-md: 12px;   /* Zeilen der Leiste, Suchzeile, Knöpfe mit Text */
  --radius-lg: 18px;   /* schwebende Flächen: Diagramm, Karte, Menü */
  --radius-xl: 22px;   /* Eingabefeld, Palette, Dialog */
  --radius-full: 999px; /* Chips, runde Knöpfe (Senden, Büroklammer, Plus) */
}
```

Die eigene Nachricht hat `20px 20px 6px 20px` (die kleine Ecke zeigt zum Eingabefeld). Verschachtelt gilt: innerer Radius = äußerer Radius minus Abstand zum Rand, mindestens 4 px.

**Tiefe.** Es gibt keine Rahmen. Eine Ebene entsteht aus einer Tonstufe und, ab Ebene 2, einem weichen Schatten in `--shadow-ink` (blau getönt, nie reines Schwarz). Höher heißt in Dunkel heller, in Hell weißer.

| Ebene | Was | Fläche | Schatten |
|---|---|---|---|
| 0 | Grund des Fensters, Seitenleiste, Titelleiste, Lesespalte | `--background` / `--background-deep` | keiner |
| 1 | ruhende Hervorhebung: Zeile unter dem Zeiger, Suchzeile, geöffneter Chat, gewählter Bereich | `--surface-hover`, `--surface-active` | keiner |
| 2 | schwebender Inhalt: Diagramm, Karte, eigene Nachricht | `--surface`, `--surface-voice` | `--shadow-2` |
| 3 | Eingabefeld (die höchste Fläche der Seite) | `--surface-raised` plus Rand `--control-edge` | `--shadow-3` |
| 4 | Überlagerungen: „+“-Menü, Palette, Dialog, Tooltip | `--surface-raised` | `--shadow-4` |

```css
:root {
  --shadow-2: 0 12px 30px -14px var(--shadow-ink);
  --shadow-3: 0 30px 60px -22px var(--shadow-ink), 0 4px 12px -4px var(--shadow-ink);
  --shadow-4: 0 40px 90px -24px var(--shadow-ink), 0 8px 20px -6px var(--shadow-ink);
}
```

**Hauptfläche und Eingabefeld haben unterschiedliche Tiefe** (Auftrag aus der Mock-Prüfung): Der Inhalt liegt auf Ebene 0, das Eingabefeld auf Ebene 3, mit eigener Tonstufe, der einzigen Kante und dem größten Schatten der Seite.

**Versatz bei schmalem Fenster** (Entscheidung des Nutzers, 2026-11-20; die gesperrten Maße 36 px und 24 px bleiben die Obergrenze). Der Versatz der schwebenden Flächen ist begrenzt auf den freien Rand neben der Lesespalte minus 12 px:

```text
Spaltenbreite  = min(800 px, Inhaltsbreite − 48 px)
freier Rand    = max(0, (Inhaltsbreite − Spaltenbreite) / 2 − 12 px)
Nachricht, Diagramm = min(36 px, freier Rand)
Eingabefeld         = min(24 px, freier Rand)
```

Bei 900 px Fenster (eingeklappte Leiste: Inhalt 824 px, Spalte 776 px, freier Rand 12 px) ragen alle Flächen **12 px**. Die vollen 36 px gelten ab 896 px Inhaltsbreite (Fenster ab 972 px), das Eingabefeld hat die vollen 24 px ab 872 px. Der Versatz bleibt damit immer im sichtbaren Inhalt: Nichts wird abgeschnitten, und es entsteht kein waagerechtes Scrollen. Die Regel gilt nur dort, wo es einen Versatz gibt (Chat, Startseite).

**Keine Fläche in einer Fläche.** Weil es keine Hauptfläche gibt, liegt ein Diagramm nie in einem zweiten Kasten. Auf einer schwebenden Fläche liegt keine weitere schwebende Fläche; Gliederung darin läuft über Abstand und Schrift.

## Bewegung

- **Zeiten:** klein 140 ms (Druck, Zeiger, Haken) · normal 320 ms (Menü, Seitenpanel, Seitenwechsel) · groß 480 ms (Palette, Dialog, erste Ansicht der Startseite, gestaffelt).
- **Kurven:** Erscheinen `cubic-bezier(0.16, 1, 0.3, 1)` · Verschwinden `cubic-bezier(0.7, 0, 0.84, 0)` · Umschalten und Verschieben `cubic-bezier(0.65, 0, 0.35, 1)`. Nichts federt, nichts schwingt über.

```css
:root {
  --duration-micro: 140ms; --duration-standard: 320ms; --duration-large: 480ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

- **Erlaubt** (jede Bewegung sagt, was sich geändert hat): Schwebende Flächen erscheinen mit Deckkraft und 8 px Weg aus ihrer Richtung (Menüs von unten am Eingabefeld, Panel von rechts) und verschwinden auf demselben Weg zurück. Seiten blenden über. Text einer Antwort erscheint fließend. Knöpfe geben beim Drücken um 3 % nach. Balken wachsen einmal von null auf ihren Wert. Listen staffeln beim ersten Erscheinen mit 50 ms je Zeile, höchstens acht Zeilen.
- **Nie:** Der Lichtschnitt und der Lichtschein bewegen sich nicht. Nichts pulsiert, blinkt oder läuft in Schleife, außer der Anzeige „arbeitet“ einer laufenden Antwort. Keine Bewegung beim Scrollen. Bewegt werden nur `transform` und `opacity`, nie Breite, Höhe oder Abstände.
- **`prefers-reduced-motion: reduce`:** Alle Wege und Größenänderungen entfallen, Zustände wechseln sofort. Erlaubt bleibt eine reine Überblendung der Deckkraft von höchstens 100 ms (`transition: opacity 100ms linear`). Staffelung und wachsende Balken entfallen (die Balken stehen sofort auf ihrem Wert). Die Anzeige „arbeitet“ wird zu einem stehenden Symbol mit Wort. Umsetzung: eine globale Regel, die `animation-duration` auf 0,01 ms setzt und Übergänge auf `opacity` mit 100 ms beschränkt.

## Nie (die Klischees, die dieser DNA am nächsten liegen)

- **Kein Rahmen und kein Kasten um Inhalt.** Keine Trennlinien zwischen Zeilen, keine Tabellen-Gitter. Die einzige Kante ist `--control-edge` an Eingabefeldern. („Kästen und Linien“ war die Hauptbeschwerde.)
- **Keine Fläche in einer Fläche.** Das ist das Muster, zu dem KI-Entwürfe von selbst neigen.
- **Kein Grau neben Orange ohne Übergang.** Der Vollton steht immer auf einer warm getönten Fläche, nie auf den Neutral-Stufen 1 bis 4 als Grund. Das ist der Abstand zur abgelehnten „Werkbank“.
- **Der Vollton bleibt selten:** Senden, Marke, Balken, hochgestellte Ziffern, Fokus. Nicht für Überschriften, nicht für ganze Flächen, nicht für Text in Sätzen.
- **Blau ist kein Akzent.** Nur Grund rechts vom Schnitt und Tönung der Schatten.
- **Kein zweiter Verlauf, kein Leuchten.** Der Lichtschein oben links ist der einzige. Kein Schein um Knöpfe, keine Verlaufs-Schrift, keine Glas-Unschärfe.
- **Keine zweite Schräge.**
- **Keine Mono-Schrift als Stilmittel.** `--font-mono` steht nur für Code und Programm-Ausgaben (Rückfrage-Karte, Code-Dateiansicht, Vorher/Nachher, Meldungen eines MCP-Servers), sonst nirgends; alles andere ist Inter. Dazu: keine Großbuchstaben mit Sperrung als Beschriftung, keine Schrift unter 12 px.
- **Kein reines Schwarz und kein reines Weiß**, auch nicht in Schatten.
- **Kein Versatz auf Listen- und Formularseiten.**
- **Keine Bewegung, die nichts mitteilt**; kein Federn.
- **Keine Farbe als einziger Träger** einer Meldung oder eines Zustands.

## Stimme

**Stand Phase 5.** Die Wörter sind Teil der Oberfläche, nicht Beschriftung obendrauf (Metts/Welfle, *Writing Is Designing*). Die **Stimme** bleibt überall gleich, der **Ton** wechselt mit dem Moment (Podmajersky, *Strategic Writing for UX*). Deutsch (du-Form) und Englisch sind gleichwertig; das Englische ist keine Wort-für-Wort-Übersetzung, sondern dieselbe Stimme. Die Texte selbst, die Begriffstabelle (ein Wort je Sache und Sprache) und die Längengrenzen stehen in `JOURNEY.md` §Page specs, Abschnitt „Texte: Begriffe, Muster und Regeln“ und je Fläche unter „Texte (Phase 5)“. Änderungen an Wörtern beginnen dort, danach folgt der Code (wie bei Tokens).

### Fünf Eigenschaften

Alle konkret, keine Wohlfühlwörter. Jede hat ein Beispiel, das passt, und eines, das nicht passt.

| Eigenschaft | Das heißt | Passt (Deutsch · Englisch) | Passt nicht (Deutsch · Englisch) |
|---|---|---|---|
| **Ruhig** | Sagt, was ist, ohne Alarm. Kein Ausrufezeichen, kein Witz, kein „Oops“. Besonders bei Fehlern (Yifrah: Fehlertexte sind der Ort für Genauigkeit, nicht für Persönlichkeit). | „Ollama ist nicht erreichbar. Starte Ollama, dann geht es hier von selbst weiter.“ · “Ollama is not reachable. Start Ollama and this picks up on its own.” | „Achtung! Die Verbindung ist weg!“ · “Oops! Something went wrong!” |
| **Direkt** | Das Wichtigste zuerst, ein Satz eine Sache. Ein Knopf nennt die Tat: Verb und Objekt (Yifrah, Redish: vorn die Hauptsache). | „Modell herunterladen“ · “Download a model” | „Hier klicken, um ein neues Modell zu erhalten“ · “Click here to get a new model” |
| **Genau** | Nennt Namen, Zahl, Ort und Ursache. Was nur geschätzt ist, heißt „geschätzt“. Sagt, was sicher ist („Dein Text bleibt im Feld.“). | „Geschätzt: 6.200 von 8.192 Tokens“ · “Estimated: 6,200 of 8,192 tokens” | „Alles im grünen Bereich“ · “Everything looks great” |
| **Schlicht** | Einfache Wörter, kurze Sätze, ein Wort je Sache (Begriffstabelle). Ein Fachwort nur, wenn der Nutzer es auf dem Bildschirm sieht (Redish: einfache Sprache ist schneller zu befolgen). | „Der Grafikspeicher ist voll. Ein Teil des Modells läuft auf dem Prozessor.“ · “Graphics memory is full. Part of the model runs on the processor.” | „Die Allokation überschreitet das Limit; Offloading aktiv.“ · “Allocation exceeds the limit; offloading active.” |
| **Auf Augenhöhe** | Du-Form, kein Vorwurf, keine Anbiederung, keine Werbung. LocalDesk spricht wie ein Kollege am Nachbarplatz, nicht wie ein Verkäufer und nicht wie ein Lehrer. | „Hier bündelst du Chats mit eigenen Anweisungen und Dokumenten.“ · “Group chats here, with their own instructions and documents.” | „Super, leg jetzt los und entdecke die Möglichkeiten!“ · “Awesome, start now and unlock the possibilities!” (Werbung); „Du hast vergessen, ein Modell zu installieren.“ · “You forgot to install a model.” (Vorwurf) |

### Ton je Moment

Die Stimme bleibt, der Ton passt sich dem Moment an.

| Moment | Ton | Muster | Beispiel (Deutsch · Englisch) |
|---|---|---|---|
| **Ankommen** (Startseite) | ruhig, kurz, selbstverständlich | eine Zeile, die zeigt, dass alles hier läuft | „Alles läuft auf diesem PC.“ · “Everything runs on this PC.” |
| **Leer** | einladend, sachlich | ein Satz, was hierher gehört, und genau eine Aktion (Redish) | „Hier bündelst du Chats mit eigenen Anweisungen und Dokumenten. [Neues Projekt]“ · “Group chats here, with their own instructions and documents. [New project]” |
| **Arbeiten** | knapp, Zustand in Worten | Wort plus laufender Vorgang, kein Prozent ohne Zahl | „Wird gelesen …“ · “Reading …” |
| **Rückfrage vor Folgenreichem** | ernst, genau | erst die Folge, dann die Wahl; der Knopf nennt die Tat, nie „Ja“ (Yifrah) | „Dieses Tool kann Dateien überschreiben.“ → [Einmal erlauben] [Ablehnen] · “This tool can overwrite files.” → [Allow once] [Deny] |
| **Fehler** | ruhig, präzise, ohne Persönlichkeit | was passiert ist, warum, was tun; zuerst das Sichere (Yifrah; Nielsen 9) | „Die Antwort ist abgebrochen: Verbindung getrennt. Dein Text bleibt im Feld. Versuche es mit „Antwort wiederholen“ noch einmal.“ · “The answer stopped: connection lost. Your text stays in the field. Try “Regenerate response”.” |
| **Erfolg** | knapp, ohne Feier | benennt das Ergebnis, nicht das Gefühl | „1 Änderung übernommen.“ · “1 change applied.” |

### Schreibweise

- **Du-Form**, nie „Sie“. Nie „wir“ für LocalDesk; die App gehört dem Nutzer, sie spricht von sich in der dritten Person („LocalDesk legt nur Abschnitte an“) oder gar nicht.
- **Keine Ausrufezeichen. Keine Werbewörter** (super, toll, leistungsstark, nahtlos, einfach, kostenlos; powerful, seamless, simply, effortless, awesome, free). Kein „Oops“, kein „Leider“; „bitte“ nur, wenn die Bitte den Nutzer Mühe kostet.
- **Beschriftungen, Knöpfe, Tooltips, Platzhalter und Überschriften ohne Schlusspunkt.** Hinweise, leere Zustände und Fehler sind Sätze mit Punkt.
- **Platzhalter ohne „…“** („Nachricht schreiben“, „Chats durchsuchen“): Sie nennen die Aufgabe oder zeigen ein Format. „…“ steht nur für laufende Vorgänge („Wird gelesen …“) und Befehle, die weitere Eingabe öffnen („Verschieben nach …“), immer mit Leerzeichen davor.
- **Schreibweisen:** deutsche Anführungszeichen „ “, englische “ ”; Kürzel „Strg+K“ und “Ctrl+K”; Trenner „·“; Weg in den Einstellungen „Einstellungen → Ollama-Server“; Dezimalkomma im Deutschen („9,3 GB“), Punkt im Englischen; Tausender „6.200“ und „6,200“; Zahl und Einheit mit geschütztem Leerzeichen. Zahlen, die sich ändern oder untereinander stehen, setzt die Schrift mit Tabellenziffern (siehe „Schrift“).
- **Fehler:** was passiert ist, warum, was tun. Der Grund der App steht als schlichter Satz im Text, nie als Rohtext der Meldung (der steht nur hinter „Details“). Es steht dabei, was sicher ist; Vermutetes heißt „womöglich“.
- **Länge vor Schönheit:** In der Seitenleiste (272 px) wird gekürzt statt umgebrochen, und Englisch ist oft länger. Deshalb gilt die gemessene Breite in Inter 14 px, Gewicht 500: Leistentext höchstens 200 px, Kachel-Titel höchstens 153 px, Nebenzeile im „+“-Menü höchstens 238 px bei 12 px. Gemessen in der Schrift der App; die Messdaten liegen lokal in `.design-foundations/build/phase-5-messung.json`.

## Tokens

**Stand Phase 4, bestätigt vom Nutzer am 2026-11-15.** Dieser Abschnitt und „Components“ **erweitern** die gesperrten Werte oben; sie ändern keinen. Globale Werte ändert nur ein neuer Lauf von `palette.mjs` (und eine neue Sperre). Eigentümer des Systems ist der Nutzer: Jede Änderung beginnt in dieser Datei, danach folgt der Code.

### Entscheidungen des Nutzers (2026-11-15)

1. **Kante erweitern: „Ja, erweitern“.** `--control-edge` (Wert unverändert) zeichnet zusätzlich zu Feldern und Auswahl die Spur des ausgeschalteten Schalters und die Unterkante der Palettenzeile. Das ist eine Ausweitung der Verwendung, kein neuer Wert.
2. **Laden: „Ja, ohne Bewegung“.** Außerhalb einer laufenden Antwort ist „Lädt“ statisch (Symbol, Wort, `aria-busy`). Die einzige Dauerbewegung bleibt die Anzeige „arbeitet“ in laufender Antwort und Werkzeug-Zeile.
3. **Titelleiste: „Ja, nur leiser Name“.** Offene Frage 1 ist damit geschlossen: In der Titelleiste steht nur der leise Name, die farbige Marke steht im Kopf der Leiste.
4. **Bausteine: „Ja, bestätigen“.** §Tokens und §Components sind bestätigt.

### Drei Stufen

| Stufe | Frage, die sie beantwortet | Beispiel | Wer darf sie ändern |
|---|---|---|---|
| 1 Global | Welche Werte gibt es? | `--accent-9`, `--neutral-12`, `--space-4`, `--radius-lg` | nur ein neuer `palette.mjs`-Lauf (Farbe) oder eine Änderung der Skalen oben |
| 2 Alias | Welche Aufgabe hat ein Wert? | `--surface-raised`, `--text-secondary`, `--status-error-fg` | diese Datei, mit Begründung |
| 3 Baustein | Was nimmt dieser eine Baustein? | `--btn-primary-bg`, `--menu-row-h` | diese Datei; verweist **nur** auf Alias-Tokens und Skalen, nie auf Palettenstufen oder Farbwerte |

Regel der Namen (Entsprechung zum W3C-DTCG-Pfad `component.part.property.state`): `--<baustein>-<teil>-<eigenschaft>[-<zustand>]`, Zustand = `hover`, `pressed`, `disabled`, `open`. Ein Wert, der sich im Zustand nicht ändert, bekommt kein Zustands-Token.

### Alias-Stufe: Ergänzungen

Die Zuordnung oben (Hintergründe, Flächen, Text, Vollton, Fokus, Kante, Schatten, Zustandsmarken) bleibt wörtlich bestehen. Dazu kommen nur Aliase auf **bestehende Palettenstufen**; kein neuer Farbwert.

```css
:root {
  --surface-hover-strong: var(--accent-4);     /* Zeile unter dem Zeiger auf Ebene 3 und 4; in Dunkel ist --surface-raised gleich --surface-hover */
  --surface-active-hover: var(--accent-6);     /* Chip, gewählte Zeile unter dem Zeiger; nur --text-on-tint darauf */
  --surface-active-pressed: var(--accent-7);   /* gedrückt; nur --text-on-tint darauf */
  --status-error-bg: var(--error-3);
  --status-error-fg: var(--error-11);          /* Text und Kante */
  --status-error-solid: var(--error-9);        /* Vollton: nur Schließen-Knopf und Gefährlich im Zustand Maus drüber */
  --status-success-bg: var(--success-3);
  --status-success-fg: var(--success-11);
  --status-success-solid: var(--success-9);
  --status-warning-bg: var(--warning-3);
  --status-warning-fg: var(--warning-11);
  --status-warning-solid: var(--warning-9);
  --status-info-bg: var(--info-3);
  --status-info-fg: var(--info-11);
  --status-info-solid: var(--info-9);
  --status-solid-fg: var(--accent-on-solid);   /* Symbol und Text auf einem --status-*-solid */
  --scrim: oklch(from var(--shadow-ink) l c h / 0.45);   /* Vorhang hinter Dialog und Palette */
  --ctx-hover-fill: var(--surface-hover);      /* Zeigerfläche, vom Baustein-Kontext gesetzt */
  --ctx-pressed-fill: var(--surface-active);
  --focus-outline: 2px solid var(--focus-ring);
  --focus-ring-solid: var(--text);             /* Ring um Elemente mit Vollton-Fläche: dunkel in Hell, hell in Dunkel, nie gleich dem Vollton */
  --focus-outline-solid: 2px solid var(--focus-ring-solid);
  --focus-inset: inset 0 0 0 2px var(--focus-ring);
  --font-sans: "Inter Variable", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
  --font-mono: "Cascadia Mono", Consolas, ui-monospace, monospace;   /* nur Code und Programm-Ausgaben, siehe „Schrift“ */
}
[data-theme="dark"] {
  --scrim: oklch(from var(--shadow-ink) l c h / 0.62);
}
```

**Kontext-Aliase.** Eine Fläche der Ebenen 3 und 4 (Eingabefeld, Menü, Palette, Dialog, Tooltip) setzt `--ctx-hover-fill: var(--surface-hover-strong)` für alles, was in ihr liegt. Alle anderen Flächen behalten den Standard. Dadurch hat jeder Baustein ein einziges Token für „Zeigerfläche“ und ist trotzdem auf jeder Ebene sichtbar.

**Maße, Ringe, Z-Ordnung** (Alias-Stufe, in jedem Schema gleich):

```css
:root {
  --measure: 58ch;        /* Lesespalte (Schrift-Abschnitt, hier als Token geführt) */
  --hit-min: 32px;        /* kleinste Klickfläche überhaupt */
  --control-h: 36px;      /* Knopf, Feld, Auswahl, Menüzeile (einzeilig), Werkzeug-Zeile */
  --control-h-lg: 44px;   /* Palettenzeile, Tabellenzeile */
  --row-h: 38px;          /* Zeile der Leiste */
  --titlebar-h: 40px;
  --icon-s: 16px;
  --icon-m: 20px;
  --edge-width: 1px;      /* nur mit --control-edge */
  --ring-width: 2px;
  --ring-offset: 2px;
  --disabled-opacity: 0.45;
  --press-scale: 0.97;    /* Knöpfe geben um 3 % nach */
  --z-content: 0;
  --z-sticky: 10;         /* Titelleiste, Seitenkopf */
  --z-panel: 20;          /* Seitenpanel als Überlagerung */
  --z-menu: 30;           /* Menü, Auswahl-Liste */
  --z-scrim: 40;
  --z-dialog: 50;         /* Dialog, Palette */
  --z-tooltip: 60;
}
```

### Skalen

Alle vier Skalen sind in den gesperrten Abschnitten definiert; hier der Überblick mit dem, was die Bausteine daraus nehmen.

| Skala | Werte | Wo definiert | Regel für Bausteine |
|---|---|---|---|
| Abstände | `--space-1` bis `--space-8` (4, 8, 12, 16, 24, 32, 48, 64 px) | „Abstände, Form, Tiefe“ | Innen eng (4 bis 12), zwischen Gruppen weit (24 bis 48). Kein Abstand außerhalb der Skala. |
| Radien | `--radius-sm` 8, `-md` 12, `-lg` 18, `-xl` 22, `-full` | ebenda | Zeile und Knopf `md`, schwebende Fläche und Menü `lg`, Eingabefeld, Palette, Dialog `xl`, Chip und runde Knöpfe `full` |
| Schatten | `--shadow-2`, `--shadow-3`, `--shadow-4` (Tinte `--shadow-ink`) | ebenda | Kein Schatten unter Ebene 2. Kein Schatten in anderer Farbe als `--shadow-ink`. |
| Ebenen | 0 Grund, 1 ruhige Hervorhebung, 2 schwebender Inhalt, 3 Eingabefeld, 4 Überlagerung | ebenda | Tabelle unten ordnet jeden Baustein zu |
| Stapel (Z) | `--z-content` bis `--z-tooltip` | oben | Ein Tooltip liegt über einem Dialog, ein Dialog über seinem Vorhang, das Menü über dem Inhalt |

**Verschachtelte Radien.** Liegt eine Fläche mit Abstand `d` zum Rand einer äußeren Fläche mit Radius `R` und folgt deren Ecke, gilt: innerer Radius = `max(4px, R − d)`, im Code `max(4px, calc(var(--radius-xx) - var(--space-x)))`. Beispiele: Menüzeile in Menü `lg` 18 mit 8 px Rand = 10 px; Palettenzeile in Palette `xl` 22 mit 8 px Rand = 14 px; Knopf im Eingabefeld (nur Pillen, siehe unten). Ist `d ≥ R` (Knopf in einem Dialog mit 24 px Rand), ist die Ecke weit weg, und der innere Baustein nimmt seinen eigenen Radius aus der Skala. **Ausgenommen:** Pillen und Kreise (`--radius-full`: Chip, Senden, Büroklammer, Plus). Sie sind rund, egal wo sie liegen.

**Ebene je Baustein.**

| Ebene | Bausteine |
|---|---|
| 0 | Titelleiste, Leisten-Zeile (Ruhe), Tabellen-Zeile (Ruhe), Nachricht der Antwort, Werkzeug-Zeile (Ruhe) |
| 1 | Zeile unter dem Zeiger, gewählte Zeile, Chip, Kürzel, Banner, Fortschritts-Spur |
| 2 | Karte, Rückfrage-Karte, eigene Nachricht |
| 3 | Eingabefeld (Chat), Auswahl-Feld |
| 4 | Menü, Palette, Dialog, Tooltip |

**Klarstellung zu „Keine Fläche in einer Fläche“.** Gemeint sind schwebende Flächen (Ebene 2 und höher). Marken der Ebene 1 ohne Schatten (Chip, Kürzel, gewählte Zeile) dürfen auf jeder Ebene liegen. Zwei Flächen ab Ebene 2 liegen nie ineinander; Gliederung innerhalb läuft über Abstand und Schrift.

**Regel der Träger** (Antwort auf den Befund „helle schwebende Flächen trennen sich nur durch Schatten vom Grund, 1,04 : 1“). Eine Fläche muss nicht 3 : 1 gegen den Grund halten. Jedes Bedienelement hat aber einen **Träger**, der es kennzeichnet und gegen seinen Hintergrund hält: Text ≥ 4,5 : 1; Symbol, Spur, Kante oder Daumen ≥ 3 : 1. Wo ein Element keinen Text trägt (Icon-Knopf, Schalter, Feld), steht der Träger in der Spec. Karten ohne Text-Träger gibt es nicht.

**Regeln für Kante, Vollton und Tönung (aus den gesperrten Abschnitten, hier auf Bausteine angewandt).**

1. `--control-edge` liegt nur auf `--surface-raised`, `--surface`, `--background`, `--background-deep`, `--glow` und `--surface-hover`; **nie auf `--surface-active` oder dessen Stufen** (Hell nur 2,57 : 1). Verwendet wird er für Felder, Auswahl-Felder, die Spur eines ausgeschalteten Schalters und die Unterkante der Palettenzeile (sie ist die Kante des Feldes).
2. Auf `--surface-active`, `--surface-active-hover` und `--surface-active-pressed` steht nur `--text-on-tint`, für Text und Symbole. Dort gelten keine `--text-secondary`, `--accent-text`, `--status-mark-*`. Zustände zeigen dort Form und Wort.
3. Der Vollton (`--accent-solid`) trägt nie einen Ring auf sich selbst. Der Ring steht außen (siehe „Fokusring“).

### Fokusring

```css
:focus-visible { outline: var(--focus-outline); outline-offset: var(--ring-offset); }
.is-inset:focus-visible { outline: none; box-shadow: var(--focus-inset); }   /* Zeilen in Listen und Menüs */
@media (forced-colors: active) { :focus-visible { outline: 2px solid Highlight; } }
```

- **Außen (Standard)** für alles, was frei steht: Knopf, Feld, Chip, Karte, Schalter. Die 2 px Lücke zeigt den Grund hinter dem Baustein; der Ring wird gegen **diesen** Grund gemessen. Das löst die Akzentfläche: Der Ring auf dem Senden-Knopf (Vollton) liegt nie auf dem Vollton.
- **Innen (`--focus-inset`)** für Zeilen, die ihren Platz ausfüllen (Leiste, Menü, Palette, Tabelle, Werkzeug-Zeile) und beim Beschneiden durch einen scrollenden Elternteil. Der Ring liegt auf der Zeilenfläche (Ruhe: Grund; gewählt: `--surface-active`).
- **Vollton-Flächen** (Primär-Knopf, Senden, eingeschalteter Schalter, Gefährlich unter dem Zeiger) tragen `--focus-outline-solid` statt `--focus-outline`. In Hell sind `--focus-ring` und `--accent-solid` dieselbe Stufe (`accent-11`); der Ring wäre sonst von der Füllung nicht zu unterscheiden. `--focus-ring-solid` ist `--text` (`neutral-12`): fast schwarz in Hell, hell in Dunkel, in beiden Schemata klar vom Bernstein verschieden. Er hält ≥ 3 : 1 gegen jeden Grund hinter der Lücke (Tabelle unten). Gegen die Füllung selbst sind 3 : 1 mit Palettenstufen nicht erreichbar (Hell nur bei fast Schwarz, Dunkel nie: ein Ton, der gegen den dunklen Grund und den hellen Bernstein zugleich 3 : 1 hält, existiert nicht). Das ist unschädlich, weil der Ring nie an der Füllung anliegt: Die 2 px Lücke zeigt den Grund. Der gesperrte Wert `--focus-ring` bleibt unverändert.
- **Innen-Ringe liegen nie auf Vollton-Flächen** (`--accent-solid`, `--status-*-solid`), mit **genau einer Ausnahme:** dem Schließen-Knopf der Titelleiste im Zustand Maus drüber oder Gedrückt. Er sitzt am Fensterrand, außen ist kein Platz. Dort nimmt der Innen-Ring die **Symbolfarbe der Fläche** (`--titlebar-close-ring-hover`, `--titlebar-close-ring-pressed`); sie hält ≥ 4,5 : 1. Jeder andere Baustein auf Vollton nimmt den Außenring.
- Nur `:focus-visible`: Mausklicks zeigen keinen Ring. `outline: none` ohne Ersatz kommt nirgends vor.
- Der Ring ist in jedem Zustand gleich dick und gleich gefärbt. Er ist das einzige Zeichen für Tastatur-Fokus; Zustandsfarben verdecken ihn nie.

Messwerte: Abschnitt „Kontrast der Bausteine“ unten, Ring gegen jede Fläche, hell und dunkel.

### Abbildungstabelle: heutige `--ld-*`-Tokens → Alias

Quelle: `src/renderer/index.css`. „1:1“ heißt: im Code durch den neuen Namen ersetzen, sonst nichts. „Neu denken“ heißt: Das alte Token wurde anders benutzt, als es die neue DNA erlaubt; die Spalte „Statt dessen“ sagt, was an die Stelle tritt.

| Heutiges Token | Heute | Neuer Alias | Art | Hinweis für den Umbau |
|---|---|---|---|---|
| `--ld-bg` | Grund, Eingabefelder, Code | `--background` (Grund) | 1:1 für den Grund | Eingabefelder → `--field-bg` (= `--surface-raised`); Code-Blöcke → `--surface-hover` |
| `--ld-surface` | Inhalt, Karten, Listen | `--surface` (Karte) | 1:1 für Karten | Es gibt keine Inhaltsfläche mehr: Listen und Inhalt liegen auf `--background` |
| `--ld-surface-2` | zweite Ebene: Gedanken, Quellen, Kästen in Karten | `--surface-hover` (nur auf dem Grund) | Neu denken | Kasten in Karte entfällt (Abstand und Schrift); Quellen werden Fußnoten ohne Fläche |
| `--ld-surface-hover` | Zeile unter dem Zeiger | `--ctx-hover-fill` | 1:1 | wird je Ebene `--surface-hover` oder `--surface-hover-strong` |
| `--ld-sidebar` | Leiste links | `--background` | Neu denken | Die Leiste hat keine eigene Fläche; sie teilt den durchgehenden Grund mit dem Lichtschnitt |
| `--ld-border` | Rahmen, Trenner, Feldkante | `--control-edge` nur an Feldern | Neu denken | Alle anderen Rahmen und Trenner entfallen; Gliederung über Abstand |
| `--ld-text` | Text | `--text` | 1:1 | |
| `--ld-muted` | Nebentext | `--text-secondary` | 1:1 | auf `--surface-active` verboten |
| `--ld-subtle` | ganz leise | `--text-secondary` | Zusammenlegen | Keine Palettenstufe unterhalb von `--text-secondary` hält 4,5 : 1; eine dritte Textstufe gibt es nicht |
| `--ld-accent` | Akzent, Fläche | `--accent-solid` (Schrift darauf: `--accent-solid-fg`) | 1:1 | Vollton bleibt selten (Senden, Marke, Balken) |
| `--ld-accent-soft` | getönte Fläche | `--accent-bg-subtle` | 1:1 | gewählter Bereich und Chip nehmen `--surface-active` statt dessen |
| `--ld-accent-text` | Akzent als Schrift | `--accent-text` | 1:1 | |
| `--ld-bubble` | eigene Nachricht | `--surface-voice` | 1:1 | Text `--text` |
| `--ld-ok` | gut | `--status-success-fg` (Text), `--status-mark-success` (Symbol) | Teilen | immer mit Wort |
| `--ld-warn` | Warnung | `--status-warning-fg`, `--status-mark-warning` | Teilen | immer mit Wort |
| `--ld-error` | Fehler | `--status-error-fg`, `--status-mark-error` | Teilen | immer mit Wort |
| `--ld-shadow` | Schatten der Karte | `--shadow-2` (Karte), `--shadow-3` (Eingabefeld), `--shadow-4` (Überlagerung) | Teilen | nach Ebene wählen |

**Namen aus `@theme inline` (Tailwind).**

| Heute | Neu | Heute | Neu |
|---|---|---|---|
| `--color-bg` | `--background` | `--color-accent-soft` | `--accent-bg-subtle` |
| `--color-surface` | `--surface` | `--color-accent-text` | `--accent-text` |
| `--color-surface-2` | `--surface-hover` (siehe oben) | `--color-bubble` | `--surface-voice` |
| `--color-surface-hover` | `--ctx-hover-fill` | `--color-ok` / `-warn` / `-error` | `--status-success-fg` / `-warning-fg` / `-error-fg` |
| `--color-sidebar` | `--background` | `--shadow-card` | `--shadow-2` |
| `--color-border` | `--control-edge` (nur Felder) | `--font-sans` / `--font-mono` | `--font-sans` / `--font-mono` (Alias oben) |
| `--color-text` / `-muted` / `-subtle` | `--text` / `--text-secondary` / `--text-secondary` | `--radius-sm` … `--radius-2xl` | siehe unten |
| `--color-accent` | `--accent-solid` | | |

**Radien.** Heute `sm` 8, `md` 10, `lg` 12, `xl` 16, `2xl` 20 px. Neu `--radius-sm` 8 (gleich), `--radius-md` 12 (statt 10), `--radius-lg` 18 (statt 12), `--radius-xl` 22 (statt 16), `--radius-full`. `--radius-2xl` entfällt (20 px kommt nur in der eigenen Nachricht vor, siehe Baustein Nachricht). Die Regel `.rounded { border-radius: var(--radius-sm); }` entfällt mit dem Wechsel auf die neue Skala.

**Übrige Regeln aus `index.css`.**

| Heute | Neu |
|---|---|
| `body { font-size: 14px; line-height: 1.55 }` | `font-size: var(--text-base)` (16 px), `line-height: var(--leading-body)` (1,6) |
| `body { background: var(--ld-bg) }` | Grund mit Lichtschnitt (CSS in „Signatur“) |
| `:focus-visible { outline: 2px solid var(--ld-accent); outline-offset: 2px }` | `var(--focus-outline)`, Innenform `--focus-inset` (Abschnitt „Fokusring“) |
| `@media (prefers-color-scheme: dark)` | `[data-theme="dark"]` am Wurzelelement; der Umbau setzt das Attribut aus `nativeTheme.shouldUseDarkColors` |
| `@media (prefers-reduced-motion: reduce)` mit `0s` | Regel aus „Bewegung“ (Überblendung 100 ms statt 0 s; Dauer-Drehungen entfallen außer dem Wort-Symbol) |
| `scrollbar-color: var(--ld-border) transparent` | `--control-edge` für den Daumen auf `--background`, Spur transparent |

**Vollständigkeit.** Alle 17 `--ld-*`-Werte aus `index.css` stehen in der ersten Tabelle; alle 19 Namen aus `@theme inline` in der zweiten; alle übrigen Regeln in der dritten. Jeder neue Alias löst über eine Kette von `var()` auf eine Palettenstufe auf (geprüft, siehe unten).

## Components

24 Bausteine (18 Grundbausteine und sechs Nachträge vom 2026-11-20: Kontrollkästchen, Listenzeile, Reiter, Regler, Popover, Status-Popup). Jeder hat: Aufgabe, Token-Block (nur Alias-Stufe und Skalen), eine Zustandstabelle mit den sechs Zuständen (**normal, Maus drüber, gedrückt, Tastatur-Fokus, gesperrt, lädt**) und die Bedienung für Hilfstechnik. Fehlt ein Zustand, steht „trifft nicht zu“ mit Grund.

**Für alle Bausteine.**

- Der **Tastatur-Fokus** ist überall der Ring aus „Fokusring“ (außen oder innen, je Baustein genannt). Er verschwindet in keinem Zustand.
- **Gesperrt:** `aria-disabled="true"` statt `disabled`, wo der Grund erklärt werden soll (der Baustein bleibt fokussierbar, Tooltip oder Hinweis nennt den Grund). Aussehen: `opacity: var(--disabled-opacity)`, kein Zeiger-Zustand, `cursor: not-allowed`. Ein gesperrter Baustein ist vom Kontrast ausgenommen (WCAG 1.4.3 und 1.4.11, inaktive Bedienelemente), wird aber nie allein durch Farbe als gesperrt gekennzeichnet: Der Grund steht als Text.
- **Lädt:** statisch. Ein Symbol (Sanduhr-Form) plus ein Wort („Lädt …“, „Wird gelesen“), `aria-busy="true"`, Größe und Platz bleiben gleich, der Baustein nimmt keine Klicks an. Die einzige Dauerbewegung im System bleibt die Anzeige „arbeitet“ einer laufenden Antwort (Bausteine Nachricht und Werkzeug-Zeile).
- **Gedrückt** nutzt `transform: scale(var(--press-scale))` für Knöpfe und Chips; Zeilen, Karten und Felder ändern nur die Fläche. Unter `prefers-reduced-motion` entfällt der Maßstab, die Fläche bleibt.
- Klickfläche mindestens `--hit-min` (32 px) in beiden Richtungen; kleinere Zeichen bekommen unsichtbare Fläche drum herum.
- Alle Texte der Bausteine kommen aus der Skala oben (`--text-xs` bis `--text-xl`). Zahlen in Tabellen und Messwerten setzen Tabellenziffern.

### 1. Knopf (vier Arten)

Aufgabe: Eine Handlung auslösen, benannt mit einem Verb. Höchstens ein Primär-Knopf je Bereich (Hauptaktion, Fitts: räumlich getrennt von Löschen).

```css
:root {
  --btn-h: var(--control-h);
  --btn-h-s: var(--hit-min);
  --btn-px: var(--space-4);
  --btn-gap: var(--space-2);
  --btn-radius: var(--radius-md);
  --btn-font: var(--text-sm);
  --btn-weight: var(--weight-ui);
  --btn-primary-bg: var(--accent-solid);
  --btn-primary-bg-hover: var(--accent-solid-hover);
  --btn-primary-bg-pressed: var(--accent-solid-hover);
  --btn-primary-fg: var(--accent-solid-fg);
  --btn-secondary-bg: var(--surface-active);
  --btn-secondary-bg-hover: var(--surface-active-hover);
  --btn-secondary-bg-pressed: var(--surface-active-pressed);
  --btn-secondary-fg: var(--text-on-tint);
  --btn-quiet-bg: transparent;
  --btn-quiet-bg-hover: var(--ctx-hover-fill);
  --btn-quiet-bg-pressed: var(--ctx-pressed-fill);
  --btn-quiet-fg: var(--text-secondary);
  --btn-quiet-fg-hover: var(--text);
  --btn-quiet-fg-pressed: var(--text-on-tint);
  --btn-danger-bg: var(--status-error-bg);
  --btn-danger-bg-hover: var(--status-error-solid);
  --btn-danger-bg-pressed: var(--status-error-solid);
  --btn-danger-fg: var(--status-error-fg);
  --btn-danger-fg-hover: var(--status-solid-fg);
  --btn-disabled-opacity: var(--disabled-opacity);
  --btn-pressed-scale: var(--press-scale);
}
```

Die vier Arten: **Primär** (Vollton; Senden-nahe Hauptaktion), **Sekundär** (getönt; „Immer erlauben“, „Verwalten“), **Leise** (ohne Fläche; „Abbrechen“, „Ablehnen“), **Gefährlich** (Löschen; blass im Ruhezustand, Vollton erst unter dem Zeiger, damit ein Streifen des Zeigers nichts auslöst). Träger: das Etikett (Text ≥ 4,5 : 1).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--btn-<art>-bg`, Schrift `--btn-<art>-fg`, `--btn-font`, `--btn-weight`, Höhe `--btn-h`, Radius `--btn-radius` | `<button>`; Enter und Leertaste lösen aus |
| Maus drüber | Fläche `--btn-<art>-bg-hover`; Leise: Schrift `--btn-quiet-fg-hover`; Gefährlich: Schrift `--btn-danger-fg-hover` | nur Zeiger, nie als einziger Hinweis auf eine Folge |
| Gedrückt | Fläche `--btn-<art>-bg-pressed`; `scale(var(--btn-pressed-scale))`, 140 ms; Leise: Schrift `--btn-quiet-fg-pressed` | löst beim Loslassen aus; Wegziehen bricht ab |
| Tastatur-Fokus | Ring außen, Abstand `--ring-offset`: `--focus-outline`; Primär und Gefährlich (unter dem Zeiger) mit `--focus-outline-solid` | Tab; der Ring liegt außerhalb der Füllung (Lücke zeigt den Grund) |
| Gesperrt | `opacity: var(--btn-disabled-opacity)`, keine Zeigerfläche | `aria-disabled="true"`; der Grund steht als Tooltip und per `aria-describedby` |
| Lädt | Fläche wie Normal; Etikett wird zum Verb im Progressiv („Sendet …“), davor das statische Lade-Symbol | `aria-busy="true"`, Klicks ignoriert, Breite stabil |

### 2. Icon-Knopf

Aufgabe: Eine Handlung mit nur einem Symbol (Büroklammer, „+“, Senden, Kopieren, Mehr, Seitenpanel). **Jeder hat einen zugänglichen Namen** (`aria-label`) und einen Tooltip mit demselben Wort (Beschwerde „Symbole ohne Namen“). Träger: das Symbol (≥ 3 : 1, hier ≥ 4,5 gehalten).

```css
:root {
  --ibtn-size: var(--hit-min);
  --ibtn-size-lg: calc(var(--hit-min) + var(--space-2));
  --ibtn-radius: var(--radius-md);
  --ibtn-radius-round: var(--radius-full);
  --ibtn-icon: var(--icon-m);
  --ibtn-fg: var(--text-secondary);
  --ibtn-fg-hover: var(--text);
  --ibtn-fg-pressed: var(--text-on-tint);
  --ibtn-bg-hover: var(--ctx-hover-fill);
  --ibtn-bg-pressed: var(--ctx-pressed-fill);
  --ibtn-bg-open: var(--surface-active);
  --ibtn-fg-open: var(--text-on-tint);
  --ibtn-send-bg: var(--accent-solid);
  --ibtn-send-bg-hover: var(--accent-solid-hover);
  --ibtn-send-fg: var(--accent-solid-fg);
}
```

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Symbol `--ibtn-fg`, Größe `--ibtn-icon`, Fläche keine; 32 px (`--ibtn-size`); rund für „+“, Büroklammer, Senden (`--ibtn-radius-round`); Senden 40 px (`--ibtn-size-lg`) mit `--ibtn-send-bg` und `--ibtn-send-fg` | `<button>` mit `aria-label` |
| Maus drüber | Fläche `--ibtn-bg-hover`, Symbol `--ibtn-fg-hover`; Senden: `--ibtn-send-bg-hover` | Tooltip nach 400 ms |
| Gedrückt | Fläche `--ibtn-bg-pressed`, Symbol `--ibtn-fg-pressed` (Symbole auf getönter Fläche nur `--text-on-tint`); `scale(var(--press-scale))` | |
| Tastatur-Fokus | Ring außen (`--focus-outline`); Senden mit `--focus-outline-solid` | Tooltip sofort bei Fokus |
| Gesperrt | `--disabled-opacity` | `aria-disabled="true"`, Grund im Tooltip (Senden ohne Text: „Nachricht fehlt“; Ollama nicht erreichbar: Ursache) |
| Lädt | Senden wird **Stopp** (gefülltes Quadrat) an derselben Stelle, `aria-label` „Stopp“; sonst statisches Lade-Symbol | Tippen im Feld bleibt möglich |

Umschalter (`aria-pressed`) und Menü-Auslöser (`aria-expanded`) zeigen den Zustand „an“ oder „offen“ mit `--ibtn-bg-open` und `--ibtn-fg-open`; der „+“-Knopf dreht dazu sein Symbol um 45° (wird zum ×), damit der Zustand nicht an der Farbe hängt.

### 3. Eingabefeld

Aufgabe: Text aufnehmen. Eine sichtbare Beschriftung (`<label>`) steht immer da; im Chat trägt das Feld `aria-label="Nachricht"`. Platzhalter sind Formathinweise, nie Beschriftung. Träger: die Kante `--control-edge` (3,05 : 1 und mehr).

```css
:root {
  --field-bg: var(--surface-raised);
  --field-fg: var(--text);
  --field-placeholder: var(--text-secondary);
  --field-edge: var(--control-edge);
  --field-edge-width: var(--edge-width);
  --field-edge-hover: var(--text-secondary);
  --field-edge-error: var(--status-error-fg);
  --field-error-fg: var(--status-error-fg);
  --field-h: var(--control-h);
  --field-px: var(--space-3);
  --field-radius: var(--radius-md);
  --field-radius-chat: var(--radius-xl);
  --field-font: var(--text-base);
  --field-shadow-chat: var(--shadow-3);
  --field-drop-bg: var(--accent-bg-subtle);
  --field-drop-edge: var(--accent-text);
}
```

Zwei Formen: **Formularfeld** (Höhe `--field-h`, Radius `--field-radius`, kein Schatten) und **Chat-Feld** (Ebene 3, Radius `--field-radius-chat`, Schatten `--field-shadow-chat`, wächst bis zur Höchsthöhe, enthält Chips und Werkzeugzeile; Feldkante rundum). Zusätzlich die Zustände **Fehler** (Kante `--field-edge-error`, Symbol plus Text darunter mit `aria-invalid="true"` und `aria-describedby`) und **Ablegen** (Fläche `--field-drop-bg`, Kante `--field-drop-edge`, Wort „Hier ablegen“).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--field-bg`, Schrift `--field-fg`, Platzhalter `--field-placeholder`, Kante `--field-edge` 1 px | |
| Maus drüber | Kante `--field-edge-hover` | |
| Gedrückt | trifft nicht zu: Ein Feld wird nicht „gehalten“; der Klick setzt den Fokus, und dieser Zustand ist der Tastatur-Fokus | |
| Tastatur-Fokus | Ring außen um das Feld (`--focus-outline`), Kante bleibt; im Chat-Feld um das ganze Feld (`:focus-within`) | Cursor sichtbar; Strg+L fokussiert das Chat-Feld |
| Gesperrt | `--disabled-opacity`; der Platzhalter nennt den Grund („Ollama ist nicht erreichbar“) | `aria-disabled` plus `readonly`, Text bleibt kopierbar |
| Lädt | `readonly`, `aria-busy="true"`, rechts statisch das Wort „Wird gelesen“ (Anhang) | Tippen bleibt im Chat-Feld erlaubt |

### 4. Auswahl

Aufgabe: Aus einer Liste genau einen Wert wählen (Modell, Sprache, Darstellung). Zwei Formen: **Feld** (Formulare, mit Kante) und **Inline** (Modellauswahl in der Werkzeugzeile des Eingabefelds, ohne Kante, Träger ist Text plus Pfeil).

```css
:root {
  --select-bg: var(--field-bg);
  --select-fg: var(--field-fg);
  --select-edge: var(--field-edge);
  --select-edge-hover: var(--field-edge-hover);
  --select-chevron: var(--text-secondary);
  --select-h: var(--control-h);
  --select-radius: var(--radius-md);
  --select-inline-fg: var(--text);
  --select-inline-bg-hover: var(--ctx-hover-fill);
  --select-inline-bg-open: var(--surface-active);
  --select-inline-fg-open: var(--text-on-tint);
}
```

**Zugänglicher Name der Modellauswahl:** `aria-label="Modell: <sichtbarer Name>"`, zum Beispiel „Modell: Qwen3 14B“. Er beginnt mit „Modell“ (Tests und Hilfstechnik finden ihn dort) und enthält den sichtbaren Text vollständig (WCAG 2.5.3, Beschriftung im Namen). Der Auslöser hat `aria-haspopup="listbox"`; die Liste ist die Variante „Auswahl-Liste“ des Menüs.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Feld: wie Eingabefeld (`--select-bg`, `--select-edge`), Pfeil `--select-chevron`; Inline: Text `--select-inline-fg`, Pfeil, ohne Fläche | `<button>` mit `aria-expanded` (true offen, false zu) |
| Maus drüber | Feld: Kante `--select-edge-hover`; Inline: Fläche `--select-inline-bg-hover` | |
| Gedrückt | Feld: wie Hover; Inline: Fläche `--ctx-pressed-fill` | öffnet beim Loslassen |
| Tastatur-Fokus | Ring außen | Enter, Leertaste, ↓ öffnen; Fokus geht auf den gewählten Eintrag |
| Gesperrt | `--disabled-opacity`; Text „Keine Modelle“ bei Ollama nicht erreichbar | `aria-disabled`, Grund per `aria-describedby` |
| Lädt | Text „Modelle werden geladen“ statt Name, statisches Symbol | `aria-busy="true"` |
| Offen (Zusatz) | Inline: `--select-inline-bg-open`, Schrift `--select-inline-fg-open`; Feld: Pfeil dreht um 180° | |

### 5. Schalter

Aufgabe: Eine Einstellung sofort ein- oder ausschalten (Einstellungen, Server, Skills). In einem Menü gilt stattdessen der Haken (Baustein Menü). Träger: Spur (aus: `--control-edge`; an: `--accent-solid`) und Daumen, beide ≥ 3 : 1. Der Zustand hängt nicht an der Farbe: Der Daumen sitzt links oder rechts, und eingeschaltet trägt er ein Haken-Zeichen.

```css
:root {
  --switch-w: 40px;
  --switch-h: 24px;
  --switch-thumb: 18px;
  --switch-track-off: var(--control-edge);
  --switch-track-off-hover: var(--text-secondary);
  --switch-track-on: var(--accent-solid);
  --switch-track-on-hover: var(--accent-solid-hover);
  --switch-thumb-off: var(--surface-raised);
  --switch-thumb-on: var(--accent-solid-fg);
  --switch-check: var(--accent-solid);
}
```

Die ganze Zeile (Beschriftung plus Spur) ist die Klickfläche, mindestens `--hit-min` hoch. Beschriftung links, Spur rechts; die Beschriftung nennt die Einstellung, nicht den Zustand.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | aus: Spur `--switch-track-off`, Daumen `--switch-thumb-off` links; an: Spur `--switch-track-on`, Daumen `--switch-thumb-on` rechts mit Haken `--switch-check` | `role="switch"`, `aria-checked` |
| Maus drüber | aus: Spur `--switch-track-off-hover`; an: `--switch-track-on-hover` | |
| Gedrückt | Daumen `scale(var(--press-scale))` | Umschalten beim Loslassen |
| Tastatur-Fokus | Ring außen um die Spur; eingeschaltet `--focus-outline-solid` | Leertaste schaltet |
| Gesperrt | `--disabled-opacity`; Grund als Text unter der Beschriftung | `aria-disabled="true"` |
| Lädt | Daumen mittig, Wort „Wird geändert“ neben der Spur, statisch | `aria-busy="true"`; `aria-checked` ändert sich erst mit dem Ergebnis |

### 6. Chip

Aufgabe: Eine eingeschaltete Kategorie im Eingabefeld zeigen (Wissen, Skills, E-Mail, Internet, Vorlage) und entfernbar machen. Zwei Bedienflächen: der **Name** (öffnet das Untermenü) und das **×** (entfernt). Träger: Text und × (≥ 4,5 : 1 auf `--surface-active`).

```css
:root {
  --chip-h: var(--hit-min);
  --chip-px: var(--space-3);
  --chip-radius: var(--radius-full);
  --chip-font: var(--text-sm);
  --chip-weight: var(--weight-ui);
  --chip-bg: var(--surface-active);
  --chip-bg-hover: var(--surface-active-hover);
  --chip-bg-pressed: var(--surface-active-pressed);
  --chip-fg: var(--text-on-tint);
  --chip-max-w: 220px;
  --chip-remove-size: var(--hit-min);
}
```

**Langer Name:** Der Name wird bei `--chip-max-w` mit Auslassungszeichen gekürzt, der volle Name steht im Tooltip und im zugänglichen Namen; das × bleibt immer sichtbar (feste Breite). Mehr Chips als eine Zeile brechen um. **Warnung** (Modell ohne Werkzeuge): vorangestelltes Warndreieck in `--chip-fg` (Form trägt, nicht Farbe), Wort im zugänglichen Namen („Warnung: Modell kann keine Werkzeuge nutzen“).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--chip-bg`, Schrift und × `--chip-fg`, Höhe `--chip-h` | zwei `<button>` im Chip; Name mit `aria-haspopup="menu"`, × mit `aria-label="<Name> entfernen"` |
| Maus drüber | Fläche `--chip-bg-hover` (der Teil unter dem Zeiger) | |
| Gedrückt | Fläche `--chip-bg-pressed`, `scale(var(--press-scale))` | |
| Tastatur-Fokus | Ring außen um den jeweiligen Teil (Name oder ×) | Tab, Entf/Rücktaste auf dem Chip entfernt |
| Gesperrt | `--disabled-opacity` (Ollama nicht erreichbar blendet nichts aus; Chips bleiben sichtbar) | `aria-disabled` |
| Lädt | Symbol statisch, Wort „Wird gelesen“ statt Auswahl | `aria-busy="true"` |

### 7. Leisten-Zeile

Aufgabe: Ein Ziel in der Seitenleiste: Bereich (Chat, Vorlagen, Code, Modelle), Projekt, letzter Chat, Suchzeile, Fuß. Ruhe: keine Fläche. Eingeklappt (64 px): nur das Symbol, Name als Tooltip und `aria-label`. Träger: Text (≥ 4,5 : 1) und Symbol.

```css
:root {
  --nav-h: var(--row-h);
  --nav-px: var(--space-3);
  --nav-gap: var(--space-3);
  --nav-radius: var(--radius-md);
  --nav-font: var(--text-sm);
  --nav-weight: var(--weight-ui);
  --nav-weight-current: var(--weight-strong);
  --nav-fg: var(--text-secondary);
  --nav-fg-hover: var(--text);
  --nav-bg-hover: var(--surface-hover);
  --nav-bg-pressed: var(--surface-active);
  --nav-fg-pressed: var(--text-on-tint);
  --nav-bg-current: var(--surface-active);
  --nav-fg-current: var(--text-on-tint);
  --nav-search-bg: var(--surface-hover);
  --nav-search-bg-hover: var(--surface-hover-strong);
}
```

Der aktuelle Bereich ist durch **Fläche, Schriftgewicht 600 und `aria-current="page"`** gekennzeichnet (nicht nur Farbe). Lange Namen kürzen mit Auslassungszeichen, voll im Tooltip. Die Suchzeile ist ein Knopf (`aria-keyshortcuts="Control+K"`) mit dem Kürzel „Strg K“ als Marke rechts. Die Zeile „Mehr“ erscheint bei Zeiger und bei Fokus in der Zeile und ist ein Icon-Knopf (auf der gewählten Zeile in `--text-on-tint`).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Schrift `--nav-fg`, Symbol 20 px, keine Fläche; Suchzeile: Fläche `--nav-search-bg` | `<a>` oder `<button>` |
| Maus drüber | Fläche `--nav-bg-hover`, Schrift `--nav-fg-hover`; Suchzeile `--nav-search-bg-hover` | |
| Gedrückt | Fläche `--nav-bg-pressed`, Schrift `--nav-fg-pressed` | |
| Tastatur-Fokus | Ring **innen** (`--focus-inset`); die Zeile liegt am Rand eines scrollenden Bereichs | Pfeile ↑ ↓ innerhalb der Liste, Tab zwischen Gruppen |
| Gesperrt | `--disabled-opacity`, Grund im Tooltip | `aria-disabled="true"` |
| Lädt | Platzhalter-Zeile: zwei statische Balken in `--surface-hover` (kein Schimmern), Gruppe `aria-busy="true"` | |
| Aktuell (Zusatz) | Fläche `--nav-bg-current`, Schrift `--nav-fg-current`, Gewicht `--nav-weight-current` | `aria-current="page"` |

### 8. Karte

Aufgabe: Ein Ding zusammenfassen (Modell, Einstieg, Anhang, Rückfrage). Schwebt auf Ebene 2, ohne Rahmen. Enthält **keine** zweite Fläche. Träger: Titeltext (≥ 4,5 : 1) und bei bedienbaren Karten ein Pfeil-Symbol am Ende (≥ 3 : 1).

```css
:root {
  --card-bg: var(--surface);
  --card-bg-hover: var(--surface-hover);
  --card-fg: var(--text);
  --card-fg-secondary: var(--text-secondary);
  --card-radius: var(--radius-lg);
  --card-padding: var(--space-5);
  --card-padding-compact: var(--space-4);
  --card-gap: var(--space-3);
  --card-shadow: var(--shadow-2);
  --card-shadow-hover: var(--shadow-3);
  --card-lift: -2px;
  --card-title-font: var(--text-lg);
  --card-title-weight: var(--weight-strong);
}
```

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--card-bg`, Schatten `--card-shadow`, Radius `--card-radius`, Innenabstand `--card-padding` | statisch: `<section>` mit Überschrift; bedienbar: die Karte ist **ein** `<a>` oder `<button>` |
| Maus drüber | nur bedienbare Karte: Fläche `--card-bg-hover`, Schatten `--card-shadow-hover`, `translateY(var(--card-lift))`, 140 ms | statische Karte: trifft nicht zu, nichts ist anklickbar |
| Gedrückt | bedienbar: Fläche `--card-bg-hover`, Schatten `--card-shadow`, `scale(0.99)` | |
| Tastatur-Fokus | bedienbar: Ring außen (Radius folgt `--card-radius`) | |
| Gesperrt | bedienbar: `--disabled-opacity`, Grund als Text in der Karte | `aria-disabled="true"` |
| Lädt | Titel- und Textbalken in `--surface-hover`, statisch, Text „Lädt“ für Hilfstechnik | `aria-busy="true"` |

Diagramme auf einer Karte stehen **rahmenlos** (keine zweite Fläche); auf dem Grund (Chat) schweben sie selbst als Karte.

### 9. Menü

Aufgabe: Aktionen, Schalter oder eine Auswahl an einem Auslöser anbieten. Ebene 4. Drei Formen: **Aktionsmenü** (`menuitem`), **Schalter-Menü** (`menuitemcheckbox`, „+“-Menü und Untermenüs), **Auswahl-Liste** (`listbox` mit `aria-selected`, Modellauswahl). Träger: Zeilentext (≥ 4,5 : 1), der Haken (≥ 4,5 : 1 gehalten).

```css
:root {
  --menu-bg: var(--surface-raised);
  --menu-radius: var(--radius-lg);
  --menu-padding: var(--space-2);
  --menu-shadow: var(--shadow-4);
  --menu-w: 410px;
  --menu-w-sub: 320px;
  --menu-row-h: var(--control-h);
  --menu-row-h-2: 56px;
  --menu-row-px: var(--space-3);
  --menu-row-gap: var(--space-3);
  --menu-row-radius: max(4px, calc(var(--menu-radius) - var(--menu-padding)));
  --menu-row-fg: var(--text);
  --menu-row-fg-secondary: var(--text-secondary);
  --menu-icon: var(--icon-m);
  --menu-check: var(--accent-text);
  --menu-row-bg-hover: var(--surface-hover-strong);
  --menu-row-bg-pressed: var(--surface-active-hover);
  --menu-row-bg-focus: var(--surface-active);
  --menu-row-fg-on-tint: var(--text-on-tint);
  --menu-group-gap: var(--space-2);
  --menu-group-label-font: var(--text-xs);
}
.menu, .palette, .dialog, .tooltip, .field-chat {   /* Ebene 3 und 4: Zeigerfläche stärker */
  --ctx-hover-fill: var(--surface-hover-strong);
}
```

Eine Zeile hat Symbol, Name (`--text-sm`, Gewicht 500), eine erklärende Zeile (`--text-xs`, `--text-secondary`) und rechts den Zustand in Worten. Auf der hervorgehobenen Zeile (Fokus, gedrückt) tragen **alle** Texte und Symbole `--menu-row-fg-on-tint`; die Rangfolge entsteht aus Größe und Gewicht. **Trennung ohne Linie:** Gruppen trennt ein Abstand von `--menu-group-gap` (der Eintrag bleibt als `role="separator"` für Hilfstechnik). JOURNEY nennt dafür „Trennlinie“; gemeint ist dieser Abstand.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche keine (auf `--menu-bg`), Schrift `--menu-row-fg`, Nebenzeile `--menu-row-fg-secondary`, Haken `--menu-check` | Zeilen sind `menuitem`, `menuitemcheckbox` oder `option` |
| Maus drüber | Fläche `--menu-row-bg-hover` | Zeiger bewegt die Hervorhebung nicht in den Fokus |
| Gedrückt | Fläche `--menu-row-bg-pressed`, alle Texte `--menu-row-fg-on-tint` | löst beim Loslassen aus; Schalter-Zeilen lassen das Menü offen |
| Tastatur-Fokus | Fläche `--menu-row-bg-focus`, alle Texte `--menu-row-fg-on-tint`, Ring **innen** | ↑ ↓ wechseln, Pos1/Ende, Anfangsbuchstabe springt |
| Gesperrt | `--disabled-opacity`, Grund in der Nebenzeile | `aria-disabled="true"`, bleibt per Pfeil erreichbar |
| Lädt | Platzhalter-Zeile (statische Balken, Wort „Lädt“) | `aria-busy="true"` am Menü |

**Aufbau des „+“-Menüs für Hilfstechnik (gültiges ARIA-Menü).**

| Teil | Markup | Hinweis |
|---|---|---|
| „+“-Knopf | `<button aria-label="Mehr hinzufügen" aria-haspopup="menu" aria-expanded="true|false" aria-controls="<id>">` | `aria-expanded` folgt dem Zustand: `true`, solange das Menü offen ist, sonst `false`; er steht nie fest auf einem Wert, und der Knopf trägt kein `aria-pressed`. Symbol dreht 45° (siehe Icon-Knopf). |
| Erste Ebene | `<div role="menu" aria-labelledby="<Knopf>">` mit sechs Zeilen | Beim Öffnen geht der Fokus auf die erste Zeile; Esc schließt und gibt den Fokus an „+“ zurück; Tab schließt |
| Zeile „Recherche“ | `role="menuitemcheckbox" aria-checked="true|false"` | Enter oder Leertaste schaltet; Menü bleibt offen |
| Zeilen mit Untermenü (Wissen, Werkzeuge, Skills, E-Mail, Internet) | `role="menuitem" aria-haspopup="menu" aria-expanded="true|false"`; Zustand in Worten steht im sichtbaren Text und damit im Namen („Wissen, Sammlung Notizen“) | Enter, → oder Klick öffnet das Untermenü; ← oder Esc schließt es und kehrt zur Zeile zurück |
| Untermenü | `<div role="menu" aria-label="<Zeilenname>">` | öffnet rechts daneben |
| Einträge im Untermenü | `role="menuitemcheckbox" aria-checked` (Haken links); Zeile mit Auswahl (eine Sammlung) ebenso | Enter oder Leertaste schaltet, das Untermenü bleibt offen |
| „Verwalten …“ | `<a role="menuitem" href="…">`, **letzter Punkt** des Untermenüs, nach dem Abstand `--menu-group-gap` | nie zweiter Punkt in einer Zeile; in der Pfeilreihenfolge erreichbar |
| Warnungen | Text mit `id`, am Punkt `aria-describedby` | wird mit dem Punkt vorgelesen |

**Menü am Fensterrand (Platzierung).** Das Menü bleibt am Auslöser. Es öffnet dorthin, wo Platz ist (zuerst nach oben beim Eingabefeld, sonst nach unten), schiebt sich waagerecht ins Fenster mit mindestens `--space-2` Rand und begrenzt seine Höhe auf den freien Platz minus `--space-4`; der Inhalt scrollt dann im Menü, der Kopf bleibt. Das Untermenü öffnet rechts; fehlt dort der Platz, links; fehlt er auch dort, ersetzt es die erste Ebene mit „Zurück“ als erstem Punkt. Bei 900 px Fensterbreite bleibt `--menu-w` 410 px, höchstens Fensterbreite minus 48 px.

**Bewegung.** Erscheinen: Deckkraft und 8 px Weg aus der Richtung des Auslösers, 320 ms, `--ease-out`; Verschwinden auf demselben Weg, `--ease-in`.

### 10. Befehlspalette

Aufgabe: Per Strg+K zu Seite, Befehl, Projekt oder Chat springen. Ebene 4, mittig oben, 640 px breit (höchstens Fensterbreite minus 48 px), mit Vorhang `--scrim`. Träger: Zeilentext (≥ 4,5 : 1).

```css
:root {
  --palette-bg: var(--surface-raised);
  --palette-w: 640px;
  --palette-radius: var(--radius-xl);
  --palette-shadow: var(--shadow-4);
  --palette-padding: var(--space-2);
  --palette-input-h: 56px;
  --palette-input-font: var(--text-base);
  --palette-input-edge: var(--control-edge);
  --palette-row-h: var(--control-h-lg);
  --palette-row-radius: max(4px, calc(var(--palette-radius) - var(--palette-padding)));
  --palette-row-fg: var(--text);
  --palette-row-fg-secondary: var(--text-secondary);
  --palette-row-bg-hover: var(--surface-hover-strong);
  --palette-row-bg-selected: var(--surface-active);
  --palette-row-fg-selected: var(--text-on-tint);
  --palette-row-bg-pressed: var(--surface-active-hover);
  --palette-group-font: var(--text-xs);
  --palette-hint-font: var(--text-xs);
  --palette-max-rows: 8;
}
```

Die Eingabezeile hat keinen Rahmen; ihre **Unterkante** in `--palette-input-edge` ist die Kante des Feldes (3 : 1) und trennt sie von den Ergebnissen. Kürzel stehen rechts als Marke (`--surface-active`, `--text-on-tint`, `--radius-sm`). Auf der gewählten Zeile tragen alle Texte `--palette-row-fg-selected`.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Zeile ohne Fläche, Name `--palette-row-fg`, Nebenzeile `--palette-row-fg-secondary` | Container `role="dialog" aria-modal="true" aria-label="Befehlspalette"`; Eingabe `role="combobox" aria-expanded="true" aria-controls aria-activedescendant`; Liste `role="listbox"`; Gruppen `role="group" aria-labelledby`; Zeilen `role="option" aria-selected` |
| Maus drüber | Auswahl springt auf die Zeile (Fläche `--palette-row-bg-selected`), vorher kurz `--palette-row-bg-hover` | |
| Gedrückt | Fläche `--palette-row-bg-pressed`, Texte `--palette-row-fg-selected` | Klick führt aus |
| Tastatur-Fokus | Der Fokus bleibt im Eingabefeld (Ring außen um das Feld in der Zeile, innen auf dem Kopf der Palette); die gewählte Zeile ist `--palette-row-bg-selected` mit Ring **innen** | ↑ ↓ wählen, Enter führt aus, Esc schließt, Fokus kehrt zum Auslöser zurück |
| Gesperrt | Befehl, der gerade nicht geht, steht mit Grund in der Nebenzeile, `--disabled-opacity` | `aria-disabled="true"` |
| Lädt | Zeile „sucht in Chats“ (statisch) in der Gruppe Chats, Auswahl springt nicht | `aria-live="polite"` meldet die Zahl der Treffer |

### 11. Dialog

Aufgabe: Eine Entscheidung oder ein Entwurf, der die Seite anhält (Bestätigung, Verdichten, Tastenkürzel). Ebene 4 mit Vorhang `--scrim`. Folgenreiches (Löschen) ist ein `alertdialog`.

```css
:root {
  --dialog-bg: var(--surface-raised);
  --dialog-radius: var(--radius-xl);
  --dialog-shadow: var(--shadow-4);
  --dialog-padding: var(--space-5);
  --dialog-gap: var(--space-4);
  --dialog-w: 440px;
  --dialog-w-wide: 560px;
  --dialog-title-font: var(--text-lg);
  --dialog-title-weight: var(--weight-strong);
  --dialog-body-fg: var(--text);
  --dialog-scrim: var(--scrim);
  --dialog-actions-gap: var(--space-2);
}
```

Aufbau: Titel, Text (nennt, was betroffen ist und was erhalten bleibt), Knopfzeile rechts: **Leise** „Abbrechen“ links, **Primär** (oder **Gefährlich** bei Löschen) rechts. Anfangsfokus: bei Folgenreichem auf „Abbrechen“, sonst auf das erste Feld.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--dialog-bg`, Schatten `--dialog-shadow`, Vorhang `--dialog-scrim` | `role="dialog"` oder `alertdialog`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`; Hintergrund `inert`; Fokus eingesperrt; Esc schließt und gibt den Fokus zurück |
| Maus drüber | trifft nicht zu: Der Dialog selbst ist keine Bedienfläche; seine Knöpfe haben eigene Zustände | |
| Gedrückt | trifft nicht zu, gleicher Grund | |
| Tastatur-Fokus | Ring der Knöpfe und Felder darin; der Container hat `tabindex="-1"` und keinen Ring | Tab bleibt im Dialog |
| Gesperrt | trifft nicht zu: Ein Dialog ist offen oder zu. Läuft die Aktion bereits, sperrt der Bestätigungsknopf (Zustand Lädt) und „Abbrechen“ bleibt | |
| Lädt | Der Bestätigungsknopf zeigt „Lädt“ (Knopf, Zustand Lädt), Text nennt die Dauer; Esc und Vorhang-Klick schließen nicht, bis die Aktion beendet ist | `aria-busy="true"` am Dialog |

### 12. Tooltip

Aufgabe: Einen Namen oder Grund zu einem Element zeigen (Icon-Knopf, gekürzter Text, gesperrter Knopf, Kürzel). Enthält nie etwas Bedienbares. Ebene 4.

```css
:root {
  --tip-bg: var(--surface-raised);
  --tip-fg: var(--text);
  --tip-fg-secondary: var(--text-secondary);
  --tip-radius: var(--radius-sm);
  --tip-px: var(--space-3);
  --tip-py: var(--space-2);
  --tip-font: var(--text-sm);
  --tip-max-w: 280px;
  --tip-shadow: var(--shadow-4);
  --tip-delay: 400ms;
}
```

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal (sichtbar) | Fläche `--tip-bg`, Schrift `--tip-fg`, Kürzel in `--tip-fg-secondary` | `role="tooltip"`, am Auslöser `aria-describedby`; erscheint nach `--tip-delay` (Zeiger) oder sofort (Fokus) |
| Maus drüber | bleibt sichtbar, solange der Zeiger auf Auslöser **oder** Tooltip ist (WCAG 1.4.13, hover-fähig) | |
| Gedrückt | trifft nicht zu: nicht bedienbar | |
| Tastatur-Fokus | trifft nicht zu: Ein Tooltip nimmt keinen Fokus; er erscheint, wenn der **Auslöser** Fokus hat | Esc schließt, ohne den Fokus zu bewegen |
| Gesperrt | trifft nicht zu: Auf einem gesperrten Auslöser nennt er den **Grund**; der Auslöser bleibt dafür fokussierbar | |
| Lädt | trifft nicht zu: Der Text liegt vor dem Zeigen fest | |

### 13. Tabellen-Zeile

Aufgabe: Daten in Spalten (Modelle, Status, Einstellungen, Quellen). **Kein Gitter, keine Trennlinien**; Zeilen trennen Abstand und Zeigerfläche. Träger: Text (≥ 4,5 : 1).

```css
:root {
  --trow-h: var(--control-h-lg);
  --trow-head-h: var(--hit-min);
  --trow-px: var(--space-3);
  --trow-gap: var(--space-4);
  --trow-radius: var(--radius-md);
  --trow-fg: var(--text);
  --trow-fg-secondary: var(--text-secondary);
  --trow-head-font: var(--text-xs);
  --trow-head-weight: var(--weight-strong);
  --trow-bg-hover: var(--surface-hover);
  --trow-bg-pressed: var(--surface-active-hover);
  --trow-bg-selected: var(--surface-active);
  --trow-fg-selected: var(--text-on-tint);
}
```

Zahlen stehen rechtsbündig mit Tabellenziffern. Die Kopfzeile ist sortierbar über Knöpfe in den Kopfzellen (`aria-sort`). Auf der gewählten Zeile tragen **alle** Zellen `--trow-fg-selected`; Zustandspunkte (geladen, Fehler) zeigen dort Form und Wort statt `--status-mark-*`.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Name `--trow-fg`, andere Zellen `--trow-fg-secondary`, keine Fläche | `<table>` mit `<th scope>`; die erste Zelle enthält den Knopf oder Link, dessen Klickfläche die ganze Zeile deckt |
| Maus drüber | Fläche `--trow-bg-hover`; Aktion „Mehr“ erscheint | |
| Gedrückt | Fläche `--trow-bg-pressed`, Texte `--trow-fg-selected` | |
| Tastatur-Fokus | Ring **innen** | Tab auf den Zeilenknopf; „Mehr“ bleibt per Tab erreichbar |
| Gesperrt | `--disabled-opacity`, Grund in der Zeile | `aria-disabled="true"` |
| Lädt | Platzhalter-Zeilen mit statischen Balken in `--surface-hover` | `aria-busy="true"` an der Tabelle |
| Gewählt (Zusatz) | Fläche `--trow-bg-selected`, alle Texte `--trow-fg-selected` | `aria-selected` oder `aria-current` |

### 14. Werkzeug-Zeile mit Rückfrage-Karte

Aufgabe: Zeigen, was das Modell tut, und vor Folgenreichem fragen. Die **Zeile** steht im Fluss der Antwort (Ebene 0). Die **Rückfrage-Karte** darunter ist eine Karte (Ebene 2) auf dem Grund, nicht in einer Fläche.

```css
:root {
  --tool-h: var(--control-h);
  --tool-px: var(--space-3);
  --tool-gap: var(--space-3);
  --tool-radius: var(--radius-md);
  --tool-font: var(--text-sm);
  --tool-name-fg: var(--text);
  --tool-status-fg: var(--text-secondary);
  --tool-bg-hover: var(--surface-hover);
  --tool-bg-pressed: var(--surface-active);
  --tool-fg-pressed: var(--text-on-tint);
  --tool-mark-waiting: var(--status-mark-warning);
  --tool-mark-running: var(--accent-text);
  --tool-mark-done: var(--status-mark-success);
  --tool-mark-error: var(--status-mark-error);
  --tool-mark-refused: var(--text-secondary);
  --tool-detail-font: var(--text-xs);
  --tool-detail-max-h: 240px;
  --ask-bg: var(--card-bg);
  --ask-radius: var(--card-radius);
  --ask-shadow: var(--card-shadow);
  --ask-padding: var(--card-padding);
  --ask-gap: var(--space-4);
  --ask-title-font: var(--text-base);
  --ask-title-weight: var(--weight-strong);
  --ask-code-font: var(--font-mono);
}
```

**Zeile:** Symbol und Wort für den Stand: wartet auf Freigabe (Warnzeichen), läuft (Anzeige „arbeitet“, die einzige erlaubte Dauerbewegung, weil sie Teil der laufenden Antwort ist), fertig (Haken), Fehler (Kreuz), abgelehnt und abgebrochen (Strich-Kreis). Jeder Stand hat Symbol **und** Wort, nie nur Farbe. Die Zeile ist ein Auf- und Zuklapper (`<button aria-expanded aria-controls>`); aufgeklappt stehen Server, Eingabe und Ergebnis als Mono-Text ohne eigene Fläche, mit Einzug, scrollend ab `--tool-detail-max-h`.

**Rückfrage-Karte:** Titel („Erlauben?“) mit dem Namen der Aktion, ein Satz (was, über welchen Server), bei verändernden Werkzeugen eine Warnzeile (Symbol plus Wort, ohne Kasten), die Vorschau (Befehl, Adresse, Änderung) in `--ask-code-font` mit Einzug statt Kasten, dann die Knöpfe: **Primär** („Einmal erlauben“, je nach Art „Erlauben“, „Übernehmen“, „Ausführen“, „Committen“), **Sekundär** („Immer erlauben“, nur wo angeboten), **Leise** („Ablehnen“). Höchstens drei.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Name `--tool-name-fg`, Stand `--tool-status-fg` mit Symbol `--tool-mark-*`, keine Fläche | Kopf `<button aria-expanded>`; Karte `role="group" aria-labelledby`; Stand als `role="status"` (höflich), beim Wechsel zu „wartet auf Freigabe“ wird die Frage vorgelesen |
| Maus drüber | Fläche `--tool-bg-hover` | |
| Gedrückt | Fläche `--tool-bg-pressed`, Texte `--tool-fg-pressed`, Symbole `--tool-fg-pressed` | |
| Tastatur-Fokus | Zeile: Ring innen; Knöpfe der Karte: Ring außen | Der Fokus springt **nicht** von selbst in die Karte, wenn der Nutzer gerade schreibt; sonst auf den ersten Knopf. Esc lehnt nicht ab (Esc stoppt die Antwort, wie heute). |
| Gesperrt | Die Zeile ist nie gesperrt. Karte: Ist nichts freizugeben (kein Konto), bleibt nur „Ablehnen“ aktiv, die anderen sind `aria-disabled` mit Grund | |
| Lädt | Stand „läuft“: Anzeige „arbeitet“ plus Wort; unter `prefers-reduced-motion` ein stehendes Symbol mit Wort | `aria-busy` an der Zeile |

### 15. Nachricht

Aufgabe: Eine Äußerung im Chat. **Eigene Nachricht:** schwebende Fläche der Ebene 2, ragt 36 px über die Lesespalte. **Antwort:** keine Fläche, Text direkt auf dem Grund, Lesespalte `--measure`.

```css
:root {
  --msg-own-bg: var(--surface-voice);
  --msg-own-fg: var(--text);
  --msg-own-fg-secondary: var(--text-secondary);
  --msg-own-radius: 20px 20px 6px 20px;
  --msg-own-shadow: var(--shadow-2);
  --msg-own-px: var(--space-4);
  --msg-own-py: var(--space-3);
  --msg-own-offset: 36px;
  --msg-own-max-w: 80%;
  --msg-answer-fg: var(--text);
  --msg-answer-font: var(--text-base);
  --msg-answer-leading: var(--leading-body);
  --msg-answer-measure: var(--measure);
  --msg-gap: var(--space-5);
  --msg-meta-font: var(--text-xs);
  --msg-meta-fg: var(--text-secondary);
  --msg-target-bg: var(--accent-bg-subtle);
  --msg-actions-gap: var(--space-1);
}
```

Aktionen (Kopieren, Bearbeiten, Merken, Antwort wiederholen) sind Icon-Knöpfe unter der Nachricht. Sie erscheinen bei Zeiger **und** bei Fokus in der Nachricht (`:focus-within`), liegen immer im Tab-Ablauf und tragen Namen. Fehler in der Antwort: eine Zeile mit Symbol, Wort und der Aktion „Antwort wiederholen“, keine Fläche.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | eigene: `--msg-own-bg`, `--msg-own-fg`, Radius `--msg-own-radius`, Schatten `--msg-own-shadow`; Antwort: `--msg-answer-fg` auf dem Grund | Verlauf `role="log"` mit `aria-live="polite"`; jede Nachricht `<article>` mit Beschriftung („Du“, „Modell“) für Hilfstechnik |
| Maus drüber | Die Aktionszeile wird sichtbar (Deckkraft, 140 ms); Fläche unverändert | |
| Gedrückt | trifft nicht zu: Die Nachricht ist keine Bedienfläche; ihre Aktionen sind Icon-Knöpfe | |
| Tastatur-Fokus | Aktionen zeigen sich und tragen den Ring; **Sprungziel** (Treffer aus der Suche): `tabindex="-1"`, Fläche `--msg-target-bg` kurz (Einblenden 320 ms, 1,6 s halten, Ausblenden 480 ms), kein Ring | Fokus auf die Nachricht beim Sprung |
| Gesperrt | Nachricht nie; Aktionen Bearbeiten und Wiederholen sind `aria-disabled`, solange eine Antwort läuft (Grund im Tooltip) | |
| Lädt | Antwort läuft: Wartezeile („Modell wird geladen“, „arbeitet mit Werkzeugen“) mit der Anzeige „arbeitet“, dann fließender Text; Stopp ersetzt Senden | `aria-busy="true"` am Verlauf; reduziert: stehendes Symbol mit Wort |

### 16. Banner

Aufgabe: Einen Zustand melden, der über dem Eingabefeld oder in einer Seite stehen bleibt (Ollama nicht erreichbar, Kontext zu knapp, Hinweis). Ebene 1, ohne Schatten, ohne Rand. Vier Arten: info, success, warning, error. Eine Meldung trägt immer **Symbol und Wort**.

```css
:root {
  --banner-radius: var(--radius-lg);
  --banner-px: var(--space-4);
  --banner-py: var(--space-3);
  --banner-gap: var(--space-3);
  --banner-fg: var(--text);
  --banner-title-weight: var(--weight-strong);
  --banner-error-bg: var(--status-error-bg);
  --banner-error-fg: var(--status-error-fg);
  --banner-error-mark: var(--status-mark-error);
  --banner-warning-bg: var(--status-warning-bg);
  --banner-warning-fg: var(--status-warning-fg);
  --banner-warning-mark: var(--status-mark-warning);
  --banner-success-bg: var(--status-success-bg);
  --banner-success-fg: var(--status-success-fg);
  --banner-success-mark: var(--status-mark-success);
  --banner-info-bg: var(--status-info-bg);
  --banner-info-fg: var(--status-info-fg);
  --banner-info-mark: var(--status-mark-info);
}
.banner {   /* der Banner stellt den Sekundär-Knopf um, nur in seinem Inneren */
  --btn-secondary-bg: var(--surface-raised);
  --btn-secondary-bg-hover: var(--surface-hover-strong);
  --btn-secondary-bg-pressed: var(--surface-active);
  --btn-secondary-fg: var(--text);
}
```

Das Wort der Art („Fehler“, „Hinweis“) steht in `--banner-<art>-fg`, der erklärende Text in `--banner-fg`. Die Aktionen im Banner sind Knöpfe der Art Sekundär mit den hier überschriebenen Baustein-Tokens (weiße Fläche auf der Tönung; Beispiel für die Baustein-Stufe: Der Banner stellt den Knopf um, ohne die Alias-Stufe zu berühren). Auf Fehler-Banner, solange die Ursache besteht, gibt es kein Schließen.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--banner-<art>-bg`, Symbol `--banner-<art>-mark`, Wort `--banner-<art>-fg`, Text `--banner-fg` | Neu auftauchend: `role="alert"` bei Fehler, sonst `role="status"`; bleibt der Banner stehen (Ollama), `role="status"` |
| Maus drüber | trifft nicht zu: Das Banner ist keine Bedienfläche; seine Knöpfe haben Zustände | |
| Gedrückt | trifft nicht zu, gleicher Grund | |
| Tastatur-Fokus | Ring der Knöpfe darin (außen); das Banner selbst nimmt keinen Fokus | Tab erreicht „Erneut prüfen“, „Zur Status-Seite“, Schließen |
| Gesperrt | trifft nicht zu: Ein Hinweis ist da oder nicht | |
| Lädt | Beispiel „Verbindung wird geprüft“: Text und statisches Lade-Symbol, die Aktion zeigt ihren Zustand Lädt; Rückkehr geschieht von selbst | `aria-busy="true"` |

### 17. Fortschritt

Aufgabe: Zeigen, wie weit etwas ist (Modell laden, Dateien einlesen, Recherche). Träger: Füllung ≥ 3 : 1 gegen Spur **und** gegen Grund, und die Zahl als Text.

```css
:root {
  --progress-h: var(--space-2);
  --progress-radius: var(--radius-full);
  --progress-track: var(--surface-active);
  --progress-fill: var(--accent-solid);
  --progress-fill-done: var(--status-mark-success);
  --progress-fill-error: var(--status-mark-error);
  --progress-label-font: var(--text-xs);
  --progress-label-fg: var(--text);
  --progress-label-fg-secondary: var(--text-secondary);
  --progress-duration: var(--duration-standard);
}
```

Die Zahl („63 %“, Tabellenziffern) und der Schritt („Schicht 4 von 9“) stehen **neben** der Spur, nie auf ihr. Die Füllung wächst mit `transform: scaleX()` über `--progress-duration`; unter `prefers-reduced-motion` springt sie.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Spur `--progress-track`, Füllung `--progress-fill`, Zahl `--progress-label-fg` | `role="progressbar"` mit `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` |
| Maus drüber | trifft nicht zu: nicht bedienbar | |
| Gedrückt | trifft nicht zu, gleicher Grund | |
| Tastatur-Fokus | trifft nicht zu: nimmt keinen Fokus. Ein „Abbrechen“ daneben ist ein Knopf mit eigenem Ring | |
| Gesperrt | Pausiert: Füllung bleibt, `--disabled-opacity`, Wort „Pausiert“ | `aria-valuetext="Pausiert bei 63 Prozent"` |
| Lädt | Unbestimmt: leere Spur, Wort „Wird vorbereitet“ mit statischem Symbol (keine Dauerbewegung) | `aria-busy="true"`, ohne `aria-valuenow` |
| Fertig und Fehler (Zusatz) | Füllung `--progress-fill-done` mit Haken und Wort „Fertig“; `--progress-fill-error` mit Kreuz und Wort | `role="status"` meldet das Ergebnis |

### 18. Titelleiste

Aufgabe: Das Fenster bedienen (Ziehfläche, Name, Minimieren, Maximieren oder Wiederherstellen, Schließen). 40 px, **ohne Menüzeile**, Ebene 0 auf dem durchgehenden Grund. **Entscheidung zu Offene Frage 1:** In der Titelleiste steht nur der leise Name „LocalDesk“; die farbige Marke steht allein in der Leiste. Träger der Fensterknöpfe: Symbol (≥ 3 : 1, gehalten ≥ 4,5).

```css
:root {
  --titlebar-bg: transparent;
  --titlebar-name-fg: var(--text-secondary);
  --titlebar-name-font: var(--text-sm);
  --titlebar-name-weight: var(--weight-ui);
  --titlebar-btn-w: 46px;
  --titlebar-btn-h: var(--titlebar-h);
  --titlebar-btn-icon: var(--icon-s);
  --titlebar-btn-fg: var(--text-secondary);
  --titlebar-btn-fg-hover: var(--text);
  --titlebar-btn-bg-hover: var(--surface-hover);
  --titlebar-btn-bg-pressed: var(--surface-active);
  --titlebar-btn-fg-pressed: var(--text-on-tint);
  --titlebar-close-bg-hover: var(--status-error-solid);
  --titlebar-close-fg-hover: var(--status-solid-fg);
  --titlebar-close-bg-pressed: var(--status-error-fg);
  --titlebar-close-fg-pressed: var(--accent-solid-fg);
  --titlebar-close-ring-hover: var(--titlebar-close-fg-hover);
  --titlebar-close-ring-pressed: var(--titlebar-close-fg-pressed);
  --titlebar-inactive-opacity: var(--disabled-opacity);
}
```

Die Fensterknöpfe haben 46 × 40 px (Windows-Konvention, über `--hit-min`). Ziehfläche mit `-webkit-app-region: drag`, die Knöpfe mit `no-drag`; Doppelklick auf die Ziehfläche maximiert. Die Fensterknöpfe haben die Namen „Minimieren“, „Maximieren“ (oder „Wiederherstellen“) und „Schließen“. Für `titleBarOverlay` im Hauptprozess werden `color` und `symbolColor` aus `--titlebar-bg` und `--titlebar-btn-fg` zur Laufzeit aufgelöst (Umbau-Aufgabe, nicht Teil dieses Plans).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Name `--titlebar-name-fg`, Knöpfe `--titlebar-btn-fg`, Fläche `--titlebar-bg` | `<header>`; Knöpfe `<button aria-label>` |
| Maus drüber | Knopf: Fläche `--titlebar-btn-bg-hover`, Symbol `--titlebar-btn-fg-hover`; Schließen: `--titlebar-close-bg-hover` mit `--titlebar-close-fg-hover` | |
| Gedrückt | Knopf: Fläche `--titlebar-btn-bg-pressed`, Symbol `--titlebar-btn-fg-pressed`; Schließen: `--titlebar-close-bg-pressed` mit `--titlebar-close-fg-pressed` | |
| Tastatur-Fokus | Ring **innen** (der Knopf füllt die Leistenhöhe und sitzt am Fensterrand, außen ist kein Platz): `--focus-inset` (also `--focus-ring`); auf Schließen im Zustand Maus drüber oder Gedrückt in der Symbolfarbe der Fläche (`--titlebar-close-ring-hover`, `--titlebar-close-ring-pressed`) | Tab erreicht die drei Knöpfe; Alt+F4 und Strg+W bleiben |
| Gesperrt | Fenster ohne Fokus: Name und Symbole mit `--titlebar-inactive-opacity` | Kein `aria-disabled`; die Knöpfe bleiben bedienbar |
| Lädt | trifft nicht zu: Die Titelleiste zeigt keinen Ladezustand; Zustände gehören zur Seite und zum Fuß der Leiste | |

### Nachtrag (2026-11-20): Bausteine, die die Mocks brauchen

Die Mocks (Phase 7) bauen sechs Teile, die in den 18 Bausteinen oben fehlten. Der Nutzer hat am 2026-11-20 entschieden, sie nachzutragen („Ja, nachtragen“). **Maßstab ist, was die Mocks bauen** (`mocks/_shared/components*.css`, `parts*.js`); es entsteht **kein neuer Farbton und kein neuer Farbwert**, jedes Token verweist nur auf bestehende Aliase und Skalen. Reihenfolge und Zustände wie oben; `components-check.mjs` rechnet die Kontraste dieser Bausteine mit.

### 19. Kontrollkästchen (Zeile mit Haken)

Aufgabe: In einer Liste mehrere Einträge zum Mitnehmen wählen (Skills hinzufügen, Projekt- und Dateiauswahl). Abgrenzung zum **Schalter**: Der Schalter wirkt sofort (Einstellung); das Kontrollkästchen wählt aus, die Wirkung folgt erst mit einem Knopf (Hinzufügen, Speichern). Die **ganze Zeile** ist die Klickfläche: Kasten links, daneben Name (Gewicht 500) und eine erklärende Zeile in `--text-xs`. Träger: Kante des Kastens (aus) oder Füllung (an) ≥ 3 : 1, Haken ≥ 4,5 : 1 (gehalten), Text ≥ 4,5 : 1. Der Zustand hängt nicht an der Farbe: Nur der angehakte Kasten trägt das Haken-Zeichen.

```css
:root {
  --check-size: 20px;
  --check-mark-size: 14px;
  --check-radius: max(4px, calc(var(--radius-sm) / 2));
  --check-gap: var(--space-3);
  --check-row-radius: var(--radius-md);
  --check-row-bleed: var(--space-2);
  --check-edge: var(--field-edge);
  --check-edge-hover: var(--field-edge-hover);
  --check-edge-width: var(--field-edge-width);
  --check-bg-on: var(--btn-primary-bg);
  --check-bg-on-hover: var(--btn-primary-bg-hover);
  --check-mark: var(--btn-primary-fg);
  --check-row-bg-hover: var(--surface-hover);
  --check-fg: var(--text);
  --check-fg-secondary: var(--text-secondary);
}
```

Die Zeile reicht um `--check-row-bleed` über die Textkante hinaus (Fläche unter dem Zeiger), mindestens `--hit-min` hoch; der Kasten bleibt oben an der ersten Textzeile, wenn die Zeile mehrzeilig ist.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | aus: Kasten `--check-size` mit Innenkante `--check-edge` (Breite `--check-edge-width`), keine Füllung; an: Füllung `--check-bg-on` mit Haken `--check-mark` (`--check-mark-size`), keine Kante; Name `--check-fg`, Nebenzeile `--check-fg-secondary` | `role="checkbox"` auf der Zeile (`<button>`), `aria-checked`; Name und Nebenzeile sind der zugängliche Name |
| Maus drüber | Zeilenfläche `--check-row-bg-hover`; aus: Kante `--check-edge-hover`; an: Füllung `--check-bg-on-hover` | |
| Gedrückt | trifft nicht zu: Die Zeile schaltet beim Loslassen um und zeigt sofort den Haken; ein eigener Zwischenzustand brächte nichts | Leertaste und Klick schalten um |
| Tastatur-Fokus | Ring **innen** um die ganze Zeile: `--focus-inset` | Tab; Leertaste schaltet |
| Gesperrt | `--disabled-opacity`, `cursor: not-allowed`; der Grund steht als Text (zum Beispiel „Schon vorhanden“) | `aria-disabled="true"`, Grund per `aria-describedby` |
| Lädt | trifft nicht zu: Ein Haken ändert nur die Auswahl und löst nichts aus, das warten müsste. Wartet die Liste selbst, stehen Platzhalter-Zeilen (Baustein Listenzeile) | |

### 20. Listenzeile

Aufgabe: Ein Eintrag in der Liste links auf einer Seite mit „Liste und Detail“ (Vorlagen, Wissen, E-Mail, Skills, Dateibaum, Chats eines Projekts). Sie ist die **Tabellen-Zeile in einer Spalte**: gleiche Farben, gleiche Regeln, kein Gitter und keine Trennlinie. Höhe `--trow-h` (zweizeilig: Name, Nebenzeile), eng im Dateibaum `--hit-min`. Träger: Text ≥ 4,5 : 1.

**Farben: ausschließlich die `--trow-*` des Bausteins 13**, unverändert; hier stehen nur die Maße, die die Spalte braucht.

```css
:root {
  --lrow-h: var(--trow-h);
  --lrow-h-tight: var(--hit-min);
  --lrow-px: var(--trow-px);
  --lrow-gap: var(--space-3);
  --lrow-radius: var(--trow-radius);
  --lrow-name-weight: var(--weight-ui);
  --lrow-name-weight-unread: var(--weight-strong);
  --lrow-sub-font: var(--text-xs);
  --lrow-more-room: var(--space-6);
  --lrow-dot-size: 8px;
}
```

Aufbau: Symbol (optional), Name (`--text-sm`, Gewicht `--lrow-name-weight`) über der Nebenzeile (`--lrow-sub-font`, `--trow-fg-secondary`); beide werden mit Auslassungszeichen gekürzt, der volle Text steht im Tooltip. Rechts steht, was die Zeile hat: Zähler, Stand in Worten oder die Aktion „Mehr“ (Icon-Knopf, erscheint unter dem Zeiger oder bei Fokus in der Zeile; dafür reserviert die Zeile `--lrow-more-room` rechts). **Ungelesen** (E-Mail): Name im Gewicht `--lrow-name-weight-unread` **und** ein Punkt `--lrow-dot-size` in `--accent-solid` (Form und Gewicht tragen, nicht nur Farbe). Ein Fehlerzeichen an der Zeile zeigt Symbol und Wort („Fehlerhaft“).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Name `--trow-fg`, Nebenzeile und Symbole `--trow-fg-secondary`, keine Fläche; Höhe `--lrow-h` (eng `--lrow-h-tight`), Radius `--lrow-radius` | `<a>` oder `<button>` in einer Liste; die Klickfläche ist die ganze Zeile |
| Maus drüber | Fläche `--trow-bg-hover`; „Mehr“ erscheint | |
| Gedrückt | Fläche `--trow-bg-pressed`, **alle** Texte und Symbole `--trow-fg-selected` | löst beim Loslassen aus |
| Tastatur-Fokus | Ring **innen** (`--focus-inset`); „Mehr“ erscheint auch bei Fokus innerhalb der Zeile | Tab auf die Zeile; „Mehr“ bleibt per Tab erreichbar |
| Gesperrt | `--disabled-opacity`, Grund in der Zeile | `aria-disabled="true"` |
| Lädt | Platzhalter-Zeilen mit statischen Balken in `--surface-hover` | `aria-busy="true"` an der Liste |
| Gewählt (Zusatz) | Fläche `--trow-bg-selected`; **alle** Texte und Zeichen auf der Zeile in `--trow-fg-selected`: Name, Nebenzeile, Symbol, Punkt (`--lrow-dot-size`), Stern, Fehlerwort. Zustandsfarben (`--status-*`, `--accent-text`) gelten dort nicht; Form und Wort bleiben | `aria-current="true"` |

### 21. Reiter

Aufgabe: Zwischen gleichrangigen Ansichten desselben Orts wechseln (Kopf des Seitenpanels: Quellen, Projekt, Kontext, GPU). Ein Reiter ist ein **gewählter Eintrag einer Reihe**: Er hat dieselbe Gestalt wie die Leisten-Zeile (Fläche für den gewählten, keine Fläche sonst), nur kompakt und waagerecht. Träger: Text ≥ 4,5 : 1.

```css
:root {
  --tab-h: var(--hit-min);
  --tab-px: var(--space-2);
  --tab-gap: var(--space-1);
  --tab-row-gap: 2px;
  --tab-radius: var(--nav-radius);
  --tab-font: var(--nav-font);
  --tab-weight: var(--nav-weight);
  --tab-weight-selected: var(--nav-weight-current);
  --tab-fg: var(--nav-fg);
  --tab-fg-hover: var(--nav-fg-hover);
  --tab-bg-hover: var(--nav-bg-hover);
  --tab-bg-selected: var(--nav-bg-current);
  --tab-fg-selected: var(--nav-fg-current);
  --tab-pip-size: 7px;
}
```

Die Reiter stehen in einer Reihe (`--tab-row-gap`) und brechen nicht um; der Name wird nie gekürzt (kurze Wörter). Ein **Merkpunkt** (`--tab-pip-size`, in der Schriftfarbe des Reiters) zeigt, dass etwas auf dem Reiter Aufmerksamkeit braucht („Kontext“: wenig Platz übrig): gefüllt = Hinweis, Ring = Warnung; zusätzlich steht ein unsichtbarer Text für Hilfstechnik („Wenig Platz“). Der Punkt trägt die Form, nicht die Farbe.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Schrift `--tab-fg`, Gewicht `--tab-weight`, keine Fläche; gewählt: Fläche `--tab-bg-selected`, Schrift `--tab-fg-selected`, Gewicht `--tab-weight-selected` | `role="tablist"` mit `role="tab"`; `aria-selected`; der gewählte Reiter hat `tabindex="0"`, die anderen `-1` |
| Maus drüber | Fläche `--tab-bg-hover`, Schrift `--tab-fg-hover` | |
| Gedrückt | trifft nicht zu: Der Reiter wechselt beim Klick sofort, die Fläche des gewählten Reiters ist die Rückmeldung | |
| Tastatur-Fokus | Ring **außen** mit Abstand `--ring-offset`: `--focus-outline` | Pfeil links und rechts bewegen, Pos1 und Ende springen, Tab verlässt die Reihe; der Fokus folgt der Auswahl (automatische Aktivierung) |
| Gesperrt | `--disabled-opacity`, der Grund steht im Tooltip | `aria-disabled="true"` |
| Lädt | trifft nicht zu: Die Reiter stehen fest; wartet der Inhalt, zeigt der Inhalt Platzhalter | |

### 22. Regler

Aufgabe: Einen Wert in einem Bereich einstellen, wo Annähern genügt (Temperatur im Seitenpanel und in den Einstellungen). Der Wert steht **immer auch als Zahl** (Tabellenziffern) neben der Beschriftung; sonst wäre die Stellung nur Lage. Daneben steht „Auf Standard zurücksetzen“ als leiser Knopf. Träger: Füllung gegen Spur ≥ 3 : 1, Daumen gegen Grund ≥ 3 : 1.

```css
:root {
  --slider-h: var(--hit-min);
  --slider-track-h: var(--progress-h);
  --slider-track-radius: var(--progress-radius);
  --slider-track: var(--progress-track);
  --slider-fill: var(--progress-fill);
  --slider-thumb-size: var(--switch-thumb);
  --slider-thumb: var(--accent-solid);
  --slider-thumb-halo: var(--surface-raised);
  --slider-halo-width: var(--ring-width);
}
```

Spur und Füllung sind der Fortschrittsbalken (Baustein 17). Der Daumen ist ein Kreis `--slider-thumb-size` in `--slider-thumb` mit einem Saum `--slider-halo-width` in `--slider-thumb-halo`, der ihn von der Füllung trennt (Lücke zeigt den Grund). Die Klickfläche ist die ganze Zeile `--slider-h`.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Spur `--slider-track`, Füllung `--slider-fill` bis zum Wert, Daumen `--slider-thumb` mit Saum | Der Daumen hat `role="slider"`, `tabindex="0"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (und `aria-valuetext`, wenn die Zahl allein nichts sagt) |
| Maus drüber | Zeiger `pointer` auf dem Daumen; die Fläche bleibt gleich (die Form trägt) | |
| Gedrückt | trifft nicht zu: Beim Ziehen folgt der Daumen dem Zeiger; ein eigener Zustand brächte nichts | Ziehen und Klick auf die Spur setzen den Wert |
| Tastatur-Fokus | Ring **außen** um den Daumen, Abstand `--ring-offset`: `--focus-outline` | Pfeile ändern in kleinen Schritten, Bild auf und Bild ab in großen, Pos1 und Ende springen an die Enden |
| Gesperrt | `--disabled-opacity`; der Grund steht als Text unter dem Regler | `aria-disabled="true"` |
| Lädt | trifft nicht zu: Der Wert liegt vor dem Zeigen fest; die Seite zeigt sonst Platzhalter | |

### 23. Popover

Aufgabe: Eine kurze Liste von Zielen an einem Auslöser zeigen, der selbst zu klein ist, sie zu tragen. In den Mocks: die eingeklappte Leiste, in der „Projekte“ und „Letzte Chats“ zu einem Symbol geschrumpft sind. Ein Popover ist ein **Menü (Baustein 9) ohne eigene Fläche**: Es erbt Fläche, Radius, Schatten und Zeilen des Menüs und fügt nur Platzierung und Breite hinzu. Ebene 4. Träger: Text ≥ 4,5 : 1.

```css
:root {
  --popover-bg: var(--menu-bg);
  --popover-radius: var(--menu-radius);
  --popover-padding: var(--menu-padding);
  --popover-shadow: var(--menu-shadow);
  --popover-w: var(--menu-w-sub);
  --popover-gap: var(--space-2);
  --popover-edge: var(--space-2);
  --popover-top-min: calc(var(--titlebar-h) + var(--space-2));
  --popover-label-fg: var(--text-secondary);
  --popover-label-font: var(--menu-group-label-font);
}
```

**Platzierung:** rechts neben dem Auslöser im Abstand `--popover-gap`, oben bündig mit ihm; die Position wird ins Fenster geschoben mit mindestens `--popover-edge` Rand (oben `--popover-top-min`, unter der Titelleiste). Eine Gruppenüberschrift (`--popover-label-font`, Gewicht 600, `--popover-label-fg`) benennt die Liste; die Zeilen sind die des Menüs, am Ende „Alle anzeigen“ mit Pfeil, getrennt durch Abstand statt Linie.

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--popover-bg`, Zeilen wie im Menü (`--menu-row-*`) | `role="menu"` mit `aria-label` (der Name der Liste); Auslöser mit `aria-haspopup="menu"` und `aria-expanded` |
| Maus drüber | Zeile: `--menu-row-bg-hover` wie im Menü | |
| Gedrückt | Zeile: `--menu-row-bg-pressed`, Texte `--menu-row-fg-on-tint` wie im Menü | |
| Tastatur-Fokus | Ring **innen** auf der Zeile: `--focus-inset` | Wie das Menü: Pfeile bewegen, Enter öffnet, Esc schließt und gibt den Fokus dem Auslöser zurück |
| Gesperrt | trifft nicht zu: Ein Popover öffnet nur, wenn der Auslöser bedienbar ist; eine gesperrte Zeile folgt dem Menü (`aria-disabled`, Grund in der Nebenzeile) | |
| Lädt | trifft nicht zu: Die Liste liegt beim Öffnen vor (sie steht schon in der Leiste); fehlt sie, bleibt der Auslöser gesperrt mit Grund | |

Ein Popover öffnet sich beim Klick, **nicht** beim Überfahren (Touch- und Tastaturnutzer hätten sonst keinen Weg); es schließt bei Klick daneben, Esc und Wahl.

### 24. Status-Popup

Aufgabe: Den Zustand eines Dienstes ansehen, ohne die Seite zu wechseln (Modellstatus am Fuß der Leiste: Grafikspeicher, geladene Modelle, Fehler). Es ist **kein Menü** (keine Zeilen zum Wählen), sondern ein Fenster mit Titel und Inhalt, darum ein eigener Baustein, auch wenn es Fläche, Radius und Schatten vom Menü erbt. Es **sperrt nichts**: kein Vorhang, der Rest bleibt bedienbar. Ebene 4. Träger: Text ≥ 4,5 : 1.

```css
:root {
  --popup-bg: var(--menu-bg);
  --popup-radius: var(--menu-radius);
  --popup-padding: var(--menu-padding);
  --popup-shadow: var(--menu-shadow);
  --popup-w: var(--menu-w-sub);
  --popup-gap: var(--space-2);
  --popup-edge: var(--space-2);
  --popup-title-font: var(--text-sm);
  --popup-title-weight: var(--weight-strong);
  --popup-fg: var(--text);
  --popup-note-fg: var(--menu-row-fg-secondary);
}
```

Aufbau: Kopf mit Titel („Modellstatus“, `--popup-title-*`) links und „Schließen“ (Icon-Knopf) rechts; darunter Gruppen aus Überschrift und Text (`--popup-note-fg`), Zahlen mit Tabellenziffern, am Ende ein Knopf zur ganzen Seite („Ganze Seite“; bei Fehler „Status ansehen“, bei fehlendem Modell „Modell herunterladen“ als Primär-Knopf). **Platzierung:** bei ausgeklappter Leiste **über** dem Auslöser, links bündig (Abstand `--popup-gap`); bei eingeklappter Leiste rechts daneben, unten bündig; immer mit mindestens `--popup-edge` Rand im Fenster. Der Inhalt zeigt den Fehler als schlichten Satz mit Ursache und nächstem Schritt (Stimme).

| Zustand | Aussehen und Tokens | Bedienung |
|---|---|---|
| Normal | Fläche `--popup-bg`, Titel `--popup-fg`, Text `--popup-note-fg`, Knöpfe nach Baustein 1 und 2 | `role="dialog"` (nicht modal) mit `aria-labelledby` auf den Titel; Auslöser mit `aria-haspopup="dialog"` und `aria-expanded` |
| Maus drüber | trifft nicht zu: Das Popup selbst reagiert nicht; seine Knöpfe folgen ihren Bausteinen | |
| Gedrückt | trifft nicht zu: nicht bedienbar als Ganzes; die Knöpfe folgen ihren Bausteinen | |
| Tastatur-Fokus | Ringe der Knöpfe („Schließen“, „Ganze Seite“) nach Baustein 1 und 2 | Esc schließt und gibt den Fokus dem Auslöser zurück; „Schließen“ ist der erste Knopf in der Tab-Reihenfolge des Popups |
| Gesperrt | trifft nicht zu: Das Popup ist immer lesbar; ist der Dienst nicht erreichbar, steht das als Text darin | |
| Lädt | trifft nicht zu: Die Werte stehen beim Öffnen fest; fehlen sie noch, zeigt der Inhalt Platzhalter-Balken statt Zahlen (`aria-busy="true"`) | |

### Kontrast der Bausteine

Gerechnet von `.design-foundations/previews/_src/components-check.mjs` (liest die Token-Blöcke dieser Datei, löst jede `var()`-Kette bis zur Palettenstufe auf, rechnet WCAG-2.x-Kontrast). **456 Paare, hell und dunkel; 0 unter dem Ziel.** Hex-Werte in §Tokens und §Components: 0. Baustein-Tokens: 355, jedes verweist nur auf Aliase; jede Kette löst in beiden Schemata auf.

| Art | Ziel | Paare | schlechtester Wert Dunkel | schlechtester Wert Hell |
|---|---|---|---|---|
| Ring | 3 : 1 | 37 | 4,54 (Fokusring: `--focus-ring` auf `--surface-active-pressed`) | 3,42 (Fokusring: `--focus-ring` auf `--surface-active-pressed`) |
| Text | 4,5 : 1 | 109 | 5,11 (Knopf Gefährlich Maus drüber: `--btn-danger-fg-hover` auf `--btn-danger-bg-hover`) | 4,84 (Menü Nebenzeile Maus drüber: `--menu-row-fg-secondary` auf `--menu-row-bg-hover`) |
| Fläche | 3 : 1 | 7 | 6,32 (Kontrollkästchen an: Füllung gegen glow: `--check-bg-on` auf `--glow`) | 5,37 (Kontrollkästchen an: Füllung gegen glow: `--check-bg-on` auf `--glow`) |
| Symbol | 3 oder 4,5 : 1 | 39 | 3,82 (Werkzeug Symbol error: `--tool-mark-error` auf `--glow`) | 4,93 (Menü Haken Maus drüber: `--menu-check` auf `--menu-row-bg-hover`) |
| Kante | 3 : 1 | 15 | 3,05 (Feldkante gegen glow: `--field-edge` auf `--glow`) | 3,08 (Feldkante gegen glow: `--field-edge` auf `--glow`) |
| Spur | 3 : 1 | 10 | 3,05 (Schalter aus: Spur gegen glow: `--switch-track-off` auf `--glow`) | 3,08 (Schalter aus: Spur gegen glow: `--switch-track-off` auf `--glow`) |
| Daumen | 3 : 1 | 6 | 3,36 (Schalter aus: Daumen gegen Spur: `--switch-thumb-off` auf `--switch-track-off`) | 3,43 (Schalter aus: Daumen gegen Spur: `--switch-thumb-off` auf `--switch-track-off`) |
| Füllung | 3 : 1 | 5 | 3,42 (Fortschritt Fehler gegen Spur: `--progress-fill-error` auf `--progress-track`) | 4,17 (Fortschritt fertig gegen Spur: `--progress-fill-done` auf `--progress-track`) |

**Fokusring (DW-4.3) gegen jede Fläche.** Ziel 3 : 1 (WCAG 1.4.11 und 2.4.13).

| Fläche (hinter oder unter dem Ring) | Dunkel | Hell |
|---|---|---|
| `--background` | 9,19 | 5,78 |
| `--background-deep` | 9,19 | 5,80 |
| `--glow` | 7,17 | 5,37 |
| `--surface` | 8,65 | 5,99 |
| `--surface-raised` | 7,87 | 5,99 |
| `--surface-hover` | 7,87 | 5,37 |
| `--surface-hover-strong` | 7,17 | 4,93 |
| `--surface-voice` | 7,17 | 4,93 |
| `--accent-bg-subtle` | 7,87 | 5,37 |
| `--surface-active` | 6,40 | 4,49 |
| `--surface-active-hover` | 5,56 | 3,99 |
| `--surface-active-pressed` | 4,54 | 3,42 |
| `--status-error-bg` | 7,95 | 5,34 |
| `--status-success-bg` | 7,76 | 5,44 |
| `--status-warning-bg` | 7,85 | 5,40 |
| `--status-info-bg` | 7,80 | 5,40 |

**Ring für Vollton-Flächen** (`--focus-ring-solid`, außen mit Lücke) gegen jeden Grund hinter der Lücke, und die Ringe der Fensterknöpfe gegen ihre eigenen Flächen:

| Fläche | Dunkel | Hell |
|---|---|---|
| `--background` (Ring `--focus-ring-solid`) | 15,18 | 12,91 |
| `--background-deep` (Ring `--focus-ring-solid`) | 15,17 | 12,95 |
| `--glow` (Ring `--focus-ring-solid`) | 11,83 | 12,00 |
| `--surface` (Ring `--focus-ring-solid`) | 14,28 | 13,38 |
| `--surface-raised` (Ring `--focus-ring-solid`) | 13,00 | 13,38 |
| `--surface-hover` (Ring `--focus-ring-solid`) | 13,00 | 12,00 |
| `--surface-hover-strong` (Ring `--focus-ring-solid`) | 11,83 | 11,01 |
| `--surface-voice` (Ring `--focus-ring-solid`) | 11,83 | 11,01 |
| `--accent-bg-subtle` (Ring `--focus-ring-solid`) | 13,00 | 12,00 |
| `--surface-active` (Ring `--focus-ring-solid`) | 10,57 | 10,03 |
| `--surface-active-hover` (Ring `--focus-ring-solid`) | 9,18 | 8,91 |
| `--surface-active-pressed` (Ring `--focus-ring-solid`) | 7,50 | 7,63 |
| `--status-error-bg` (Ring `--focus-ring-solid`) | 13,12 | 11,92 |
| `--status-success-bg` (Ring `--focus-ring-solid`) | 12,82 | 12,16 |
| `--status-warning-bg` (Ring `--focus-ring-solid`) | 12,97 | 12,07 |
| `--status-info-bg` (Ring `--focus-ring-solid`) | 12,88 | 12,06 |
| Fensterknopf: `--focus-ring` auf `--titlebar-btn-bg-hover` | 7,87 | 5,37 |
| Fensterknopf: `--focus-ring` auf `--titlebar-btn-bg-pressed` | 6,40 | 4,49 |
| Fensterknopf: `--focus-ring` auf `--glow` | 7,17 | 5,37 |
| Schließen, Maus drüber: `--titlebar-close-ring-hover` auf `--titlebar-close-bg-hover` | 5,11 | 5,11 |
| Schließen, gedrückt: `--titlebar-close-ring-pressed` auf `--titlebar-close-bg-pressed` | 9,29 | 6,21 |

Zur Unterscheidung von der Füllung (Information, kein Paar, weil nicht benachbart): `--focus-ring-solid` gegen `--accent-solid` 1,87 (Dunkel), 2,23 (Hell); `--focus-ring` gegen `--accent-solid` 1,13 und 1,00.

Der Vollton (`--accent-solid`) steht **nicht** in der Tabelle, weil nichts, was einen Ring trägt, auf ihm liegt: Der Ring des Senden-Knopfs liegt außen mit 2 px Lücke, und die Lücke zeigt den Grund (Zeilen oben). Direkt auf dem Vollton erreicht der Ring nur 1,13 (Dunkel) und 1,00 (Hell); darum gilt die Regel „Ring außen auf dem Vollton“.

**Verbotene Kombinationen** (zur Kontrolle gerechnet; sie dürfen in keiner Spec vorkommen):

| Paar | Dunkel | Hell | Ziel |
|---|---|---|---|
| `--text-secondary` auf `--surface-active` | 6,49 | 4,41 | 4,50 : 1 |
| `--accent-text` auf `--surface-active` | 6,40 | 4,49 | 4,50 : 1 |
| `--text-secondary` auf `--surface-active-hover` | 5,64 | 3,92 | 4,50 : 1 |
| `--status-mark-warning` auf `--surface-active` | 6,46 | 4,42 | 3,00 : 1 |
| `--status-mark-success` auf `--surface-active` | 6,95 | 4,17 | 3,00 : 1 |
| `--control-edge` auf `--surface-active` | 2,73 | 2,57 | 3,00 : 1 |
| `--focus-ring` auf `--accent-solid` | 1,13 | 1,00 | 3,00 : 1 |

## Daten

**Stand Phase 6 (Fassung 2 nach der Prüfung), vom Nutzer bestätigt (Abnahme der Mocks 2026-11-20).** Dieser Abschnitt **erweitert** die gesperrten Werte; er ändert keinen. **Es gibt keinen neuen Farbton, keinen neuen Farbwert und keinen neuen Lauf von `palette.mjs`:** Die Daten-Palette benutzt nur `--text` und `--accent-solid`, beide gesperrt, dazu Schraffur, Lücke, Nummer und Reihenfolge. Die Specs der Diagramme, Messbalken und Tabellen stehen in `JOURNEY.md` §Page specs, Abschnitt „Zahlen und Diagramme (Phase 6)“ (`DA-0` bis `DA-10`).

### Was die gesperrten Regeln hergeben

Blau ist kein Akzent (also kein blauer Balken), die Meldefarben bedeuten Zustände (also keine Kategorien). Bleiben die Stufen des Bernsteins und des warmen Neutrals. Gegen die sechs Gründe, auf denen Daten stehen (`--background`, `--background-deep`, `--glow`, `--surface`, `--surface-raised`, `--surface-hover`), halten in Hell nur vier der 24 Stufen 3 : 1, in Dunkel acht; sie liegen in nur zwei bis drei Helligkeitsstufen. **Zwölf in der Helligkeit unterscheidbare Farben gibt es also nicht**, und ein neuer Lauf änderte daran nichts (zwischen 3 : 1 und dem Text ist in Hell Platz für etwa drei Stufen). Jenseits von acht Kategorien trägt Farbe in keiner Palette mehr die Identität (Knaflic 2015; Wong 2011).

Darum gilt: **Die Farbe trennt Nachbarn nur zum Teil; sie benennt nie.** Es gibt **zwei Farben** (Pol = `--text`, Akzent = `--accent-solid`) und eine **Schraffur** des Akzents. Daraus entstehen **drei Aussehen**: Pol voll, Akzent voll, Akzent schraffiert. Der Rest ist Beschriftung und Nummer: jede Kategorie trägt ihren Namen und ihren Platz (Reihenfolge, im Kreis zusätzlich eine Nummer am Stück).

### Tokens

Alles Alias-Stufe: Die Werte verweisen nur auf Aliase, nie auf Palettenstufen und nie auf einen Farbwert.

```css
:root {
  /* Zwei Farben. Pol = der Text-Ton (in Hell der dunkelste, in Dunkel der hellste); Akzent = der Vollton. */
  --data-pole: var(--text);
  --data-accent: var(--accent-solid);

  /* Schraffur: senkrechte Streifen des Akzents, halb Streifen, halb Grund (kein Winkel: „Keine zweite Schräge“). */
  --data-hatch-on: 3px;
  --data-hatch-off: 3px;
  --data-hatch: repeating-linear-gradient(90deg, var(--accent-solid) 0 var(--data-hatch-on), transparent var(--data-hatch-on) calc(var(--data-hatch-on) + var(--data-hatch-off)));

  /* Zwölf Plätze: Folge Pol voll, Akzent voll, Akzent schraffiert, wiederholt. Schluss eines Rings: Regel unten. */
  --data-1: var(--data-pole);   --data-2: var(--data-accent);   --data-3: var(--data-hatch);
  --data-4: var(--data-pole);   --data-5: var(--data-accent);   --data-6: var(--data-hatch);
  --data-7: var(--data-pole);   --data-8: var(--data-accent);   --data-9: var(--data-hatch);
  --data-10: var(--data-pole);  --data-11: var(--data-accent);  --data-12: var(--data-hatch);

  /* Rollen */
  --data-bar: var(--data-accent);          /* Balken, Linie, Punkte: eine Reihe, ein Ton */
  --data-line: var(--data-accent);
  --data-primary: var(--data-accent);      /* erster Teil einer Zweiteilung (Ollama, Grafikkarte) */
  --data-secondary: var(--data-hatch);     /* zweiter Teil (andere Programme, CPU), auch die Teile des Kontexts */
  --data-outline: var(--accent-solid);     /* Umriss eines schraffierten Stücks */
  --data-fill: var(--accent-solid);        /* Füllung eines Messbalkens, gleich --progress-fill */
  --data-track: var(--surface-active);     /* Spur, gleich --progress-track */
  --data-zero: var(--text-secondary);      /* Nulllinie, Reservemarke, Leitlinie */
  --data-label: var(--text);
  --data-label-quiet: var(--text-secondary);

  /* Maße */
  --data-gap: 2px;                         /* Lücke zwischen Teilen; der Grund scheint durch */
  --data-outline-w: 1.5px;
  --data-meter-h: var(--space-2);          /* Messbalken, gleich --progress-h */
  --data-bar-h: 18px;                      /* Balkendicke bei bis zu 12 Werten */
  --data-bar-h-dense: 14px;                /* ab 13 Werten */
  --data-row-pitch: 32px;                  /* Zeilenabstand der Balken bis 12 Werten */
  --data-row-pitch-dense: 24px;            /* ab 13 Werten */
  --data-row-pitch-wrapped: 36px;          /* Zeile, deren Name auf zwei Zeilen umbricht */
  --data-line-w: 2px;
  --data-point-r: 4px;
  --data-estimate-edge: 6px;               /* gestricheltes Ende eines geschätzten Balkens, innerhalb seiner Länge */
}
```

### Regeln der Palette

1. **Platz, Aussehen, zweiter Träger.** Platz k hat das Aussehen k mod 3 der Folge Pol voll, Akzent voll, Akzent schraffiert. Der erste Träger ist die Beschriftung (der Name steht an oder neben dem Stück), der zweite die Reihenfolge: im Kreis im Uhrzeigersinn ab 12 Uhr mit Nummer am Stück und in der Liste, in Balken von oben nach unten, in Teilen einer Leiste von links nach rechts.
2. **Wenn dieselbe Farbe aneinanderstößt.** Es gibt nur zwei Farben; Nachbarn mit derselben Farbe (Akzent voll neben Akzent schraffiert) trennen **Lücke** (`--data-gap`), **Schraffur** (andere mittlere Helligkeit, siehe Tabelle), **Umriss** des schraffierten Stücks und die **Nummer**. Voll neben schraffiert unterscheidet sich in der mittleren Helligkeit; das ist der Beitrag der Schraffur.
3. **Der Schluss eines Rings.** Beim Kreis grenzt das letzte Stück an das erste. Hätte das letzte Stück dasselbe Aussehen wie das erste (bei 4, 7 und 10 Stücken: Pol voll), nimmt es das Aussehen, das keinem seiner beiden Nachbarn gehört: Akzent voll. Gerechnet für 2 bis 12 Stücke (Tabelle unten).
4. **Nachbarn unterscheiden sich in der mittleren Leuchtdichte um mindestens 1,3 : 1** (eigenes Maß dieser DNA; WCAG kennt dafür keinen Wert). Die mittlere Leuchtdichte einer Schraffur ist der Mittelwert aus Streifenfarbe und dem, was durch die Lücken scheint (Grund oder Spur); gerechnet gegen jeden dieser sieben Untergründe, der schlechteste Wert zählt.
5. **Jede Tinte hält ≥ 3 : 1 gegen jeden der sechs Gründe**, in beiden Schemata (WCAG 1.4.11): Pol, Akzent, die Streifen und der Umriss. Text im Diagramm nimmt `--data-label` oder `--data-label-quiet` (≥ 4,5 : 1).
6. **Ehrliche Grenze der Schraffur.** In Hell ist die *mittlere* Leuchtdichte eines schraffierten Stücks hoch (der Grund scheint durch); gegen den Grund hält es nur über Streifen und Umriss, nicht über die Fläche. Darum trägt jedes schraffierte Stück einen Umriss von `--data-outline-w` in `--data-outline` und eine Lücke.
7. **Mengen sind nie nur Farbe.** Größe liegt in Länge oder Lage (Munzner 2014), nie im Ton. Negativ ist kein eigenes Aussehen: Es zeigt sich durch die Lage unter der Nulllinie und das Minuszeichen.
8. **Eine Hervorhebung je Bild** (Knaflic 2015): In einem Diagramm trägt höchstens ein Ding den Akzent mehr als die anderen.
9. **Fehlend erzeugt nichts, Schätzung bleibt Schätzung.** Siehe `JOURNEY.md` `DA-0` Regel 8. Das Kennzeichen eines ganz geschätzten Balkens ist ein gestrichelter Rand (`--data-estimate-edge`, innerhalb seiner Länge, nie darüber hinaus) **oder** die Schraffur (Entscheidung des Nutzers vom 2026-11-16); „ca.“ vor jeder Zahl und das Wort „geschätzt“ am Kopf stehen immer. Der Messbalken des Kontexts trägt den gestrichelten Rand, seine Teil-Balken die Schraffur. Die Schraffur sind senkrechte Streifen (entschieden: keine Punkte).
10. **Linien.** Es gibt keine Rasterlinien und keine Achsenlinien. Ausnahmen, alle 1 px in `--data-zero`: die Nulllinie, wenn Werte darunter liegen oder die Achse bei null beginnt; die Reservemarke des Kontexts; die kurze Leitlinie von der Nummer eines Kreisstücks unter 2 %. Sie trennen keinen Inhalt; sie sind Bezugsmarken der Daten (Tufte 1983) und damit keine „Trennlinien“ im Sinn von „Nie“.
11. **Erzwungene Farben** (`forced-colors: active`): Marken nehmen `CanvasText`, Spuren `GrayText`, Schraffur wird zu Streifen in `CanvasText`; Beschriftung und Reihenfolge tragen weiter.
12. **Bewegung.** Balken und Füllungen wachsen einmal von null (`transform: scale`), wie unter „Bewegung“; unter `prefers-reduced-motion` stehen sie sofort.

### Kontrast der Daten-Palette

Gerechnet von `.design-foundations/previews/_src/daten-check.mjs` (liest die Token-Blöcke dieser Datei, löst jede `var()`-Kette auf, WCAG-2.x-Kontrast; prüft außerdem, dass §Daten keinen Farbwert, keine Mischung und keine Palettenstufe enthält). **83 Paare, hell und dunkel; 0 unter dem Ziel.** Sechs Gründe: `--background`, `--background-deep`, `--glow`, `--surface`, `--surface-raised`, `--surface-hover`; als siebter Untergrund der Schraffur die Spur `--data-track`.

| Art | Ziel | Paare | schlechtester Wert Dunkel | schlechtester Wert Hell |
|---|---|---|---|---|
| Tinte gegen Grund | 3,0 : 1 | 12 | 6,32 (Akzent auf glow) | 5,37 (Akzent auf glow) |
| Rolle gegen Grund | 3,0 : 1 | 36 | 6,32 (--data-bar auf glow) | 5,28 (--data-zero auf glow) |
| Beschriftung gegen Grund | 4,5 : 1 | 12 | 7,27 (--data-label-quiet auf glow) | 5,28 (--data-label-quiet auf glow) |
| Füllung gegen Spur | 3,0 : 1 | 1 | 5,65 (--data-fill auf --data-track) | 4,49 (--data-fill auf --data-track) |
| Streifen gegen Spur | 3,0 : 1 | 1 | 5,65 (--data-accent auf --data-track) | 4,49 (--data-accent auf --data-track) |
| Nachbarn (Paar) | 1,3 : 1 | 3 | 1,69 (Akzent voll – Akzent schraffiert auf data-track) | 2,23 (Pol voll – Akzent voll auf background) |
| Zweiteilung (primary / secondary) | 1,3 : 1 | 7 | 1,69 (A–H auf data-track) | 2,75 (A–H auf data-track) |
| Nachbarn im Ring | 1,3 : 1 | 11 | 1,69 (n=3 auf 2-3 auf data-track) | 2,23 (n=2 auf 1-2 auf background) |

**Die zwei Farben** (relative Leuchtdichte; Kontrast gegen den schwächsten der sechs Gründe):

| Farbe | Hell: Leuchtdichte | Hell: schwächster Grund | Dunkel: Leuchtdichte | Dunkel: schwächster Grund |
|---|---|---|---|---|
| Pol (`--data-pole`) | 0,027 | 12,00 : 1 | 0,804 | 11,83 : 1 |
| Akzent (`--data-accent`) | 0,122 | 5,37 : 1 | 0,406 | 6,32 : 1 |

**Nachbarn nach mittlerer Leuchtdichte** (Verhältnis; bei der Schraffur der Mittelwert aus Streifen und Untergrund, der schlechteste der sieben Untergründe; Ziel ≥ 1,3 : 1):

| Paar | Hell | Dunkel |
|---|---|---|
| Pol voll – Akzent voll | 2,23 : 1 | 1,87 : 1 |
| Akzent voll – Akzent schraffiert | 2,75 : 1 | 1,69 : 1 |
| Akzent schraffiert – Pol voll | 6,14 : 1 | 3,17 : 1 |

**Ehrliche Grenze der Schraffur** (Regel 6): Ihre *mittlere* Leuchtdichte hebt sich in Hell nur um 1,69 : 1 vom Grund ab (Dunkel 3,68 : 1). Die Fläche allein trägt das nicht; Streifen und Umriss (≥ 5,37 : 1) tragen es.

**Ringe mit 2 bis 12 Stücken.** Aussehen des letzten Stücks nach Regel 3: 2: Akzent voll, 3: Akzent schraffiert, 4: Akzent voll, 5: Akzent voll, 6: Akzent schraffiert, 7: Akzent voll, 8: Akzent voll, 9: Akzent schraffiert, 10: Akzent voll, 11: Akzent voll, 12: Akzent schraffiert. Alle Nachbarpaare, auch das Paar letztes und erstes, halten ≥ 1,3 : 1 (schlechtester Wert Dunkel 1,69, Hell 2,23).

**Sehschwäche-Simulation** (Machado, Oliveira und Fernandes 2009, Schweregrad 1,0). Abstand der Nachbarn in OKLab × 100, bei der Schraffur die mittlere Farbe auf `--surface`; ab etwa 2 ist ein Unterschied sichtbar:

| Schema | Sicht | Pol – Akzent | Akzent – schraffiert | schraffiert – Pol |
|---|---|---|---|---|
| Hell | normal | 21,2 | 32,6 | 52,2 |
| Hell | Protanopie | 18,6 | 34,4 | 51,7 |
| Hell | Deuteranopie | 21,3 | 32,2 | 52,2 |
| Hell | Tritanopie | 21,8 | 32,2 | 52,0 |
| Dunkel | normal | 21,6 | 15,3 | 34,4 |
| Dunkel | Protanopie | 24,2 | 14,4 | 37,2 |
| Dunkel | Deuteranopie | 20,1 | 15,4 | 33,4 |
| Dunkel | Tritanopie | 21,8 | 15,5 | 34,3 |

Kleinster Nachbarabstand in allen Sichten: 14,4. Die Nachbarn bleiben in jeder Sicht unterscheidbar; die Identität trägt trotzdem nie die Farbe (Regel 1).

## Offene Fragen

Geschlossen am 2026-11-15 in Phase 4 (vom Nutzer bestätigt): Wiederholung der Marke in Titelleiste und Leiste (nur der leise Name in der Titelleiste, die farbige Marke im Kopf der Leiste).

Geschlossen mit der Sperre am 2026-11-15 (vom Nutzer angenommen, siehe Kopf): Abstand des Bernsteins zum früheren „Werkbank“-Orange (`#b8501a` auf neutralem Graphit mit Mono-Schrift; hier warme Flächen, kühler blauer Gegenpol, keine Mono-Schrift, keine Rahmen) · dunkler, leicht bräunlicher Vollton in Hell (`#825936`) · die eine Kante am Eingabefeld (Folge von „Bedienelemente mindestens 3 : 1“; sie umschließt ein Bedienelement, keinen Inhalt). Eine spätere Änderung des Farbtons ist ein neuer Lauf von `palette.mjs` und eine neue Sperre.

Noch offen:

2. **App-Symbol.** Es folgt der Farbe; der Bernstein liegt nahe am heutigen Orange. Anpassung erst nach der Sperre, im Code-Plan.
3. **Daten-Palette** (bis zu zwölf Kategorien): beantwortet in Phase 6 (§Daten), ohne neuen Farbton und ohne neuen Lauf von `palette.mjs`; nur `--text` und `--accent-solid`, dazu Schraffur, Lücke und Nummer. Vom Nutzer bestätigt (Abnahme der Mocks 2026-11-20).
4. **Design „wie Windows“** folgt dem System zwischen den zwei Schemata hier; ein drittes Schema gibt es nicht.
