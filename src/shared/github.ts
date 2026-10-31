import type { Result } from './api';
import { tr } from './messages';
import type { SkillFinding } from './skill-import';
import type { SkillInput } from './skills';

/**
 * Skills von GitHub laden: Aus einem Link, den du einfügst, wird die Adresse der
 * SKILL.md auf raw.githubusercontent.com. Das ist der EINZIGE Host für diese
 * Funktion; Besitzer, Projekt, Zweig und Pfad werden Zeichen für Zeichen geprüft,
 * damit aus einem Link nie eine andere Adresse wird.
 */
export const GITHUB_RAW_HOST = 'raw.githubusercontent.com';

/** Ein von GitHub geladener Skill zum Prüfen – gespeichert wird erst, wenn du es tust. */
export interface GithubSkill extends SkillInput {
  /** Woher er kommt: „besitzer/projekt/pfad“. */
  source: string;
  /** Ergebnis der Sicherheitsprüfung (Heuristik, kein Beweis). */
  findings: SkillFinding[];
}

export interface GithubSkillSource {
  /** Von hier wird geladen (immer https + GITHUB_RAW_HOST). */
  rawUrl: string;
  /** Name, falls die SKILL.md keinen Kopf hat (Ordnername). */
  fallbackName: string;
  /** Kurz für die Anzeige: „besitzer/projekt/pfad“. */
  label: string;
}

const NAME = /^[A-Za-z0-9._-]{1,100}$/;
const SEGMENT = /^[A-Za-z0-9._ -]{1,100}$/;

/**
 * Versteht diese Links:
 * - https://github.com/besitzer/projekt                      (SKILL.md ganz oben)
 * - https://github.com/besitzer/projekt/tree/zweig/ordner    (SKILL.md im Ordner)
 * - https://github.com/besitzer/projekt/blob/zweig/pfad/datei.md
 * - https://raw.githubusercontent.com/besitzer/projekt/zweig/pfad/datei.md
 * Ein Zweig mit „/“ im Namen geht nicht (GitHub-Links sind da nicht eindeutig).
 */
export function parseGithubSkillUrl(input: string): Result<GithubSkillSource> {
  const invalid = { ok: false as const, error: tr('github.invalidLink') };
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return invalid;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return invalid;
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
      return invalid;
    }
  } else if (url.hostname === GITHUB_RAW_HOST) {
    [owner, repo, ref] = parts;
    rest = parts.slice(3);
    isFile = true;
  } else {
    return invalid;
  }

  repo = repo?.replace(/\.git$/, '');
  if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo)) return invalid;
  if (!ref || !NAME.test(ref)) return invalid;
  if ([owner, repo, ref].some((part) => part === '.' || part === '..')) {
    return invalid;
  }
  if (
    rest.some((part) => !SEGMENT.test(part) || part === '.' || part === '..')
  ) {
    return invalid;
  }

  // Ein Link auf eine .md-Datei ist die Datei; alles andere ein Ordner mit SKILL.md.
  const last = rest.at(-1);
  const pointsToFile = isFile && last !== undefined && /\.md$/i.test(last);
  if (isFile && !pointsToFile) return invalid;
  const filePath = pointsToFile ? rest : [...rest, 'SKILL.md'];

  const fileName = filePath.at(-1) ?? 'SKILL.md';
  const folderName = filePath.at(-2);
  const fallbackName =
    fileName.toLowerCase() === 'skill.md'
      ? (folderName ?? repo)
      : fileName.replace(/\.md$/i, '');

  const encoded = filePath.map(encodeURIComponent).join('/');
  return {
    ok: true,
    value: {
      rawUrl: `https://${GITHUB_RAW_HOST}/${owner}/${repo}/${ref}/${encoded}`,
      fallbackName,
      label: [owner, repo, ...rest].join('/'),
    },
  };
}
