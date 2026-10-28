# E-Mail einrichten

LocalDesk liest deine Mails direkt bei Google – ohne fremden Dienst dazwischen. Dafür
brauchst du eine eigene „App“ bei Google. Das klingt größer, als es ist: Du legst
einmal ein Projekt an und kopierst zwei Werte in die Einstellungen von LocalDesk.

**Was LocalDesk mit deinen Mails tut:** lesen, zusammenfassen und – nur nach deiner
Bestätigung – Labels setzen oder einen Stern vergeben. Senden und Löschen gibt es
in LocalDesk nicht. Die Mails werden nicht auf deinem PC gespeichert; sie gehen nur
an dein lokales Modell (Ollama).

Outlook folgt später: Microsoft verlangt seit 2024 für jede App-Registrierung ein
eigenes Verzeichnis (Azure-Konto), das richten wir dann gemeinsam ein.

## Gmail

Dauer: etwa 10 Minuten. Du brauchst nur dein Google-Konto, keine Kreditkarte.

### 1. Projekt anlegen

1. Öffne <https://console.cloud.google.com/> und melde dich mit dem Google-Konto an,
   dessen Mails LocalDesk lesen soll.
2. Oben links auf die Projektauswahl → **Neues Projekt**.
3. Name: `LocalDesk` → **Erstellen**. Danach oben sicherstellen, dass dieses Projekt
   ausgewählt ist.

### 2. Gmail-API einschalten

1. Menü → **APIs & Dienste** → **Bibliothek**.
2. Nach **Gmail API** suchen, öffnen → **Aktivieren**.

### 3. Anmeldeseite (Google Auth Platform)

1. Menü → **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**
   (heißt inzwischen auch **Google Auth Platform**) → **Los gehts**.
2. **App-Informationen:** App-Name `LocalDesk`, Support-E-Mail = deine Adresse.
3. **Zielgruppe:** **Extern**.
4. **Kontaktdaten:** deine Adresse. Den Richtlinien zustimmen → **Erstellen**.

### 4. Berechtigung (Bereich) eintragen

1. Links **Datenzugriff** → **Bereiche hinzufügen oder entfernen**.
2. Im Feld „Bereiche manuell hinzufügen“ eintragen:
   `https://www.googleapis.com/auth/gmail.modify` → **Zur Tabelle hinzufügen** →
   **Aktualisieren** → unten **Speichern**.

> **Warum `gmail.modify`?** Damit darf LocalDesk lesen und Labels/Sterne ändern.
> Ein Google-Recht „nur Labels, aber nicht löschen“ gibt es nicht – das Recht
> erlaubt technisch mehr, als LocalDesk benutzt. Deshalb ist in LocalDesk selbst
> festgelegt, welche Aufrufe es überhaupt gibt: Senden und Löschen sind nicht
> eingebaut.

### 5. Dich als Testnutzer eintragen

1. Links **Zielgruppe** → **Testnutzer** → **Add users** → deine Gmail-Adresse →
   **Speichern**.

> **7 Tage:** Im Status „Test“ meldet Google dich nach 7 Tagen ab – LocalDesk zeigt
> dann „Bitte neu anmelden“. Eigentlich hilft **App veröffentlichen** (Status
> „Produktion“). Seit Herbst 2026 bleibt dieser Knopf bei vielen privaten Apps aber
> ausgegraut, vermutlich weil Google jetzt Links zu Startseite und
> Datenschutzerklärung verlangt. Das holen wir nach, wenn LocalDesk veröffentlicht
> wird. Eine Überprüfung durch Google beantragst du **nicht**.

### 6. Zugangsdaten (Client) anlegen

1. Links **Clients** → **Client erstellen**.
2. Anwendungstyp: **Desktop-App**, Name `LocalDesk` → **Erstellen**.
3. Es erscheinen **Client-ID** (endet auf `.apps.googleusercontent.com`) und
   **Clientschlüssel** (beginnt meist mit `GOCSPX-`). Beide kopieren.

### 7. In LocalDesk eintragen

LocalDesk → **Einstellungen** → **E-Mail** → **Gmail einrichten** → Client-ID und
Clientschlüssel einfügen → **Speichern**.

> Der Clientschlüssel einer Desktop-App ist laut Google kein echtes Geheimnis – er
> steckt in jeder installierten Kopie. Geschützt wird dein Postfach durch deine
> Anmeldung (die verschlüsselt gespeichert wird), nicht durch diesen Schlüssel.

### Beim ersten Anmelden

Google zeigt „**Google hat diese App nicht überprüft**“. Das ist bei deiner eigenen,
nicht geprüften App normal: **Erweitert** → **Zu LocalDesk wechseln (unsicher)** →
Zugriff erlauben. Prüfe dabei, dass oben dein eigener App-Name steht.

### Zugriff wieder entziehen

In LocalDesk **Abmelden** – oder bei Google unter
<https://myaccount.google.com/permissions> → LocalDesk → **Zugriff entfernen**.
