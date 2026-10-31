import { randomUUID } from 'node:crypto';
import { unzipSync } from 'fflate';
import type { Result } from '../../shared/api';
import { estimateTokens } from '../../shared/context';
import { messageLocale, tr } from '../../shared/messages';
import {
  SKILL_IMPORT_LIMITS,
  SKILL_IMPORT_SESSIONS_MAX,
  SKILL_IMPORT_TTL_MS,
  SKILL_PREVIEW_CHARS,
  type SkillCandidateView,
  type SkillFinding,
  type SkillImportFile,
  type SkillImportPreview,
  type SkillImportResult,
  type SkippedFile,
} from '../../shared/skill-import';
import { scanSkillFiles } from '../../shared/skill-scan';
import {
  isSkillTextFile,
  parseSkill,
  SKILL_BODY_MAX,
  SKILL_DESCRIPTION_MAX,
  SKILL_FILE_DEPTH_MAX,
  SKILL_FILE_MAX_BYTES,
  SKILL_FILES_MAX,
  SKILL_MD_MAX_BYTES,
  SKILL_NAME_MAX,
  skillIdFromName,
  type SkillView,
} from '../../shared/skills';
import { isJunkPath, safeSkillPath } from './skill-paths';
import type { SkillStore } from './skill-store';

/** Fehler mit fertigem Text für den Nutzer (alles andere wird zu „ZIP unlesbar“). */
class ImportError extends Error {}

/** Skripte und Programme: werden nie gespeichert, nie ausgeführt – nur in der Vorschau genannt. */
const PROGRAM_EXTENSIONS = new Set([
  '.ps1',
  '.psm1',
  '.psd1',
  '.py',
  '.pyw',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
  '.vbs',
  '.vbe',
  '.wsf',
  '.exe',
  '.dll',
  '.msi',
  '.jar',
  '.com',
  '.scr',
  '.lnk',
  '.so',
  '.dylib',
  '.rb',
  '.pl',
  '.php',
  '.cs',
]);

/** Ein Skill, fertig gelesen und geprüft – noch nicht gespeichert. */
export interface PreparedSkill {
  source: string;
  name: string;
  description: string;
  body: string;
  files: { path: string; text: string }[];
  skipped: SkippedFile[];
  findings: SkillFinding[];
  error?: string;
}

interface RawFile {
  path: string;
  data: Uint8Array;
}

const baseName = (p: string) => p.split('/').pop() ?? p;
const dirOf = (p: string) =>
  p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
const extOf = (p: string) => {
  const dot = p.lastIndexOf('.');
  return dot > 0 ? p.slice(dot).toLowerCase() : '';
};
const isSkillMd = (p: string) => baseName(p).toLowerCase() === 'skill.md';
const bytes = (n: number) =>
  `${(n / 1_000_000).toLocaleString(messageLocale())} MB`;

/** Warum eine Datei neben der SKILL.md nicht übernommen wird – oder null, wenn sie ein Textformat ist. */
function formatProblem(rel: string): string | null {
  if (isSkillTextFile(rel)) return null;
  return PROGRAM_EXTENSIONS.has(extOf(rel))
    ? tr('skills.import.skipScript')
    : tr('skills.import.skipNotText');
}

function decodeText(data: Uint8Array): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    return text.includes('\0') ? null : text;
  } catch {
    return null;
  }
}

/**
 * Liest eine ZIP, ohne etwas auf die Festplatte zu schreiben. Vor dem Entpacken wird
 * jeder Eintrag geprüft (Pfad, Format, angegebene Größe); Skripte und Programme werden
 * gar nicht erst entpackt. Danach muss die echte Größe zur angegebenen passen.
 */
