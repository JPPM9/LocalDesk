import type { Result } from './api';
import { tr, type MessageKey } from './messages';
import type { SkillImportPreview } from './skill-import';

/**
 * Skills bei GitHub finden. Zwei Hosts, beide nur lesend, nur nach deinem Klick:
 * - api.github.com: die Projekt-Suche und der Dateibaum eines Projekts
 * - raw.githubusercontent.com: die Dateien der Skills, die du auswählst
 * Besitzer, Projekt, Zweig und Pfad werden Zeichen für Zeichen geprüft, damit aus einem
 * Link oder Suchbegriff nie eine andere Adresse wird.
 */
export const GITHUB_API_HOST = 'api.github.com';
export const GITHUB_RAW_HOST = 'raw.githubusercontent.com';

/** So viele Projekte zeigt die Suche (GitHub erlaubt ohne Anmeldung 10 Suchen pro Minute). */
export const GITHUB_SEARCH_LIMIT = 15;
/** Länge des Suchbegriffs (GitHub selbst erlaubt 256 Zeichen für die ganze Anfrage). */
export const GITHUB_QUERY_MIN = 2;
export const GITHUB_QUERY_MAX = 80;
/** So viele Skills eines Projekts zeigt die Liste (Auswählen geht nur bis SKILL_IMPORT_LIMITS.skills). */
export const GITHUB_LIST_MAX = 200;

/** Ein Projekt auf GitHub; `ref` ist ein Zweig, ein Tag oder „HEAD“ (Standardzweig). */
export interface GithubRepoRef {
  owner: string;
  repo: string;
  ref: string;
}

/** Was in das Eingabefeld gehört hat: Suchbegriff, Projekt/Ordner oder eine einzelne .md-Datei. */
export type GithubInput =
  | { kind: 'search'; query: string }
  /** `path` leer = das ganze Projekt, sonst ein Ordner darin. */
  | { kind: 'repo'; ref: GithubRepoRef; path: string }
  | { kind: 'file'; ref: GithubRepoRef; path: string };

/** Ein Projekt in den Suchergebnissen. */
export interface GithubRepoHit {
  /** „besitzer/projekt“ */
  fullName: string;
  description: string;
  stars: number;
  /** Datum der letzten Änderung (JJJJ-MM-TT). */
  pushedAt: string;
  /** Kürzel der Lizenz (z. B. „MIT“) – null, wenn keine oder eine unklare angegeben ist. */
  license: string | null;
  archived: boolean;
}

/** Ein Skill in einem Projekt – noch nichts davon ist geladen. */
export interface GithubSkillItem {
  /** Nummer in der Liste – damit „Prüfen“ sagt, welche gemeint sind. */
  index: number;
  name: string;
  /** Ordner im Projekt (leer = ganz oben). */
  path: string;
  /** Größe der SKILL.md in Bytes. */
  mdBytes: number;
  /** Zusatzdateien, die mitgeladen würden. */
  files: number;
  /** Dateien, die nicht übernommen würden (Skripte, zu groß …). */
  skipped: number;
  /** SKILL.md und Zusatzdateien zusammen. */
  bytes: number;
}

export type GithubOpenResult =
  | { kind: 'search'; query: string; total: number; hits: GithubRepoHit[] }
  | {
      kind: 'skills';
      listId: string;
      /** „besitzer/projekt“ oder „besitzer/projekt/ordner“ */
      label: string;
      skills: GithubSkillItem[];
      notices: string[];
    }
  | { kind: 'preview'; preview: SkillImportPreview };

const NAME = /^[A-Za-z0-9._-]{1,100}$/;
const SEGMENT = /^[A-Za-z0-9._ -]{1,100}$/;
const SHORTHAND = /^([A-Za-z0-9._-]{1,100})\/([A-Za-z0-9._-]{1,100})$/;
/** Fängt an wie ein Link (auch ohne „https://“, wenn der Host dasteht). */
const LINKISH =
  /^(https?:\/\/|(www\.)?github\.com\/|raw\.githubusercontent\.com\/)/i;

/** Ist das ein gültiger Name der Form „besitzer/projekt“? (Für Antworten von GitHub.) */
export function isGithubRepoName(text: string): boolean {
  const match = SHORTHAND.exec(text);
  return !!match && ![match[1], match[2]].some((p) => p === '.' || p === '..');
}

const fail = (key: MessageKey) => ({
  ok: false as const,
  error: tr(key),
});

