import { messageLocale, tr } from '../../shared/messages';
import {
  skillContextAdvice,
  skillLoadedText,
  type SkillView,
} from '../../shared/skills';

/**
 * Was das Modell bekommt, wenn es einen Skill aufruft: die Anleitung (mit der Liste
 * der Zusatzdateien) oder – mit „file“ – eine Zusatzdatei. Passt der Text nicht in
 * den Kontext des Chats, bekommt das Modell stattdessen eine klare Meldung für den
 * Nutzer (statt dass Ollama den Anfang des Gesprächs still abschneidet).
 */
export async function callSkill(
  skill: SkillView,
  args: Record<string, unknown>,
  readExtraFile: (id: string, file: string) => Promise<string>,
  contextLength: number,
): Promise<{ text: string; isError: boolean }> {
  const file = typeof args.file === 'string' ? args.file.trim() : '';
  let label = skill.name;
  let text: string;
  if (file) {
    try {
      const content = await readExtraFile(skill.id, file);
      text = `${tr('prompt.skillFileHeader', { file, name: skill.name })}\n\n${content}`;
      label = `${skill.name} (${file})`;
    } catch (error) {
      return {
        text: error instanceof Error ? error.message : String(error),
        isError: true,
      };
    }
  } else {
    text = skillLoadedText(skill);
  }

  const advice = skillContextAdvice(text, contextLength);
  if (!advice.fits) {
    const number = (n: number) => n.toLocaleString(messageLocale());
    const values = {
      name: label,
      tokens: number(advice.tokens),
      context: number(contextLength),
    };
    return {
      text:
        advice.suggested !== null
          ? tr('skills.tooBigForChat', {
              ...values,
              suggested: number(advice.suggested),
            })
          : tr('skills.tooBigForModel', values),
      isError: true,
    };
  }
  return { text, isError: false };
}
