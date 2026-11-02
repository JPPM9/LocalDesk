import { randomUUID } from 'node:crypto';
import type { Result } from '../../shared/api';
import {
  GITHUB_API_HOST,
  GITHUB_LIST_MAX,
  GITHUB_RAW_HOST,
  githubRawUrl,
  githubSearchUrl,
  githubTreeUrl,
  isGithubRepoName,
  parseGithubInput,
  type GithubOpenResult,
  type GithubRepoHit,
  type GithubRepoRef,
  type GithubSkillItem,
} from '../../shared/github';
import { tr } from '../../shared/messages';
import {
  SKILL_IMPORT_LIMITS,
  SKILL_IMPORT_SESSIONS_MAX,
  SKILL_IMPORT_TTL_MS,
  type SkillImportPreview,
  type SkippedFile,
} from '../../shared/skill-import';
import {
  SKILL_FILE_DEPTH_MAX,
  SKILL_FILE_MAX_BYTES,
  SKILL_FILES_MAX,
  SKILL_MD_MAX_BYTES,
  skillIdFromName,
} from '../../shared/skills';
import {
  baseName,
  dirOf,
  formatProblem,
  isSkillMd,
  prepareSkill,
  type PreparedSkill,
  type RawFile,
  type SkillImports,
} from './skill-import';
import { isJunkPath, safeSkillPath } from './skill-paths';

/** So wird geladen (austauschbar für Tests): immer ohne Weiterleitung und mit Zeitlimit. */
export type SkillFetch = (
  url: string,
  init: {
    redirect: 'error';
    signal: AbortSignal;
    headers?: Record<string, string>;
  },
) => Promise<Response>;

const TIMEOUT_MS = 15_000;
/** GitHub liefert den Dateibaum bis etwa 7 MB; mehr als das lesen wir nicht. */
const TREE_MAX_BYTES = 12_000_000;
const SEARCH_MAX_BYTES = 2_000_000;
const DOWNLOADS_AT_ONCE = 4;
/** So viele übersprungene Dateien eines Skills werden einzeln aufgeführt. */
const SKIPPED_SHOWN_MAX = 100;
const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

/** Fehler beim Laden; `fatal` = weitere Versuche ohne Wirkung (kein Netz, Zeitlimit, Limit erreicht). */
interface Failure {
  ok: false;
  error: string;
  fatal: boolean;
}
type Fetched = { ok: true; value: Uint8Array } | Failure;

const failure = (error: string, fatal = false): Failure => ({
  ok: false,
  error,
  fatal,
});

/** Wie viele Minuten GitHub sperrt – oder null, wenn die Antwort keine Sperre meldet. */
function waitMinutes(response: Response, now: () => number): number | null {
  const retry = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retry) && retry > 0)
    return Math.max(1, Math.ceil(retry / 60));
  if (response.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    return Number.isFinite(reset) && reset > 0
      ? Math.max(1, Math.ceil((reset * 1000 - now()) / 60_000))
      : 60;
  }
  return response.status === 429 ? 1 : null;
}

function httpFailure(response: Response, now: () => number): Failure {
  const { status } = response;
  if (status === 404 || status === 409) return failure(tr('github.notFound'));
  if (status === 403 || status === 429) {
    const minutes = waitMinutes(response, now);
    if (minutes !== null) {
      return failure(tr('github.rateLimit', { minutes }), true);
    }
  }
  return failure(tr('github.failed', { status }));
}

/** Liest den Text, bricht aber bei mehr als `max` Bytes ab (null) – ohne alles zu laden. */
async function readCapped(
  response: Response,
  max: number,
): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
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
  return Buffer.concat(chunks);
}

/**
 * Eine Anfrage (nur GET, nur https, nur zu `host`, ohne Weiterleitung, mit Zeit- und
 * Größenlimit). Doppelt gesichert: Auch wenn ein Parser sich irrt, geht nichts an einen
 * anderen Host.
 */
