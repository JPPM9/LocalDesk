import type { ChatMessage, ChatRequest } from './api';

/**
 * Skills: Arbeitsanleitungen als Markdown (Format wie Claudes SKILL.md):
 * oben ein Datei-Kopf mit `name` und `description`, darunter die Anleitung.
 * Ein Skill ist nur Text – er führt nichts aus und gibt keine Werkzeug-Rechte.
 */

export const SKILL_NAME_MAX = 80;
export const SKILL_DESCRIPTION_MAX = 300;
/** Längste Anleitung – ein eingeschalteter Skill kostet so viel Kontext. */
export const SKILL_BODY_MAX = 20_000;

/** Ein Skill, wie Oberfläche und Chat ihn sehen. */
export interface SkillView {
  /** Ordnername unter skills\ – bleibt beim Umbenennen gleich. */
  id: string;
  name: string;
  description: string;
  body: string;
  /** Datei kaputt oder zu groß – wird angezeigt, aber nicht benutzt. */
  error?: string;
}

/** Was die Oberfläche zum Speichern schickt (ohne id = neuer Skill). */
export interface SkillInput {
  id?: string;
  name: string;
  description: string;
  body: string;
}

/** Liest eine SKILL.md. Fehlt der Kopf, wird der Ordnername zum Namen. */
export function parseSkill(
  text: string,
  fallbackName: string,
): { name: string; description: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  const front = match?.[1] ?? '';
  const field = (key: string) => {
    const line = new RegExp(`^${key}\\s*:\\s*(.*)$`, 'mi').exec(front)?.[1];
    return line === undefined ? '' : unquote(line.trim());
  };
  return {
    name: field('name') || fallbackName,
    description: field('description'),
    body: (match ? text.slice(match[0].length) : text).trim(),
  };
}

/** Schreibt eine SKILL.md (Kopf mit Anführungszeichen, damit „:“ im Text nicht stört). */
export function formatSkill(skill: {
  name: string;
  description: string;
  body: string;
}): string {
  return [
    '---',
    `name: ${quote(oneLine(skill.name))}`,
    `description: ${quote(oneLine(skill.description))}`,
    '---',
    '',
    skill.body.trim(),
    '',
  ].join('\n');
}

/** Prüft eine Eingabe aus der Oberfläche; liefert die bereinigte Fassung oder einen Fehlertext. */
export function checkSkillInput(
  value: unknown,
): { ok: true; value: SkillInput } | { ok: false; error: string } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'Ungültige Eingabe' };
  }
  const raw = value as Record<string, unknown>;
  const text = (key: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string) : '';
  const name = oneLine(text('name'));
  const description = oneLine(text('description'));
  const body = text('body').trim();
  if (!name) return { ok: false, error: 'Der Skill braucht einen Namen.' };
  if (name.length > SKILL_NAME_MAX) {
    return { ok: false, error: `Name höchstens ${SKILL_NAME_MAX} Zeichen.` };
  }
  if (description.length > SKILL_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Beschreibung höchstens ${SKILL_DESCRIPTION_MAX} Zeichen.`,
    };
  }
  if (!body) return { ok: false, error: 'Die Anleitung ist leer.' };
  if (body.length > SKILL_BODY_MAX) {
    return {
      ok: false,
      error: `Anleitung höchstens ${SKILL_BODY_MAX.toLocaleString('de-DE')} Zeichen.`,
    };
  }
  const id = raw.id;
  if (id !== undefined && (typeof id !== 'string' || !isSkillId(id))) {
    return { ok: false, error: 'Ungültige Skill-Kennung' };
  }
  return {
    ok: true,
    value: { ...(id !== undefined && { id }), name, description, body },
  };
}

/**
 * Der Skill-Teil der System-Nachricht: jede Anleitung unter ihrem Namen.
 * Leer, wenn kein Skill eingeschaltet ist.
 */
export function skillsPrompt(skills: { name: string; body: string }[]): string {
  if (skills.length === 0) return '';
  return [
    'Eingeschaltete Skills – Anleitungen des Nutzers. Befolge sie, wenn die Aufgabe dazu passt:',
    ...skills.map((s) => `## Skill: ${s.name}\n\n${s.body.trim()}`),
  ].join('\n\n');
}

/** Stellt die Skills an den Anfang der System-Nachricht (oder legt eine an). */
export function withSkills(
  request: ChatRequest,
  skills: { name: string; body: string }[],
): ChatRequest {
  const prompt = skillsPrompt(skills);
  if (!prompt) return request;
  const [first, ...rest] = request.messages;
  const messages: ChatMessage[] =
    first?.role === 'system'
      ? [{ ...first, content: `${prompt}\n\n${first.content}` }, ...rest]
      : [{ role: 'system', content: prompt }, ...request.messages];
  return { ...request, messages };
}

/** Kennung der eingebauten Skill-Werkzeuge (statt eines MCP-Servers). */
export const SKILL_TOOL_SERVER = 'localdesk:skills';
/** So viele Skills bekommt das Modell höchstens als Werkzeug (Kontext!). */
export const SKILL_CATALOG_MAX = 40;

/** Werkzeug-Name eines Skills für das Modell: „code-review“ → „skill_code_review“. */
export function skillToolName(id: string): string {
  return `skill_${id.replace(/-/g, '_')}`.slice(0, 64);
}

/**
 * Jeder Skill als eigenes Werkzeug ohne Eingaben: Ruft das Modell es auf, bekommt
 * es die Anleitung. Getestet: Mit EINEM Werkzeug „load_skill(name)“ hielt qwen3 die
 * Skill-Namen für eigene Funktionen und lud nie etwas (0 von 4); so laden gemma4,
 * qwen3 und gpt-oss passend (18 von 18) und bei unpassenden Fragen nichts.
 */
export function skillTools(
  skills: { id: string; name: string; description: string }[],
): {
  skillId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}[] {
  return skills.slice(0, SKILL_CATALOG_MAX).map((s) => ({
    skillId: s.id,
    name: skillToolName(s.id),
    description:
      `Lädt den Skill „${s.name}“ (eine Anleitung des Nutzers). ` +
      (s.description ? `${s.description} ` : '') +
      'Rufe ihn ZUERST auf, wenn die Aufgabe passt, und befolge die Anleitung dann in deiner Antwort.',
    inputSchema: { type: 'object', properties: {} },
  }));
}

/** Ordnername eines Skills: nur Kleinbuchstaben, Ziffern und Bindestriche. */
export function isSkillId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 60;
}

/** Aus dem Namen einen Ordnernamen machen: „Code-Review (Python)“ → „code-review-python“. */
export function skillIdFromName(name: string): string {
  const id = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return id || 'skill';
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function quote(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function unquote(text: string): string {
  const m = /^"((?:[^"\\]|\\.)*)"$/.exec(text) ?? /^'(.*)'$/.exec(text);
  return m ? m[1].replace(/\\(["\\])/g, '$1') : text;
}