function readZip(
  name: string,
  data: Uint8Array,
): { files: RawFile[]; skipped: SkippedFile[] } {
  let count = 0;
  let declared = 0;
  const expected = new Map<string, number>();
  const skipped: SkippedFile[] = [];
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(data, {
      filter: (entry) => {
        if (++count > SKILL_IMPORT_LIMITS.zipEntries) {
          throw new ImportError(
            tr('skills.import.zipEntries', {
              name,
              max: SKILL_IMPORT_LIMITS.zipEntries,
            }),
          );
        }
        if (entry.name.endsWith('/') || entry.name.endsWith('\\')) return false;
        if (isJunkPath(entry.name)) return false;
        const rel = safeSkillPath(entry.name);
        if (!rel) {
          skipped.push({
            path: entry.name.slice(0, 120),
            reason: tr('skills.import.skipUnsafe'),
          });
          return false;
        }
        const main = isSkillMd(rel);
        const problem = main ? null : formatProblem(rel);
        if (problem) {
          skipped.push({ path: rel, reason: problem });
          return false;
        }
        if (
          entry.originalSize >
          (main ? SKILL_MD_MAX_BYTES : SKILL_FILE_MAX_BYTES)
        ) {
          skipped.push({ path: rel, reason: tr('skills.import.skipTooBig') });
          return false;
        }
        declared += entry.originalSize;
        if (declared > SKILL_IMPORT_LIMITS.zipUnpackedBytes) {
          throw new ImportError(
            tr('skills.import.zipUnpacked', {
              name,
              max: bytes(SKILL_IMPORT_LIMITS.zipUnpackedBytes),
            }),
          );
        }
        expected.set(entry.name, entry.originalSize);
        return true;
      },
    });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(tr('skills.import.zipBroken', { name }));
  }
  const files: RawFile[] = [];
  for (const [entryName, content] of Object.entries(entries)) {
    // Die echte Größe muss zur angegebenen passen (gefälschte Angaben → abgelehnt).
    if (content.length !== expected.get(entryName)) {
      throw new ImportError(tr('skills.import.zipBroken', { name }));
    }
    files.push({ path: safeSkillPath(entryName)!, data: content });
  }
  return { files, skipped };
}

/** Macht aus der SKILL.md und den Zusatzdateien einen geprüften Skill (oder einen mit Fehler). */
function prepareSkill(
  source: string,
  fallbackName: string,
  main: Uint8Array,
  extras: RawFile[],
  skipped: SkippedFile[],
): PreparedSkill {
  const empty: PreparedSkill = {
    source,
    name: fallbackName,
    description: '',
    body: '',
    files: [],
    skipped,
    findings: [],
  };
  const text = decodeText(main);
  if (text === null) {
    return { ...empty, error: tr('skills.import.notText', { name: source }) };
  }
  const parsed = parseSkill(text, fallbackName);
  const name = parsed.name.slice(0, SKILL_NAME_MAX).trim() || fallbackName;
  const description = parsed.description.slice(0, SKILL_DESCRIPTION_MAX);

  const kept: { path: string; text: string }[] = [];
  const skippedHere = [...skipped];
  const seen = new Set<string>();
  let total = 0;
  const skip = (path: string, reason: string) =>
    skippedHere.push({ path, reason });
  for (const file of [...extras].sort((a, b) => a.path.localeCompare(b.path))) {
    const rel = file.path;
    if (rel.split('/').length - 1 > SKILL_FILE_DEPTH_MAX) {
      skip(rel, tr('skills.import.skipDeep'));
    } else if (seen.has(rel.toLowerCase())) {
      skip(rel, tr('skills.import.skipDuplicate'));
    } else if (kept.length >= SKILL_FILES_MAX) {
      skip(rel, tr('skills.import.skipTooMany'));
    } else if (total + file.data.length > SKILL_IMPORT_LIMITS.skillBytes) {
      skip(rel, tr('skills.import.skipTooBig'));
    } else {
      const content = decodeText(file.data);
      if (content === null) {
        skip(rel, tr('skills.import.skipNotUtf8'));
      } else {
        seen.add(rel.toLowerCase());
        total += file.data.length;
        kept.push({ path: rel, text: content });
      }
    }
  }

  let error: string | undefined;
  if (!parsed.body) error = tr('skills.bodyEmpty');
  else if (parsed.body.length > SKILL_BODY_MAX) {
    error = tr('skills.bodyMax', {
      max: SKILL_BODY_MAX.toLocaleString(messageLocale()),
    });
  }
  return {
    source,
    name,
    description,
    body: parsed.body,
    files: kept,
    skipped: skippedHere,
    findings: error
      ? []
      : scanSkillFiles([{ path: 'SKILL.md', text }, ...kept], skippedHere),
    ...(error && { error }),
  };
}

