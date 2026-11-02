import path from 'node:path';
import { ipcMain, shell } from 'electron';
import { IpcChannels, type Result } from '../shared/api';
import type { GithubOpenResult } from '../shared/github';
import { checkSkillInput, isSkillId, type SkillView } from '../shared/skills';
import { GithubFinder, type SkillFetch } from './skills/github-find';
import { SkillImports } from './skills/skill-import';
import type { SkillStore } from './skills/skill-store';
import { tr } from '../shared/messages';

/** Skills für die Oberfläche: auflisten, speichern, löschen, Ordner im Explorer zeigen. */
export function registerSkillHandlers(
  store: SkillStore,
  /** Für Tests austauschbar; sonst das normale fetch. */
  skillFetch: SkillFetch = (url, init) => globalThis.fetch(url, init),
) {
  const imports = new SkillImports(store);
  const failed = (error: unknown) => ({
    ok: false as const,
    error: error instanceof Error ? error.message : String(error),
  });

  ipcMain.handle(
    IpcChannels.listSkills,
    async (): Promise<Result<SkillView[]>> => {
      try {
        return { ok: true, value: await store.list() };
      } catch (error) {
        return failed(error);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.saveSkill,
    async (_event, input: unknown): Promise<Result<SkillView>> => {
      const checked = checkSkillInput(input);
      if (!checked.ok) return checked;
      try {
        return { ok: true, value: await store.save(checked.value) };
      } catch (error) {
        return failed(error);
      }
    },
  );

  // „Von GitHub“: suchen, Skills eines Projekts auflisten, ausgewählte prüfen. Nur lesend und
  // nur auf Klick; gespeichert wird erst mit installSkills (nach der Vorschau).
  const github = new GithubFinder(imports, skillFetch);
  ipcMain.handle(
    IpcChannels.openGithub,
    (_event, input: unknown): Promise<Result<GithubOpenResult>> =>
      typeof input === 'string' && input.length <= 500
        ? github.open(input)
        : Promise.resolve({ ok: false, error: tr('github.invalidLink') }),
  );
  ipcMain.handle(
    IpcChannels.inspectGithub,
    (_event, listId: unknown, picks: unknown) => github.inspect(listId, picks),
  );

  // „Skill hinzufügen“: Die Dateien kommen als Bytes aus der Oberfläche (kein Pfad, nichts
  // wird von der Platte gelesen). Erst die Vorschau, gespeichert wird mit installSkills.
  ipcMain.handle(IpcChannels.inspectSkillFiles, (_event, files: unknown) =>
    imports.inspect(files),
  );
  ipcMain.handle(
    IpcChannels.installSkills,
    (_event, importId: unknown, picks: unknown) =>
      imports.install(importId, picks),
  );

  ipcMain.handle(
    IpcChannels.deleteSkill,
    async (_event, id: unknown): Promise<Result<void>> => {
      if (typeof id !== 'string' || !isSkillId(id)) {
        return { ok: false, error: tr('error.invalidSkillId') };
      }
      try {
        await store.remove(id);
        return { ok: true, value: undefined };
      } catch (error) {
        return failed(error);
      }
    },
  );

  // Öffnet nur Ordner (den Skill-Ordner oder einen Skill darin) – nie eine Datei,
  // damit Windows nichts „ausführt“.
  ipcMain.handle(
    IpcChannels.openSkillFolder,
    async (_event, id: unknown): Promise<Result<void>> => {
      if (id !== undefined && (typeof id !== 'string' || !isSkillId(id))) {
        return { ok: false, error: tr('error.invalidSkillId') };
      }
      const target =
        id === undefined ? store.root : path.join(store.root, id as string);
      const error = await shell.openPath(target);
      return error ? { ok: false, error } : { ok: true, value: undefined };
    },
  );
}
