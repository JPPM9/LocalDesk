import type { ChatMessage, ChatRequest } from './api';
import {
  ANSWER_RESERVE,
  estimateTokens,
  OLLAMA_DEFAULT_CONTEXT,
  suggestContextLength,
} from './context';
import { messageLocale, tr } from './messages';

/**
 * Skills: Arbeitsanleitungen als Markdown (Format wie Claudes SKILL.md):
 * oben ein Datei-Kopf mit `name` und `description`, darunter die Anleitung.
 * Ein Skill ist nur Text – er führt nichts aus und gibt keine Werkzeug-Rechte.
 */

export const SKILL_NAME_MAX = 80;
export const SKILL_DESCRIPTION_MAX = 1_024;
/**
 * Längste Anleitung. Ein eingeschalteter oder geladener Skill kostet so viel
 * Kontext – ob er in den Chat passt, zeigt `skillContextAdvice`.
 */
export const SKILL_BODY_MAX = 60_000;
/** Größer darf eine SKILL.md nicht sein (Kopf + Anleitung, großzügig: 4 Bytes je Zeichen). */
export const SKILL_MD_MAX_BYTES = SKILL_BODY_MAX * 4 + 4096;

/** Eine Zusatzdatei eines Skills (z. B. references/stil.md), Pfad relativ zum Skill-Ordner. */
export interface SkillFile {
  path: string;
  size: number;
}
/** Höchstens so viele Zusatzdateien, so tief verschachtelt, so groß – und nur Text. */
export const SKILL_FILES_MAX = 50;
export const SKILL_FILE_DEPTH_MAX = 3;
export const SKILL_FILE_MAX_BYTES = 200_000;
/** So viel einer Zusatzdatei bekommt das Modell auf einmal. */
export const SKILL_FILE_TEXT_MAX = 30_000;
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.rst',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.tsv',
  '.xml',
  '.html',
]);

/** Ist das eine Textdatei, die zu einem Skill gehören darf? Skripte und Programme nie. */
export function isSkillTextFile(filePath: string): boolean {
  const dot = filePath.lastIndexOf('.');
  return dot > 0 && TEXT_EXTENSIONS.has(filePath.slice(dot).toLowerCase());
}

/** Ein Skill, wie Oberfläche und Chat ihn sehen. */
export interface SkillView {
  /** Ordnername unter skills\ – bleibt beim Umbenennen gleich. */
  id: string;
  name: string;
  description: string;
  body: string;
  /** Zusatzdateien (ohne SKILL.md); das Modell kann sie bei Bedarf lesen. */
  files?: SkillFile[];
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
  return {
    name: oneLine(frontValue(front, 'name')) || fallbackName,
    description: oneLine(frontValue(front, 'description')),
    body: (match ? text.slice(match[0].length) : text).trim(),
  };
}

/**
 * Der Wert eines Kopf-Schlüssels (YAML-Teilmenge, wie Claude-Skills sie schreiben):
 * einzeilig, in Anführungszeichen, über mehrere eingerückte Zeilen und als Block
 * mit „|“ (Zeilen bleiben) oder „>“ (Zeilen werden zu einem Absatz), auch „|-“ und
 * „>-“. Listen und verschachtelte Werte gelten als leer.
 */
function frontValue(front: string, key: string): string {
  const lines = front.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    new RegExp(`^${key}\\s*:`, 'i').test(line),
  );
  if (start < 0) return '';
  const first = lines[start]
    .replace(new RegExp(`^${key}\\s*:\\s*`, 'i'), '')
    .trim();
  // Fortsetzung: eingerückte oder leere Zeilen bis zur nächsten Zeile ohne Einrückung.
  const rest: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== '' && !/^\s/.test(line)) break;
    rest.push(line);
  }
  while (rest.length > 0 && rest[rest.length - 1].trim() === '') rest.pop();

  const block = /^([|>])[+-]?\d*\s*(?:#.*)?$/.exec(first);
  if (block) {
    const indent = Math.min(
      ...rest
        .filter((line) => line.trim() !== '')
        .map((line) => /^\s*/.exec(line)![0].length),
    );
    const text = rest.map((line) =>
      line.trim() === '' ? '' : line.slice(indent),
    );
    return (block[1] === '|' ? text.join('\n') : fold(text)).trim();
  }
  const continuation = rest.map((line) => line.trim()).filter(Boolean);
  // Verschachtelt („metadata:“ mit eingerückten Schlüsseln) oder Liste: kein Text.
  if (!first && /^(-\s|[\w-]+\s*:(\s|$))/.test(continuation[0] ?? '')) {
    return '';
  }
  return unquote([first, ...continuation].filter(Boolean).join(' '));
}