/** Alle Skills einer ZIP: jeder Ordner mit einer SKILL.md; Dateien gehören zum nächsten Skill-Ordner darüber. */
function skillsFromZip(
  name: string,
  zip: { files: RawFile[]; skipped: SkippedFile[] },
  fallbackBase: string,
): { skills: PreparedSkill[]; outside: number } {
  const mains = zip.files.filter((f) => isSkillMd(f.path));
  if (mains.length === 0) {
    throw new ImportError(tr('skills.import.noSkill', { name }));
  }
  if (mains.length > SKILL_IMPORT_LIMITS.skills) {
    throw new ImportError(
      tr('skills.import.tooManySkills', {
        name,
        max: SKILL_IMPORT_LIMITS.skills,
      }),
    );
  }
  // Längster Ordner zuerst: Ein Skill in einem Unterordner behält seine eigenen Dateien.
  const dirs = [...new Set(mains.map((f) => dirOf(f.path)))].sort(
    (a, b) => b.length - a.length,
  );
  const ownerOf = (path: string) =>
    dirs.find((dir) => dir === '' || path.startsWith(`${dir}/`));
  const relative = (path: string, dir: string) =>
    dir ? path.slice(dir.length + 1) : path;

  const groups = new Map<
    string,
    { main?: RawFile; extras: RawFile[]; skipped: SkippedFile[] }
  >(dirs.map((dir) => [dir, { extras: [], skipped: [] }]));
  let outside = 0;
  for (const file of zip.files) {
    const dir = ownerOf(file.path);
    if (dir === undefined) {
      outside++;
      continue;
    }
    const rel = relative(file.path, dir);
    const group = groups.get(dir)!;
    if (rel.toLowerCase() === 'skill.md') group.main = file;
    else group.extras.push({ path: rel, data: file.data });
  }
  for (const entry of zip.skipped) {
    const dir = ownerOf(entry.path);
    if (dir !== undefined) {
      groups.get(dir)!.skipped.push({
        path: relative(entry.path, dir),
        reason: entry.reason,
      });
    }
  }

  const skills: PreparedSkill[] = [];
  for (const dir of [...dirs].sort()) {
    const group = groups.get(dir)!;
    if (!group.main) continue;
    const folder = baseName(dir);
    skills.push(
      prepareSkill(
        dir ? `${name}: ${dir}` : name,
        skillIdFromName(folder || fallbackBase),
        group.main.data,
        group.extras,
        group.skipped,
      ),
    );
  }
  return { skills, outside };
}

/**
 * Liest die abgelegten Dateien (.md, .zip, .skill) und prüft sie – schreibt nichts.
 * Was nicht geht, kommt als Hinweis zurück; die übrigen Dateien werden weiter gelesen.
 */
export function inspectUpload(files: SkillImportFile[]): {
  skills: PreparedSkill[];
  notices: string[];
} {
  const skills: PreparedSkill[] = [];
  const notices: string[] = [];
  for (const file of files) {
    const name = baseName(file.name.replace(/\\/g, '/')).slice(0, 120);
    const ext = extOf(name);
    const stem = name.slice(0, name.length - ext.length);
    try {
      if (ext === '.md') {
        skills.push(
          prepareSkill(
            name,
            skillIdFromName(isSkillMd(name) ? 'skill' : stem),
            file.data,
            [],
            [],
          ),
        );
      } else if (ext === '.zip' || ext === '.skill') {
        const found = skillsFromZip(
          name,
          readZip(name, file.data),
          skillIdFromName(stem),
        );
        skills.push(...found.skills);
        if (found.outside > 0) {
          notices.push(
            tr('skills.import.outside', { count: found.outside, name }),
          );
        }
      } else {
        notices.push(tr('skills.import.unsupported', { name }));
      }
    } catch (error) {
      if (!(error instanceof ImportError)) throw error;
      notices.push(error.message);
    }
    if (skills.length > SKILL_IMPORT_LIMITS.skills) {
      throw new ImportError(
        tr('skills.import.tooManySkills', {
          name,
          max: SKILL_IMPORT_LIMITS.skills,
        }),
      );
    }
  }
  return { skills, notices };
}

