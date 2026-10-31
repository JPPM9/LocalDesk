import type { Result } from '../../shared/api';
import {
  GITHUB_RAW_HOST,
  parseGithubSkillUrl,
  type GithubSkill,
} from '../../shared/github';
import { tr } from '../../shared/messages';
import {
  parseSkill,
  SKILL_DESCRIPTION_MAX,
  SKILL_NAME_MAX,
} from '../../shared/skills';

/** Größer als das ist keine Anleitung – so viel lesen wir höchstens. */
export const GITHUB_SKILL_MAX_BYTES = 200_000;
const TIMEOUT_MS = 15_000;

export type SkillFetch = (
  url: string,
  init: { redirect: 'error'; signal: AbortSignal },
) => Promise<Response>;

/**
 * Lädt eine SKILL.md von GitHub (nur raw.githubusercontent.com, nur https, ohne
 * Weiterleitung, mit Größen- und Zeitlimit). Es wird NICHTS gespeichert und
 * nichts ausgeführt: Du siehst den Text zuerst und speicherst selbst.
 */
export async function fetchGithubSkill(
  link: string,
  fetchImpl: SkillFetch,
): Promise<Result<GithubSkill>> {
  const source = parseGithubSkillUrl(link);
  if (!source.ok) return source;
  // Doppelt gesichert: Auch wenn der Parser sich irrt, geht nichts an einen anderen Host.
  const target = new URL(source.value.rawUrl);
  if (target.protocol !== 'https:' || target.hostname !== GITHUB_RAW_HOST) {
    return { ok: false, error: tr('github.invalidLink') };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(target.href, {
      redirect: 'error',
      signal: controller.signal,
    });
    if (response.status === 404) {
      return { ok: false, error: tr('github.notFound') };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: tr('github.failed', { status: response.status }),
      };
    }
    const text = await readCapped(response, GITHUB_SKILL_MAX_BYTES);
    if (text === null) return { ok: false, error: tr('github.tooLarge') };
    if (text.includes('\0')) return { ok: false, error: tr('github.notText') };

    const parsed = parseSkill(text, source.value.fallbackName);
    // Fremde Köpfe sind oft ausführlicher als unsere Grenzen – kürzen statt ablehnen.
    return {
      ok: true,
      value: {
        name:
          parsed.name.slice(0, SKILL_NAME_MAX).trim() ||
          source.value.fallbackName,
        description: parsed.description.slice(0, SKILL_DESCRIPTION_MAX),
        body: parsed.body,
        source: source.value.label,
      },
    };
  } catch (error) {
    if (controller.signal.aborted) {
      return { ok: false, error: tr('github.timeout') };
    }
    // Weiterleitungen sind ausgeschaltet; ein Umzug des Projekts landet hier.
    return {
      ok: false,
      error:
        error instanceof Error && /redirect/i.test(error.message)
          ? tr('github.redirect')
          : tr('github.offline'),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Liest den Text, bricht aber bei mehr als `max` Bytes ab (null) – ohne alles zu laden. */
async function readCapped(
  response: Response,
  max: number,
): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
