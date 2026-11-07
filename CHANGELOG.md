# Änderungen

Jede Version hat hier einen Abschnitt `## <Version> – <Datum>`. Sein Text wird beim Release zu
den Release-Notizen auf GitHub – und erscheint in LocalDesk unter „Nach Updates suchen“.

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