/** Prüft, was die Oberfläche schickt (alles von dort ist nur eine Behauptung). */
export function checkUpload(input: unknown): SkillImportFile[] {
  if (!Array.isArray(input))
    throw new ImportError(tr('skills.import.badInput'));
  if (input.length === 0) throw new ImportError(tr('skills.import.badInput'));
  if (input.length > SKILL_IMPORT_LIMITS.files) {
    throw new ImportError(
      tr('skills.import.tooManyFiles', { max: SKILL_IMPORT_LIMITS.files }),
    );
  }
  let total = 0;
  const files = input.map((item): SkillImportFile => {
    const raw = (item ?? {}) as { name?: unknown; data?: unknown };
    const data =
      raw.data instanceof Uint8Array
        ? raw.data
        : raw.data instanceof ArrayBuffer
          ? new Uint8Array(raw.data)
          : null;
    if (
      typeof raw.name !== 'string' ||
      !raw.name ||
      raw.name.length > 300 ||
      !data
    ) {
      throw new ImportError(tr('skills.import.badInput'));
    }
    if (data.byteLength > SKILL_IMPORT_LIMITS.fileBytes) {
      throw new ImportError(
        tr('skills.import.fileTooBig', {
          name: raw.name.slice(0, 80),
          max: bytes(SKILL_IMPORT_LIMITS.fileBytes),
        }),
      );
    }
    total += data.byteLength;
    return { name: raw.name, data };
  });
  if (total > SKILL_IMPORT_LIMITS.totalBytes) {
    throw new ImportError(
      tr('skills.import.totalTooBig', {
        max: bytes(SKILL_IMPORT_LIMITS.totalBytes),
      }),
    );
  }
  return files;
}

/**
 * Hält die geprüften Skills im Speicher, bis du „Hinzufügen“ klickst: Die Oberfläche
 * schickt nur die Kennung der Vorschau und deine Auswahl zurück – nie noch einmal
 * den Inhalt. Eine Vorschau gilt 15 Minuten, höchstens 5 gleichzeitig.
 */
export class SkillImports {
  private readonly sessions = new Map<
    string,
    { skills: PreparedSkill[]; at: number }
  >();

  constructor(
    private readonly store: SkillStore,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = randomUUID,
  ) {}

  async inspect(input: unknown): Promise<Result<SkillImportPreview>> {
    try {
      const { skills, notices } = inspectUpload(checkUpload(input));
      const existing = new Set(
        (await this.store.list()).flatMap((s) => [s.name.toLowerCase(), s.id]),
      );
      const importId = this.newId();
      this.prune();
      this.sessions.set(importId, { skills, at: this.now() });
      while (this.sessions.size > SKILL_IMPORT_SESSIONS_MAX) {
        this.sessions.delete(this.sessions.keys().next().value!);
      }
      const seen = new Set<string>();
      const candidates = skills.map((skill, index): SkillCandidateView => {
        const key = skill.name.toLowerCase();
        const duplicate =
          existing.has(key) ||
          existing.has(skillIdFromName(skill.name)) ||
          seen.has(key);
        seen.add(key);
        return {
          index,
          source: skill.source,
          name: skill.name,
          description: skill.description,
          bodyPreview: skill.body.slice(0, SKILL_PREVIEW_CHARS),
          bodyLength: skill.body.length,
          tokens: estimateTokens(skill.body),
          files: skill.files.map((f) => ({
            path: f.path,
            size: Buffer.byteLength(f.text),
          })),
          skipped: skill.skipped,
          findings: skill.findings,
          duplicate,
          ...(skill.error && { error: skill.error }),
        };
      });
      return { ok: true, value: { importId, candidates, notices } };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async install(
    importId: unknown,
    picks: unknown,
  ): Promise<Result<SkillImportResult>> {
    this.prune();
    const session =
      typeof importId === 'string' ? this.sessions.get(importId) : undefined;
    if (!session) return { ok: false, error: tr('skills.import.expired') };
    if (
      !Array.isArray(picks) ||
      picks.length === 0 ||
      new Set(picks).size !== picks.length ||
      !picks.every(
        (p) => Number.isInteger(p) && p >= 0 && p < session.skills.length,
      )
    ) {
      return { ok: false, error: tr('skills.import.badPicks') };
    }
    const installed: SkillView[] = [];
    const failed: string[] = [];
    for (const index of picks as number[]) {
      const skill = session.skills[index];
      if (skill.error) {
        failed.push(`${skill.name}: ${skill.error}`);
        continue;
      }
      try {
        installed.push(await this.store.install(skill));
      } catch (error) {
        failed.push(
          `${skill.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.sessions.delete(importId as string);
    return { ok: true, value: { installed, failed } };
  }

  private prune() {
    const limit = this.now() - SKILL_IMPORT_TTL_MS;
    for (const [id, session] of this.sessions) {
      if (session.at < limit) this.sessions.delete(id);
    }
  }
}
