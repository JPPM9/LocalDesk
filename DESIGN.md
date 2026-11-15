# Design: Späte Stunde

**Datum:** 2026-11-15 · **Status:** confirmed – gesperrt vom Nutzer am 2026-11-15
**Archetyp:** Creator, mit Sage als Beiklang · **Register:** ruhige Struktur · ausdrucksvoll an: Startseite „Dein PC“, Antwort mit Quellen
**Grounding:** Saul Bass’ Filmvorspann-Collagen: versetzte, sich überlappende Flächen + die Relief-Schummerung der Schweizer Landeskarte: schräges Licht, kühler Schatten, Tiefe ohne Linien
**DNA:** Cinematic Dark + Schrift aus Swiss (Inter, Vorgabe) + kühle Tiefe aus Organic / Natural („Blaue Stunde“) · **Dominante Achse:** Farbe und Licht
**Composition:** <dealt> (Cinematic Dark + Fractured Grid; Hand 5 aus `scripts/dealer.mjs --project localdesk --date 2026-11-14 --reroll 1`, Seed `localdesk|2026-11-14|1`). Die Hand steht auf Regler 9 von 10. **Ausgeführt wird sie gedämpft, etwa bei 4 bis 5:** Die Struktur ist ruhig (Leiste, Spalte und Listen sitzen im Raster), versetzt sind nur die schwebenden Flächen in Chat und Startseite. Höher dreht der Regler allein auf der Startseite „Dein PC“. Grund: Register „Produkt“, tägliche Arbeit.
**Deal:** Der erste Deal (`--reroll 0`) wurde verworfen, weil er „Terminal / Mono-Core“ (Mono-Schrift überall) und „Neo-Brutalist“ (dicke Rahmen, harte Kanten) enthielt; beides steht gegen den Geschmack des Nutzers. Es gilt der zweite Deal (`--reroll 1`). Beide stehen in `.design-foundations/used-dna.json`.
**Pins:** Schrift Inter (Vorgabe) · Fließtext mindestens 15 px (Vorgabe) · Dunkel zuerst, Hell vollwertig (Vorgabe) · Synthese des Nutzers vom 2026-11-15 aus Kandidat 5 „Späte Lampe“ und Kandidat 1 „Blaue Stunde“: Bernstein führt, blaue Tiefe; kein Kasten um den Inhalt; versetzte Flächen und Licht; Quellen als Fußnoten; schräger Ton-Schnitt · Getauscht gegenüber Hand 5: Signatur (jetzt der Ton-Schnitt aus 1), zweiter Farbton 230° nur für Tiefe und Schatten
**Entscheidungen des Nutzers bei der Sperre (2026-11-15):** Die Farbe gilt so, wie sie im Vorschau-Blatt zu sehen war: Bernstein `#e69a58` in Dunkel trotz der Nähe zum früheren „Werkbank“-Orange, dunkler Bernstein `#825936` als Vollton in Hell. Die eine feine Kante am Eingabefeld ist angenommen („Ja, passt“). Sperre: „Ja, sperren“.

<!-- Gehört zu JOURNEY.md (Aufbau, Abläufe, Seiten). Dieses Dokument regelt das Aussehen. Bausteine, Stimme und Daten-Palette folgen in den Phasen 4 bis 6. -->

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
3. **Versatz der schwebenden Flächen:** Die eigene Nachricht ragt 36 px nach rechts über die Lesespalte, ein Diagramm 36 px nach links, das Eingabefeld 24 px nach links. Nur im Chat und auf der Startseite. Auf Listen- und Formularseiten (Modelle, Einstellungen, Wissen, Skills) sitzt alles bündig, sonst wirkt es unordentlich.

## Schrift

- **Schrift für alles:** Inter (Variable Font, liegt der App bei als `@fontsource-variable/inter`; Ersatz: `system-ui, "Segoe UI", sans-serif`). Keine zweite Familie, keine Mono-Schrift als Stilmittel. Mono nur dort, wo wirklich Code steht (Code-Blöcke, Befehle).
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
- **Keine Mono-Schrift als Stilmittel**, keine Großbuchstaben mit Sperrung als Beschriftung, keine Schrift unter 12 px.
- **Kein reines Schwarz und kein reines Weiß**, auch nicht in Schatten.
- **Kein Versatz auf Listen- und Formularseiten.**
- **Keine Bewegung, die nichts mitteilt**; kein Federn.
- **Keine Farbe als einziger Träger** einer Meldung oder eines Zustands.

## Offene Fragen

Geschlossen mit der Sperre am 2026-11-15 (vom Nutzer angenommen, siehe Kopf): Abstand des Bernsteins zum früheren „Werkbank“-Orange (`#b8501a` auf neutralem Graphit mit Mono-Schrift; hier warme Flächen, kühler blauer Gegenpol, keine Mono-Schrift, keine Rahmen) · dunkler, leicht bräunlicher Vollton in Hell (`#825936`) · die eine Kante am Eingabefeld (Folge von „Bedienelemente mindestens 3 : 1“; sie umschließt ein Bedienelement, keinen Inhalt). Eine spätere Änderung des Farbtons ist ein neuer Lauf von `palette.mjs` und eine neue Sperre.

Noch offen:

1. **Wiederholung der Marke** in Titelleiste und Leiste (offen aus `JOURNEY.md`): Vorschlag: In der Titelleiste nur der leise Name, die farbige Marke nur in der Leiste. Entscheidung in Phase 4.
2. **App-Symbol.** Es folgt der Farbe; der Bernstein liegt nahe am heutigen Orange. Anpassung erst nach der Sperre, im Code-Plan.
3. **Daten-Palette** (bis zu zwölf Kategorien) kommt in Phase 6. Braucht sie neue Farbtöne, gibt es einen neuen Lauf von `palette.mjs` und eine neue Sperre.
4. **Design „wie Windows“** folgt dem System zwischen den zwei Schemata hier; ein drittes Schema gibt es nicht.
