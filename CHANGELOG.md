# Änderungen

Jede Version hat hier einen Abschnitt `## <Version> – <Datum>`. Sein Text wird beim Release zu
den Release-Notizen auf GitHub – und erscheint in LocalDesk unter „Nach Updates suchen“.

## 0.3.0 – 2026-11-26

**Chat**

- Neue „Arbeitsweise“ (Einstellungen → Arbeitsweise, standardmäßig an): ein kurzer Block vor den Anweisungen jedes Chats und im
  Code-Bereich. Das Modell soll erst verstehen und bei Unklarem nachfragen, die einfachste Lösung liefern, nur das Nötige ändern und am
  Ziel prüfen. Die Idee stammt aus Andrej Karpathys Beobachtungen zu Fehlern von Sprachmodellen beim Programmieren; der Text ist
  eigenständig formuliert. Er kostet etwa 250 Token Kontext und ist ausschaltbar.

- Neu in der Modellauswahl: „Auto“. LocalDesk wählt aus den installierten Modellen das passendste für die Aufgabe: Bilder verlangen ein
  Vision-Modell, eingeschaltete Werkzeuge ein Modell mit Werkzeugen, Programmieraufgaben bevorzugen ein Coder-Modell, Modelle, die nicht in
  Grafik- und Arbeitsspeicher passen, fallen weg, ein bereits geladenes Modell hat Vorrang bei knappem Abstand. Vor dem Senden steht der
  Vorschlag mit Gründen; du bestätigst, wählst ein anderes Modell oder schaltest die Rückfrage unter Einstellungen → Arbeitsweise ab.

- CodeGraph als Werkzeug (Einstellungen → MCP-Server → „CodeGraph hinzufügen“): ein lokaler Code-Index, mit dem das Modell Fragen zu
  einem Projekt mit einem Aufruf beantwortet, statt viele Dateien zu lesen. LocalDesk erkennt das installierte CodeGraph, startet es
  für den gewählten Projektordner (Statistik immer aus), zeigt, ob der Ordner einen Index hat, und baut ihn auf Wunsch nach Rückfrage.
  Im Code-Bereich bekommt eine Sitzung die Werkzeuge automatisch, wenn ihr Ordner so eingerichtet ist. Installiert wird CodeGraph nicht
  von LocalDesk.

## 0.2.1 – 2026-11-26

**Werkzeuge**

- Neu unter ArtCraft-Apps: Craft Anything (untersucht Dateien, Programme und Webseiten). Es lässt sich nicht auf Ordner beschränken;
  LocalDesk startet es deshalb nur im eingeschränkten Modus (nichts ausführen, kein Web, keine Aufnahmen) und fragt bei jedem Werkzeug
  nach, auch bei lesenden.

- Werkzeuge mit Pfad-Eingaben (MCP-Server, ArtCraft-Apps) tragen jetzt den Hinweis, Pfade mit Schrägstrichen zu schreiben. Mit
  Backslashes brach Ollama Werkzeug-Aufrufe manchmal mit „invalid character in string escape code“ ab.

## 0.2.0 – 2026-11-20

**ArtCraft**

- PdfCraft und PhotoCraft (ArtCraft-Apps) lassen sich unter Einstellungen → MCP-Server als Werkzeuge hinzufügen: „ArtCraft-App
  hinzufügen“. LocalDesk erkennt installierte Apps, startet ihren MCP-Server nur mit den Ordnern, die du freigibst (Lesen), und erlaubt
  Schreiben nur mit eigenem Haken. Veränderndes fragt wie bei allen Werkzeugen nach.

**KI-Server**

- LocalDesk spricht jetzt auch mit OpenAI-kompatiblen Servern: LM Studio, llama.cpp-Server und Cloud-Anbieter (Einstellungen → KI-Server,
  Art „OpenAI-kompatibel“, optional mit API-Schlüssel, verschlüsselt gespeichert). Chat, Werkzeuge und Wissen funktionieren dort wie
  mit Ollama; Modelle lädst und löschst du dort, wo der Server läuft. Bei einem Server außerhalb deines Netzes warnt die App und fragt
  vor jedem Werkzeug nach.

