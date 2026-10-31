import { getMessageLanguage } from '../../shared/messages';
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

/** Dieselben Beispiele auf Englisch – für alle, die LocalDesk auf Englisch starten. */
export const EXAMPLE_SKILLS_EN: SkillInput[] = [
  {
    name: 'Summarize briefly',
    description:
      'Summarizes texts, articles or chats briefly – when the user wants a summary, the key points or a short version.',
    body: `# Summarize briefly

1. Start with **one sentence** that hits the core.
2. Then at most **5 bullet points** with the most important statements, numbers or decisions.
3. If there are open questions or tasks, name them at the end under **“Open”**.

Rules:
- Only what is in the text – do not add or judge anything.
- Keep technical terms, but leave out filler words.
- Answer in the language of the text, otherwise in English.`,
  },
  {
    name: 'Code review',
    description:
      'Checks source code for errors, security problems and readability – when the user shows code and wants a review, an improvement or help finding a bug.',
    body: `# Code review

Go through the code in this order and name for each finding **line/place, problem and suggestion**:

1. **Errors** – wrong logic, edge cases (empty lists, null, 0), exceptions that are not handled.
2. **Security** – unchecked input, paths, SQL/commands built from user input, secrets in the code.
3. **Readability** – unclear names, functions that are too long, duplicated code.

Rules:
- Sort by severity: errors first, then security, then style.
- Show improvements as a short code snippet, not the whole file.
- If the code is fine, say so clearly – do not invent problems.`,
  },
  {
    name: 'Reply to an e-mail',
    description:
      'Writes a fitting reply to an e-mail – when the user pastes a mail and wants a reply or a draft.',
    body: `# Reply to an e-mail

1. Recognize the sender, the request and whether a deadline or favor is included.
2. Write a reply with a **subject** (Re: …), greeting, an answer to every question, and a closing.
3. Match the tone of the mail (formal/casual).

Rules:
- Short: at most three paragraphs.
- Do not invent dates, promises or facts – if something is missing, put **[placeholder]** and tell the user what to fill in.
- Output only the draft; the user sends it themselves.`,
  },
  {
    name: 'Create flashcards',
    description:
      'Turns study material into question-answer cards – when the user wants to learn, be quizzed or have flashcards.',
    body: `# Create flashcards

Create **8–12 cards** from the material as a table:

| Question | Answer |
|---|---|

Rules:
- One card = one term or relationship; answers in at most two sentences.
- Mix kinds: definition (“What is …?”), difference (“How do … differ?”), application (“When do you use …?”).
- Take formulas and technical terms exactly from the material.
- At the end offer: “Shall I quiz you?”`,
  },
];

/** Die Beispiele in der aktuellen Sprache (Deutsch ist der Standard). */
export function exampleSkills(): SkillInput[] {
  return getMessageLanguage() === 'en' ? EXAMPLE_SKILLS_EN : EXAMPLE_SKILLS;
}

/**
 * Legt die Beispiele beim ersten Start an (in der gewählten Sprache). Danach nie wieder – auch nicht,
 * wenn du sie löschst. Ein schon vorhandener Ordner gleichen Namens bleibt unberührt.
 */
export async function createExampleSkills(
  store: SkillStore,
  settings: AppSettingsRepository,
): Promise<number> {
  if (settings.get(SEEDED_KEY)) return 0;
  const existing = new Set((await store.list()).map((s) => s.name));
  let created = 0;
  for (const example of exampleSkills()) {
    if (existing.has(example.name)) continue;
    await store.save(example);
    created++;
  }
  settings.set(SEEDED_KEY, new Date().toISOString());
  return created;
}
