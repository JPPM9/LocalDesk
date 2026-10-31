# Änderungen

Jede Version hat hier einen Abschnitt `## <Version> – <Datum>`. Sein Text wird beim Release zu
den Release-Notizen auf GitHub – und erscheint in LocalDesk unter „Nach Updates suchen“.

## 0.1.0 – 2026-10-27

Erste installierbare Version.

- **Chat** mit lokalen Modellen über Ollama: Streaming, Markdown und Code-Hervorhebung, Gedanken
  von Denkmodellen, Tokens/s. Verlauf mit Suche, Projekten und Vorlagen; Einstellungen pro Chat.
- **Modelle** verwalten: installierte Modelle, Download mit Fortschritt, Löschen, GPU- und
  Grafikspeicher-Anzeige; mehrere Ollama-Server (lokal und im Netzwerk).
- **Werkzeuge (MCP):** Dateien lesen frei, Schreiben nur nach Rückfrage im Chat.
- **Wissen:** Sammlungen aus Text, Markdown, Quellcode, PDF und Word; Antworten mit
  Quellenangaben. Projekte mit eigenen Anweisungen und Dokumenten; Kontext-Füllstand.
- **Obsidian:** Erinnerungen über dich (das Modell schlägt vor, du bestätigst), Antworten und
  Chats als Notiz speichern, Zusammenfassungen, dein Vault als Wissen. Geschrieben wird nur in
  einen eigenen Unterordner.
- **E-Mail (Gmail):** Anmeldung über deine eigene Google-App, Posteingang und Suche, Mails als
  reiner Text, Zusammenfassen mit einem lokalen Modell, Sortieren vorschlagen (Labels, Sterne, auch
  neue Labels), „Labels verwalten“ (anlegen, umbenennen) und ein Schalter „E-Mail“ im Chat. Geändert
  wird nur nach deiner Bestätigung; senden und löschen (auch von Labels) gibt es nicht. Die Anmeldung wird mit Windows verschlüsselt gespeichert, Mails gar nicht.
- **Code-Bereich:** ein Agent arbeitet in einem gewählten Projektordner – lesen und suchen frei,
  Dateien ändern mit Vorher/Nachher-Ansicht und „Rückgängig“, Befehle und Commits nur nach
  Freigabe (jeder einzeln, kein Push).
- **Skills:** Anleitungen als SKILL.md (vier Beispiele dabei) – von Hand einschalten, in Projekten
  und Vorlagen voreinstellen oder vom Modell passend laden lassen. Auch mehrzeilige Beschreibungen (YAML „|“/„>“), große Skills bis 60.000 Zeichen mit Größenanzeige in Tokens und Zusatzdateien (Textdateien im Skill-Ordner, vom Modell bei Bedarf lesbar; Skripte werden nie ausgeführt). Hinzufügen per Ziehen und Ablegen (.md, .zip, .skill, auch mehrere): Vorschau mit Sicherheitsprüfung (Heuristik), gespeichert wird erst nach „Hinzufügen“; Skripte und Programme aus ZIPs werden nicht übernommen.
- **Oberfläche** im Stil „Arbeitsplatz“: Symbolleiste links, Chatliste mit Tagesgruppen, Wissen und
  Werkzeuge als Schalter im Eingabefeld, Seitenbereich für Quellen und Kontext. Hell, dunkel oder wie
  Windows; Schrift Inter; Kontraste nach WCAG geprüft.
- **Installer** mit Ordnerwahl; deine Daten bleiben beim Deinstallieren erhalten.
- **Update-Knopf** unter Einstellungen → Über LocalDesk: sucht nur auf Klick, lädt und installiert
  nach Bestätigung.
- **Datenschutz und Sicherheit:** Datenschutzerklärung und Lizenzen in der App (Einstellungen), MIT-Lizenz.
  Strenge Inhaltsrichtlinie (CSP) und keine Berechtigungen für Kamera, Mikrofon oder Standort. Nach einem
  Sicherheits-Audit: Programme wie Git starten nur mit vollem Pfad, Git-Aufrufe ignorieren Programme aus
  fremden Projekt-Einstellungen (Git-Hooks laufen bei Commits aus LocalDesk nicht), der Ordner .git bleibt
  gesperrt, Bilder aus Modellantworten werden nie geladen, und bei einem Ollama-Server auf einem anderen
  Rechner fragt jedes Werkzeug nach.
- **Chat und Code:** Chat scrollt ruhig (nur mit, wenn du unten bist), eigene Rückfrage-Dialoge, Nachrichten kopieren/bearbeiten/Antwort wiederholen, Grafikkarten-Status als Popup und Reiter, Plan-Modus im Code-Bereich, Zugriff auf Postfach/Dateien per Karte im Chat, Skills von einem GitHub-Link laden, „Älteren Teil verdichten“ für lange Chats (Zusammenfassung zum Prüfen und Bearbeiten, Nachrichten bleiben erhalten, aufhebbar).
- **Sprache:** Oberfläche auf Deutsch oder Englisch umschaltbar (Einstellungen → Darstellung), Standard wie Windows.