/** Block mit „>“: aufeinanderfolgende Zeilen ergeben einen Absatz, eine Leerzeile trennt Absätze. */
function fold(lines: string[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line === '') {
      if (current.length > 0) paragraphs.push(current.join(' '));
      current = [];
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) paragraphs.push(current.join(' '));
  return paragraphs.join('\n');
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
    return { ok: false, error: tr('error.invalidInput') };
  }
  const raw = value as Record<string, unknown>;
  const text = (key: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string) : '';
  const name = oneLine(text('name'));
  const description = oneLine(text('description'));
  const body = text('body').trim();
  if (!name) return { ok: false, error: tr('skills.nameMissing') };
  if (name.length > SKILL_NAME_MAX) {
    return {
      ok: false,
      error: tr('skills.nameTooLong', { max: SKILL_NAME_MAX }),
    };
  }
  if (description.length > SKILL_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: tr('skills.descriptionTooLong', { max: SKILL_DESCRIPTION_MAX }),
    };
  }
  if (!body) return { ok: false, error: tr('skills.bodyEmpty') };
  if (body.length > SKILL_BODY_MAX) {
    return {
      ok: false,
      error: tr('skills.bodyMax', {
        max: SKILL_BODY_MAX.toLocaleString(messageLocale()),
      }),
    };
  }
  const id = raw.id;
  if (id !== undefined && (typeof id !== 'string' || !isSkillId(id))) {
    return { ok: false, error: tr('error.invalidSkillId') };
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
    tr('prompt.skillsIntro'),
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
  skills: {
    id: string;
    name: string;
    description: string;
    files?: SkillFile[];
  }[],
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
      tr('prompt.skillToolDescription', {
        name: s.name,
        description: s.description ? `${s.description} ` : '',
      }) + (s.files?.length ? ` ${tr('prompt.skillToolFiles')}` : ''),
    // Nur Skills mit Zusatzdateien nehmen ein „file“ an; alle anderen bleiben ohne Eingaben.
    inputSchema: {
      type: 'object',
      properties: s.files?.length
        ? { file: { type: 'string', description: tr('prompt.skillFileParam') } }
        : {},
    },
  }));
}

/** Der Text, den das Modell beim Laden eines Skills bekommt: Anleitung und Liste der Zusatzdateien. */
export function skillLoadedText(skill: {
  name: string;
  body: string;
  files?: SkillFile[];
}): string {
  const files = skill.files ?? [];
  const list =
    files.length > 0
      ? `\n\n${tr('prompt.skillFilesList')}\n${files
          .map((f) => `- ${f.path} (${f.size} bytes)`)
          .join('\n')}`
      : '';
  return `${tr('prompt.skillLoaded', { name: skill.name })}\n\n${skill.body}${list}`;
}

/**
 * Passt ein Skilltext in den Kontext? Der Standard von Ollama sind 4.096 Tokens –
 * ein großer Skill braucht eine höhere Kontextlänge (Einstellungen des Chats).
 * `suggested` ist die nächste passende Stufe (null, wenn er schon passt).
 */
export function skillContextAdvice(
  text: string,
  contextLength: number = OLLAMA_DEFAULT_CONTEXT,
): { tokens: number; fits: boolean; suggested: number | null } {
  const tokens = estimateTokens(text);
  const fits = tokens + ANSWER_RESERVE <= contextLength;
  return {
    tokens,
    fits,
    suggested: fits ? null : suggestContextLength(tokens, contextLength),
  };
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