async function get(
  url: string,
  host: string,
  maxBytes: number,
  fetchImpl: SkillFetch,
  now: () => number,
): Promise<Fetched> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return failure(tr('github.invalidLink'));
  }
  if (target.protocol !== 'https:' || target.hostname !== host) {
    return failure(tr('github.invalidLink'));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(target.href, {
      redirect: 'error',
      signal: controller.signal,
      ...(host === GITHUB_API_HOST && { headers: API_HEADERS }),
    });
    if (!response.ok) return httpFailure(response, now);
    const bytes = await readCapped(response, maxBytes);
    if (bytes === null) return failure(tr('github.tooLarge'));
    return { ok: true, value: bytes };
  } catch (error) {
    if (controller.signal.aborted) return failure(tr('github.timeout'), true);
    // Weiterleitungen sind ausgeschaltet; ein Umzug des Projekts landet hier.
    return failure(
      error instanceof Error && /redirect/i.test(error.message)
        ? tr('github.redirect')
        : tr('github.offline'),
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(
  url: string,
  maxBytes: number,
  fetchImpl: SkillFetch,
  now: () => number,
): Promise<{ ok: true; value: unknown } | Failure> {
  const response = await get(url, GITHUB_API_HOST, maxBytes, fetchImpl, now);
  if (!response.ok) return response;
  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder().decode(response.value)),
    };
  } catch {
    return failure(tr('github.badResponse'));
  }
}