function repoRef(
  owner: string | undefined,
  repo: string | undefined,
  ref: string,
  rest: string[],
): GithubRepoRef | null {
  repo = repo?.replace(/\.git$/, '');
  if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo)) return null;
  if (!ref || !NAME.test(ref)) return null;
  if ([owner, repo, ref].some((part) => part === '.' || part === '..')) {
    return null;
  }
  if (
    rest.some((part) => !SEGMENT.test(part) || part === '.' || part === '..')
  ) {
    return null;
  }
  return { owner, repo, ref };
}

function parseLink(input: string): Result<GithubInput> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return fail('github.invalidLink');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return fail('github.invalidLink');
  }
  const parts = url.pathname
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return '\0';
      }
    });

  let owner: string | undefined;
  let repo: string | undefined;
  let ref = 'HEAD';
  let rest: string[] = [];
  let isFile = false;

  if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
    [owner, repo] = parts;
    const kind = parts[2];
    if (kind === 'blob' || kind === 'tree') {
      ref = parts[3] ?? '';
      rest = parts.slice(4);
      isFile = kind === 'blob';
    } else if (parts.length > 2) {
      return fail('github.invalidLink');
    }
  } else if (url.hostname === GITHUB_RAW_HOST) {
    [owner, repo, ref] = parts;
    rest = parts.slice(3);
    isFile = true;
  } else {
    return fail('github.invalidLink');
  }

  const found = repoRef(owner, repo, ref, rest);
  if (!found) return fail('github.invalidLink');

  if (!isFile) {
    return {
      ok: true,
      value: { kind: 'repo', ref: found, path: rest.join('/') },
    };
  }
  // Ein Link auf eine Datei muss eine .md-Datei sein. Eine SKILL.md steht für ihren Ordner
  // (samt Zusatzdateien); jede andere .md-Datei ist ein Skill für sich.
  const last = rest.at(-1);
  if (last === undefined || !/\.md$/i.test(last)) {
    return fail('github.invalidLink');
  }
  if (last.toLowerCase() === 'skill.md') {
    return {
      ok: true,
      value: { kind: 'repo', ref: found, path: rest.slice(0, -1).join('/') },
    };
  }
  return {
    ok: true,
    value: { kind: 'file', ref: found, path: rest.join('/') },
  };
}

/**
 * Versteht, was im Eingabefeld steht:
 * - https://github.com/besitzer/projekt (auch /tree/zweig/ordner und /blob/zweig/datei.md)
 * - https://raw.githubusercontent.com/besitzer/projekt/zweig/datei.md
 * - besitzer/projekt (Kurzform für das ganze Projekt)
 * - alles andere ist ein Suchbegriff
 * Ein Zweig mit „/“ im Namen geht nicht (GitHub-Links sind da nicht eindeutig).
 */
export function parseGithubInput(input: string): Result<GithubInput> {
  const text = input.trim();
  if (!text) return fail('github.emptyInput');
  if (LINKISH.test(text)) {
    return parseLink(/^https?:/i.test(text) ? text : `https://${text}`);
  }
  const short = SHORTHAND.exec(text);
  if (short) {
    const found = repoRef(short[1], short[2], 'HEAD', []);
    if (!found) return fail('github.invalidLink');
    return { ok: true, value: { kind: 'repo', ref: found, path: '' } };
  }
  // Suchbegriff: Steuerzeichen raus, Leerraum zusammenfassen.
  const query = [...text]
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (query.length < GITHUB_QUERY_MIN || query.length > GITHUB_QUERY_MAX) {
    return {
      ok: false,
      error: tr('github.badQuery', {
        min: GITHUB_QUERY_MIN,
        max: GITHUB_QUERY_MAX,
      }),
    };
  }
  return { ok: true, value: { kind: 'search', query } };
}

/** Adresse der Projekt-Suche: dein Begriff + „skill“, gesucht in Name, Beschreibung und Themen. */
export function githubSearchUrl(query: string): string {
  const q = `${query} skill in:name,description,topics`;
  return `https://${GITHUB_API_HOST}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${GITHUB_SEARCH_LIMIT}`;
}

/** Adresse des Dateibaums eines Projekts (alle Dateien in einer Antwort). */
export function githubTreeUrl(ref: GithubRepoRef): string {
  return `https://${GITHUB_API_HOST}/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(ref.ref)}?recursive=1`;
}

/** Adresse einer Datei im Projekt (der Pfad wird Teil für Teil kodiert). */
export function githubRawUrl(ref: GithubRepoRef, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `https://${GITHUB_RAW_HOST}/${ref.owner}/${ref.repo}/${encodeURIComponent(ref.ref)}/${encoded}`;
}