**Modelle**

- Neuer Reiter „Entdecken“ unter Modelle: GGUF-Modelle auf Hugging Face suchen, Größen je Quantisierung vergleichen und sehen, ob ein
  Modell auf diesen PC passt (Arbeitsspeicher und NVIDIA-Grafikspeicher, geschätzt). Der Download läuft über Ollama. Die Suche geht nur
  auf Klick an huggingface.co.

## 0.1.1 – 2026-11-20

**Oberfläche**

- Neues Design „Späte Stunde“: warme Bernstein-Töne mit kühlem Schatten, größere Schrift, mehr Luft, keine Rahmen, weiche Bewegung.
- Eine Seitenleiste statt Symbolleiste und Chatliste: Chat, Vorlagen, Code, Modelle, Projekte, letzte Chats, Modellstatus. Unter 1100 px
  Breite ist sie schmal und lässt sich als Überlagerung öffnen (Strg+B).
- Befehlspalette (Strg+K): Seiten, Befehle, Projekte und Chats finden, auch im Chat-Inhalt. Zoom, Vollbild und Entwicklerwerkzeuge sind
  jetzt Befehle der Palette, ihre Kürzel bleiben.
- Eigene Titelleiste statt der Windows-Menüzeile. Zoom (Strg+Plus, Strg+Minus, Strg+0), Vollbild (F11), Entwicklerwerkzeuge
  (Strg+Umschalt+I) und Neuladen (Strg+R) funktionieren weiter über ihre Kürzel.
- Startseite „Dein PC“ mit geladenem Modell und Grafikspeicher. Ein Klick auf den Modellstatus unten in der Seitenleiste öffnet ein
  Popup mit Ollama-Zustand, geladenen Modellen und Grafikkarte.
- Wissen, Skills und E-Mail stehen im „+“-Menü des Eingabefelds, unter Einstellungen → Verwalten und in der Palette. Eingeschaltete
  Funktionen erscheinen als Marken über dem Text; die Modellauswahl sitzt im Eingabefeld.
- Quellen stehen als Fußnoten unter der Antwort. Neues App-Symbol.

**Chat**

- Datenanalyse: Tabellen (CSV, TSV, Excel .xlsx; bis 20 MB und 200 000 Zeilen) per Büroklammer anhängen
  und Fragen dazu stellen. Das Modell fragt die Tabelle mit lesenden SQL-Abfragen ab (genaue Summen und
  Mittelwerte auch bei großen Tabellen) und kann Balken-, Linien- und Kreisdiagramme im Chat zeigen.
  Es sieht nur Spaltennamen, ein paar Beispielzeilen und die Ergebnisse seiner Abfragen. Braucht ein
  Modell mit Werkzeugen; ohne Werkzeuge bekommt es kleine Tabellen als Text.

## 0.1.0 – 2026-11-07

Erste veröffentlichte Version: lokale KI über Ollama für Windows – ohne Konto, ohne Telemetrie.

**Hinweis zur Installation:** Der Installer ist nicht signiert. Windows zeigt beim ersten Start
eine SmartScreen-Warnung – „Weitere Informationen“ → „Trotzdem ausführen“. Deine Daten bleiben
beim Deinstallieren erhalten.

**Chat**

- Streaming, Markdown und Code-Hervorhebung, Gedanken von Denkmodellen, Tokens/s.
- Verlauf mit Suche, Projekte (eigene Anweisungen und Dokumente), Vorlagen, Einstellungen pro Chat.
- Nachrichten kopieren, bearbeiten, Antwort wiederholen; „Älteren Teil verdichten“ für lange Chats
  (Zusammenfassung zum Prüfen, aufhebbar).
- Fotos (bis 4 je Nachricht, für Modelle mit Bild-Fähigkeit) und Dateien (bis 3: PDF, Word, Text,
  Markdown, CSV, Quellcode) per Büroklammer, Ziehen oder Strg+V; Hinweis mit Knopf, wenn der
  Kontext zu knapp wird.