/** Ein Treffer der Projekt-Suche – alles von GitHub wird geprüft, nichts blind übernommen. */
function toHit(item: unknown): GithubRepoHit | null {
  if (!item || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  const fullName = typeof r.full_name === 'string' ? r.full_name : '';
  if (!isGithubRepoName(fullName)) return null;
  const license = (r.license as { spdx_id?: unknown } | null)?.spdx_id;
  const pushed = typeof r.pushed_at === 'string' ? r.pushed_at : '';
  return {
    fullName,
    description:
      typeof r.description === 'string' ? r.description.slice(0, 300) : '',
    stars:
      typeof r.stargazers_count === 'number' &&
      Number.isFinite(r.stargazers_count)
        ? r.stargazers_count
        : 0,
    pushedAt: /^\d{4}-\d{2}-\d{2}/.test(pushed) ? pushed.slice(0, 10) : '',
    license:
      typeof license === 'string' && license !== 'NOASSERTION'
        ? license.slice(0, 40)
        : null,
    archived: r.archived === true,
  };
}

/** Eine Datei im Dateibaum eines Projekts. */
export interface TreeBlob {
  path: string;
  size: number;
}

/** Ein Skill im Projekt: die SKILL.md und das, was davon mitgeladen würde. */
export interface SkillFolder {
  /** Ordner im Projekt (leer = ganz oben). */
  dir: string;
  name: string;
  main: TreeBlob;
  mainTooBig: boolean;
  /** Zusatzdateien, die geladen würden (Pfad im Projekt + Pfad im Skill). */
  files: { path: string; rel: string; size: number }[];
  skipped: SkippedFile[];
  skippedCount: number;
}

/** Ordner, in denen es keine Skills gibt, die du haben willst (Abhängigkeiten, Mac-Reste). */
const IGNORED_DIRS = new Set(['node_modules', '__MACOSX', '.git']);

/**
 * Findet die Skills in einem Dateibaum: jeder Ordner mit einer SKILL.md. Dateien gehören
 * zum nächsten Skill-Ordner darüber; was nicht übernommen würde (Skripte, zu groß, zu
 * tief …), wird schon hier mit Grund aussortiert – dafür wird nichts heruntergeladen.
 * `prefix` begrenzt auf einen Ordner im Projekt (leer = alles).
 */
export function findSkillFolders(
  blobs: TreeBlob[],
  prefix: string,
  repoName: string,
): SkillFolder[] {
  const inScope = (p: string) =>
    prefix === '' || p === prefix || p.startsWith(`${prefix}/`);

  const mains = new Map<string, TreeBlob>();
  for (const blob of blobs) {
    if (!isSkillMd(blob.path) || !inScope(blob.path)) continue;
    const dir = dirOf(blob.path);
    if (dir.split('/').some((part) => IGNORED_DIRS.has(part))) continue;
    if (dir !== '' && safeSkillPath(dir) === null) continue;
    if (!mains.has(dir)) mains.set(dir, blob);
  }
  if (mains.size === 0) return [];

  // Zu welchem Skill gehört ein Pfad? Der nächste Ordner darüber mit einer SKILL.md.
  const ownerOf = (p: string) => {
    let dir = dirOf(p);
    for (;;) {
      if (mains.has(dir)) return dir;
      if (dir === '') return undefined;
      dir = dirOf(dir);
    }
  };
  const extras = new Map<string, TreeBlob[]>(
    [...mains.keys()].map((dir) => [dir, []]),
  );
  for (const blob of blobs) {
    const dir = ownerOf(blob.path);
    if (dir !== undefined && blob !== mains.get(dir))
      extras.get(dir)!.push(blob);
  }

  const folders: SkillFolder[] = [];
  for (const [dir, main] of mains) {
    const folder: SkillFolder = {
      dir,
      name: baseName(dir) || repoName,
      main,
      mainTooBig: main.size > SKILL_MD_MAX_BYTES,
      files: [],
      skipped: [],
      skippedCount: 0,
    };
    const skip = (path: string, reason: string) => {
      folder.skippedCount++;
      if (folder.skipped.length < SKIPPED_SHOWN_MAX) {
        folder.skipped.push({ path, reason });
      }
    };
    let total = main.size;
    for (const blob of (extras.get(dir) ?? []).sort((a, b) =>
      a.path.localeCompare(b.path),
    )) {
      const rel = dir ? blob.path.slice(dir.length + 1) : blob.path;
      if (isJunkPath(rel)) continue;
      const safe = safeSkillPath(rel);
      if (!safe) {
        skip(rel.slice(0, 120), tr('skills.import.skipUnsafe'));
        continue;
      }
      const problem = formatProblem(safe);
      if (problem) skip(safe, problem);
      else if (safe.split('/').length - 1 > SKILL_FILE_DEPTH_MAX) {
        skip(safe, tr('skills.import.skipDeep'));
      } else if (blob.size > SKILL_FILE_MAX_BYTES) {
        skip(safe, tr('skills.import.skipTooBig'));
      } else if (folder.files.length >= SKILL_FILES_MAX) {
        skip(safe, tr('skills.import.skipTooMany'));
      } else if (total + blob.size > SKILL_IMPORT_LIMITS.skillBytes) {
        skip(safe, tr('skills.import.skipTooBig'));
      } else {
        total += blob.size;
        folder.files.push({ path: blob.path, rel: safe, size: blob.size });
      }
    }
    if (folder.skippedCount > folder.skipped.length) {
      folder.skipped.push({
        path: '…',
        reason: tr('github.moreSkipped', {
          count: folder.skippedCount - folder.skipped.length,
        }),
      });
    }
    folders.push(folder);
  }
  return folders.sort((a, b) => a.dir.localeCompare(b.dir));
}

const itemOf = (folder: SkillFolder, index: number): GithubSkillItem => ({
  index,
  name: folder.name,
  path: folder.dir,
  mdBytes: folder.main.size,
  files: folder.files.length,
  skipped: folder.skippedCount,
  bytes: folder.main.size + folder.files.reduce((sum, f) => sum + f.size, 0),
});

/** Eine geöffnete Skill-Liste: bleibt im Hauptprozess, die Oberfläche schickt nur Nummern zurück. */
interface ListSession {
  ref: GithubRepoRef;
  folders: SkillFolder[];
  truncated: boolean;
  at: number;
}

/**
 * „Von GitHub“: Suchbegriff → Projekte, Projekt/Ordner → Skills darin, ausgewählte Skills →
 * Vorschau mit Sicherheitsprüfung (dieselbe wie beim Ablegen von Dateien). Es wird NICHTS
 * gespeichert und nichts ausgeführt; gespeichert wird erst mit „Hinzufügen“.
 */
export class GithubFinder {
  private readonly lists = new Map<string, ListSession>();

  constructor(
    private readonly imports: SkillImports,
    private readonly fetchImpl: SkillFetch,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = randomUUID,
  ) {}

  async open(input: string): Promise<Result<GithubOpenResult>> {
    const parsed = parseGithubInput(input);
    if (!parsed.ok) return parsed;
    const target = parsed.value;

    if (target.kind === 'search') {
      const response = await getJson(
        githubSearchUrl(target.query),
        SEARCH_MAX_BYTES,
        this.fetchImpl,
        this.now,
      );
      if (!response.ok) return { ok: false, error: response.error };
      const body = (response.value ?? {}) as Record<string, unknown>;
      const hits = (Array.isArray(body.items) ? body.items : []).flatMap(
        (item) => toHit(item) ?? [],
      );
      const total =
        typeof body.total_count === 'number' &&
        Number.isFinite(body.total_count)
          ? body.total_count
          : hits.length;
      return {
        ok: true,
        value: { kind: 'search', query: target.query, total, hits },
      };
    }

    if (target.kind === 'file') {
      const label = `${target.ref.owner}/${target.ref.repo}/${target.path}`;
      const file = await get(
        githubRawUrl(target.ref, target.path),
        GITHUB_RAW_HOST,
        SKILL_MD_MAX_BYTES,
        this.fetchImpl,
        this.now,
      );
      if (!file.ok) return { ok: false, error: file.error };
      const stem = baseName(target.path).replace(/\.md$/i, '');
      const preview = await this.imports.register(
        [prepareSkill(label, skillIdFromName(stem), file.value, [], [])],
        [],
      );
      return preview.ok
        ? { ok: true, value: { kind: 'preview', preview: preview.value } }
        : preview;
    }

    return this.openRepo(target.ref, target.path);
  }

  private async openRepo(
    ref: GithubRepoRef,
    path: string,
  ): Promise<Result<GithubOpenResult>> {
    const response = await getJson(
      githubTreeUrl(ref),
      TREE_MAX_BYTES,
      this.fetchImpl,
      this.now,
    );
    if (!response.ok) return { ok: false, error: response.error };
    const body = (response.value ?? {}) as Record<string, unknown>;
    if (!Array.isArray(body.tree)) {
      return { ok: false, error: tr('github.badResponse') };
    }
    const truncated = body.truncated === true;
    const blobs: TreeBlob[] = [];
    for (const entry of body.tree as unknown[]) {
      const e = (entry ?? {}) as Record<string, unknown>;
      if (e.type !== 'blob' || typeof e.path !== 'string') continue;
      if (e.path.length > 500) continue;
      blobs.push({
        path: e.path,
        size:
          typeof e.size === 'number' && Number.isFinite(e.size) ? e.size : 0,
      });
    }

    const label = [ref.owner, ref.repo, ...(path ? [path] : [])].join('/');
    const found = findSkillFolders(blobs, path, ref.repo);
    if (found.length === 0) {
      return {
        ok: false,
        error: [
          tr('github.noSkills', { label }),
          ...(truncated ? [tr('github.truncated')] : []),
        ].join(' '),
      };
    }
    const folders = found.slice(0, GITHUB_LIST_MAX);
    const notices = [
      ...(truncated ? [tr('github.truncated')] : []),
      ...(found.length > folders.length
        ? [
            tr('github.moreSkills', {
              total: found.length,
              shown: folders.length,
            }),
          ]
        : []),
    ];

    const listId = this.newId();
    this.prune();
    this.lists.set(listId, { ref, folders, truncated, at: this.now() });
    while (this.lists.size > SKILL_IMPORT_SESSIONS_MAX) {
      this.lists.delete(this.lists.keys().next().value!);
    }
    return {
      ok: true,
      value: {
        kind: 'skills',
        listId,
        label,
        skills: folders.map(itemOf),
        notices,
      },
    };
  }

  /**
   * Lädt die gewählten Skills (nur Dateien, die im Dateibaum als übernehmbar gelten) und
   * macht daraus die Vorschau. Die Oberfläche nennt nur die Liste und Nummern – Pfade
   * kommen nie von dort.
   */
  async inspect(
    listId: unknown,
    picks: unknown,
  ): Promise<Result<SkillImportPreview>> {
    this.prune();
    const session =
      typeof listId === 'string' ? this.lists.get(listId) : undefined;
    if (!session) return { ok: false, error: tr('github.expired') };
    if (
      !Array.isArray(picks) ||
      picks.length === 0 ||
      picks.length > SKILL_IMPORT_LIMITS.skills ||
      new Set(picks).size !== picks.length ||
      !picks.every(
        (p) => Number.isInteger(p) && p >= 0 && p < session.folders.length,
      )
    ) {
      return { ok: false, error: tr('github.badPicks') };
    }
    session.at = this.now();
    const chosen = (picks as number[]).map((p) => session.folders[p]);

    // Alle Downloads in eine Liste; wenige gleichzeitig, und bei „kein Netz“ sofort Schluss.
    const tasks: { folder: number; file: number; path: string; max: number }[] =
      [];
    chosen.forEach((folder, f) => {
      // Ist die SKILL.md schon zu groß, lohnt sich nichts davon zu laden.
      if (folder.mainTooBig) return;
      tasks.push({
        folder: f,
        file: -1,
        path: folder.main.path,
        max: SKILL_MD_MAX_BYTES,
      });
      folder.files.forEach((file, i) =>
        tasks.push({
          folder: f,
          file: i,
          path: file.path,
          max: SKILL_FILE_MAX_BYTES,
        }),
      );
    });
    const results: (Fetched | undefined)[] = Array.from(
      { length: tasks.length },
      () => undefined,
    );
    const state: { next: number; fatal: Failure | null } = {
      next: 0,
      fatal: null,
    };
    const worker = async () => {
      while (!state.fatal) {
        const index = state.next++;
        if (index >= tasks.length) return;
        const result = await get(
          githubRawUrl(session.ref, tasks[index].path),
          GITHUB_RAW_HOST,
          tasks[index].max,
          this.fetchImpl,
          this.now,
        );
        results[index] = result;
        if (!result.ok && result.fatal) state.fatal = result;
      }
    };
    await Promise.all(
      Array.from({ length: DOWNLOADS_AT_ONCE }, () => worker()),
    );
    if (state.fatal) return { ok: false, error: state.fatal.error };

    const resultOf = (folder: number, file: number) =>
      results[tasks.findIndex((t) => t.folder === folder && t.file === file)];

    const skills: PreparedSkill[] = chosen.map((folder, f) => {
      const source = [
        session.ref.owner,
        session.ref.repo,
        ...(folder.dir ? [folder.dir] : []),
      ].join('/');
      const fallbackName = skillIdFromName(folder.name);
      const skipped = [...folder.skipped];
      const main = folder.mainTooBig ? undefined : resultOf(f, -1);
      if (!main?.ok) {
        return {
          source,
          name: fallbackName,
          description: '',
          body: '',
          files: [],
          skipped,
          findings: [],
          error: tr('github.mainFailed', {
            reason: main ? main.error : tr('github.tooLarge'),
          }),
        };
      }
      const extras: RawFile[] = [];
      folder.files.forEach((file, i) => {
        const result = resultOf(f, i);
        if (result?.ok) extras.push({ path: file.rel, data: result.value });
        else skipped.push({ path: file.rel, reason: tr('github.fileFailed') });
      });
      return prepareSkill(source, fallbackName, main.value, extras, skipped);
    });

    return this.imports.register(
      skills,
      session.truncated ? [tr('github.truncated')] : [],
    );
  }

  private prune() {
    const limit = this.now() - SKILL_IMPORT_TTL_MS;
    for (const [id, session] of this.lists) {
      if (session.at < limit) this.lists.delete(id);
    }
  }
}
