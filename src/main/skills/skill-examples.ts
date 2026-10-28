import type { SkillInput } from '../../shared/skills';
import type { AppSettingsRepository } from '../db/app-settings-repository';
import type { SkillStore } from './skill-store';

/** Merkt sich, dass die Beispiele einmal angelegt wurden – gelöschte kommen nicht wieder. */
const SEEDED_KEY = 'skills.examplesCreated';

/** Kleine Beispiele zum Ausprobieren und Abschauen (frei geschrieben für LocalDesk). */
export const EXAMPLE_SKILLS: SkillInput[] = [
  {
    name: 'Kurz zusammenfassen',
    description:
      'Fasst Texte, Artikel oder Chats knapp zusammen – wenn der Nutzer eine Zusammenfassung, das Wichtigste oder eine Kurzfassung möchte.',
    body: `# Kurz zusammenfassen

1. Beginne mit **einem Satz**, der den Kern trifft.
2. Danach höchstens **5 Stichpunkte** mit den wichtigsten Aussagen, Zahlen oder Entscheidungen.
3. Gibt es offene Fragen oder Aufgaben, nenne sie am Ende unter **„Offen“**.

Regeln:
- Nur, was im Text steht – nichts ergänzen oder bewerten.
- Fachbegriffe beibehalten, aber Füllwörter weglassen.
- Antworte in der Sprache des Textes, sonst auf Deutsch.`,
  },
  {
    name: 'Code-Review',
    description:
      'Prüft Quellcode auf Fehler, Sicherheitsprobleme und Lesbarkeit – wenn der Nutzer Code zeigt und eine Prüfung, Verbesserung oder Fehlersuche möchte.',
    body: `# Code-Review

Gehe den Code in dieser Reihenfolge durch und nenne pro Fund **Zeile/Stelle, Problem und Vorschlag**:

1. **Fehler** – falsche Logik, Grenzfälle (leere Listen, null, 0), Ausnahmen, die nicht behandelt werden.
2. **Sicherheit** – ungeprüfte Eingaben, Pfade, SQL/Befehle aus Benutzereingaben, Geheimnisse im Code.
3. **Lesbarkeit** – unklare Namen, zu lange Funktionen, doppelter Code.

Regeln:
- Sortiere nach Schwere: erst Fehler, dann Sicherheit, dann Stil.
- Zeige Verbesserungen als kurzen Code-Ausschnitt, nicht die ganze Datei.
- Ist der Code in Ordnung, sag das klar – erfinde keine Probleme.`,
  },
  {
    name: 'E-Mail beantworten',
    description:
      'Schreibt eine passende Antwort auf eine E-Mail – wenn der Nutzer eine Mail einfügt und eine Antwort oder einen Entwurf möchte.',
    body: `# E-Mail beantworten

1. Erkenne Absender, Anliegen und ob eine Frist oder Bitte enthalten ist.
2. Schreibe eine Antwort mit **Betreff** (Re: …), Anrede, Antwort auf jede Frage, Gruß.
3. Übernimm den Ton der Mail (Sie/du, förmlich/locker).

Regeln:
- Kurz: höchstens drei Absätze.
- Erfinde keine Termine, Zusagen oder Fakten – fehlt etwas, setze **[Platzhalter]** und sag dem Nutzer, was er ergänzen muss.
- Gib nur den Entwurf aus; senden macht der Nutzer selbst.`,
  },
  {
    name: 'Lernkarten erstellen',
    description:
      'Macht aus Lernstoff Frage-Antwort-Karten – wenn der Nutzer lernen, sich abfragen lassen oder Karteikarten möchte.',
    body: `# Lernkarten erstellen

Erstelle aus dem Stoff **8–12 Karten** als Tabelle:

| Frage | Antwort |
|---|---|

Regeln:
- Eine Karte = ein Begriff oder Zusammenhang; Antworten in höchstens zwei Sätzen.
- Mische Arten: Definition („Was ist …?“), Unterschied („Worin unterscheiden sich …?“), Anwendung („Wann nutzt man …?“).
- Formeln und Fachbegriffe exakt aus dem Stoff übernehmen.
- Am Ende anbieten: „Soll ich dich abfragen?“`,
  },
];

/**
 * Legt die Beispiele beim ersten Start an. Danach nie wieder – auch nicht,
 * wenn du sie löschst. Ein schon vorhandener Ordner gleichen Namens bleibt unberührt.
 */
export async function createExampleSkills(
  store: SkillStore,
  settings: AppSettingsRepository,
): Promise<number> {
  if (settings.get(SEEDED_KEY)) return 0;
  const existing = new Set((await store.list()).map((s) => s.name));
  let created = 0;
  for (const example of EXAMPLE_SKILLS) {
    if (existing.has(example.name)) continue;
    await store.save(example);
    created++;
  }
  settings.set(SEEDED_KEY, new Date().toISOString());
  return created;
}