**Modelle und Server**

- Modelle laden und löschen, Grafikkarten- und Speicheranzeige.
- Mehrere Ollama-Server (dieser PC und im Netzwerk); antwortet einer nicht, schlägt LocalDesk die
  anderen vor – gewechselt wird nur nach deinem Klick.

**Wissen**

- Sammlungen aus Text, Markdown, Quellcode, PDF und Word; Antworten mit Quellenangaben.
- Treffer auf Wunsch vom Modell neu sortieren (langsamer, oft genauer).

**Internet und Recherche**

- Schalter „Internet“: Das Modell liest Webseiten (nur Haupttext, ohne Skripte, Cookies und
  Anmeldung). Adressen, die du selbst schreibst, ohne Rückfrage; jede andere nur nach deinem
  „Erlauben“. Adressen im eigenen Netz bleiben gesperrt.
- Haken „Im Web suchen“ (anfangs aus) über die Ollama-Websuche – mit kostenlosem Ollama-Konto und
  eigenem Schlüssel unter Einstellungen → Internet-Suche (mit Windows verschlüsselt). Jede Anfrage
  steht im Chat.
- Knopf „Recherche“ (Deep Research): Stufe wählen (Schnell, Normal, Gründlich), „Starten“ – dann
  plant LocalDesk Suchen, liest Seiten aus den Treffern und schreibt einen Bericht mit Zitaten und
  echter Quellenliste. Dauer etwa 1–6 Minuten; der Bericht kann Fehler enthalten.

**Werkzeuge, Skills und Obsidian**

- MCP-Werkzeuge: Dateien lesen frei, Schreiben nur nach Rückfrage im Chat.
- Skills als SKILL.md (vier Beispiele dabei): von Hand, in Projekten/Vorlagen oder vom Modell
  geladen. Hinzufügen per Ziehen (.md, .zip, .skill) oder „Von GitHub“ – immer mit Vorschau und
  Sicherheitsprüfung; Skripte werden nie ausgeführt.
- Obsidian: Erinnerungen über dich (das Modell schlägt vor, du bestätigst), Chats und
  Zusammenfassungen als Notiz, dein Vault als Wissen. Geschrieben wird nur in einen eigenen Unterordner.

**E-Mail (Gmail)**

- Anmeldung über deine eigene Google-App; Posteingang, Suche, Mails als reiner Text, Zusammenfassen
  mit einem lokalen Modell, Sortieren vorschlagen (Labels, Sterne), eigene Labels anlegen und
  umbenennen, Schalter „E-Mail“ im Chat.
- Geändert wird nur nach deiner Bestätigung; senden und löschen gibt es nicht.

**Code-Bereich**

- Ein Agent arbeitet in einem gewählten Projektordner: lesen und suchen frei, Dateien ändern mit
  Vorher/Nachher-Ansicht und „Rückgängig“, Befehle und Commits nur nach Freigabe (kein Push),
  Plan-Modus zum reinen Lesen.

**Oberfläche**

- Stil „Arbeitsplatz“ mit Symbolleiste, Chatliste und Seitenbereich; hell, dunkel oder wie Windows.
- Deutsch oder Englisch (Einstellungen → Darstellung), Standard wie Windows.

**Datenschutz und Sicherheit**

- Keine Telemetrie, kein Konto. Nach außen geht nur, was du einschaltest – die Liste steht in der
  Datenschutzerklärung (in der App unter Einstellungen), dazu die Lizenzen (MIT).
- Strenge Inhaltsrichtlinie, keine Kamera-, Mikrofon- oder Standortrechte; Programme wie Git nur mit
  vollem Pfad, Git-Hooks laufen nicht, `.git` bleibt gesperrt; bei einem Ollama-Server auf einem
  anderen Rechner fragt jedes Werkzeug nach.

**Installer und Updates**

- Installer mit Ordnerwahl; „Nach Updates suchen“ unter Einstellungen → Über LocalDesk sucht nur
  auf Klick und installiert nach Bestätigung.
