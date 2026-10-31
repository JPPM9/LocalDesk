import path from 'node:path';
import type { MemoryView } from '../../shared/api';
import { localDate } from './note-format';
import { sanitizeFileName, type VaultWriter } from './vault';
import { tr } from '../../shared/messages';

/** Ein Fakt bleibt kurz – lange Texte gehören in Notizen oder Wissen. */
export const MEMORY_MAX_LENGTH = 500;
const GLOBAL_DIR = 'Erinnerungen';
const PROJECTS_DIR = 'Projekte';
const TAG = 'localdesk/erinnerung';

export interface MemoryProject {
  id: string;
  name: string;
}

/**
 * Eine Erinnerung als Obsidian-Notiz: kleiner Kopf (Frontmatter) mit Datum, Tag
 * und ggf. Projekt-ID, darunter der Fakt. Die Projekt-ID (nicht der Ordnername)
 * ordnet die Notiz zu – so bleibt sie beim Umbenennen des Projekts gültig.
 */
export function formatMemory(
  text: string,
  date: Date,
  project?: MemoryProject,
): string {
  const lines = [
    '---',
    `tags: [${TAG}]`,
    `erstellt: ${localDate(date)}`,
    ...(project
      ? [
          `projekt: "${project.name.replace(/"/g, "'")}"`,
          `projekt-id: ${project.id}`,
        ]
      : []),
    '---',
    '',
    text.trim(),
    '',
  ];
  return lines.join('\n');
}

/** Liest eine Erinnerungs-Notiz – auch wenn du sie in Obsidian bearbeitet hast. */
export function parseMemory(content: string): {
  text: string;
  projectId?: string;
  created?: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  const front = match?.[1] ?? '';
  const body = (match ? content.slice(match[0].length) : content).trim();
  const field = (name: string) =>
    new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(front)?.[1]?.trim();
  const projectId = field('projekt-id');
  const created = field('erstellt');
  return {
    text: body,
    ...(projectId && { projectId }),
    ...(created && { created }),
  };
}

/** Titel/Dateiname: Anfang des Fakts. */
function titleOf(text: string): string {
  const firstLine = text.trim().split('\n')[0];
  return firstLine.length <= 60 ? firstLine : `${firstLine.slice(0, 59)}…`;
}

/**
 * Erinnerungen im eigenen Unterordner: global in `Erinnerungen/`, für Projekte in
 * `Projekte/<Name>/Erinnerungen/`. Gelesen wird bei jedem Zugriff frisch – was du
 * in Obsidian änderst, gilt sofort.
 */
export class MemoryStore {
  constructor(
    private readonly writer: VaultWriter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(projects: MemoryProject[]): Promise<MemoryView[]> {
    const names = new Map(projects.map((p) => [p.id, p.name]));
    const notes = [
      ...(await this.writer.readNotes(GLOBAL_DIR)),
      ...(
        await Promise.all(
          (await this.writer.subfolders(PROJECTS_DIR)).map((dir) =>
            this.writer.readNotes(path.join(dir, GLOBAL_DIR)),
          ),
        )
      ).flat(),
    ];
    return notes
      .map(({ file, content }) => {
        const memory = parseMemory(content);
        return {
          id: file,
          text: memory.text,
          ...(memory.created && { created: memory.created }),
          ...(memory.projectId && {
            projectId: memory.projectId,
            projectName: names.get(memory.projectId) ?? memory.projectId,
          }),
        };
      })
      .filter((m) => m.text !== '');
  }

  /** Erinnerungen für einen Chat: alle globalen, dazu die seines Projekts. */
  async forChat(
    projectId: string | undefined,
    projects: MemoryProject[],
  ): Promise<MemoryView[]> {
    return (await this.list(projects)).filter(
      (m) => !m.projectId || m.projectId === projectId,
    );
  }

  async add(text: string, project?: MemoryProject): Promise<MemoryView> {
    const trimmed = text.trim().slice(0, MEMORY_MAX_LENGTH);
    if (!trimmed) throw new Error(tr('obsidian.memoryEmpty'));
    // Ordnername aus dem Projektnamen – gesäubert, damit er nie ein Pfad wird.
    const dir = project
      ? path.join(PROJECTS_DIR, sanitizeFileName(project.name), GLOBAL_DIR)
      : GLOBAL_DIR;
    const date = this.now();
    const file = await this.writer.writeNote(
      dir,
      titleOf(trimmed),
      formatMemory(trimmed, date, project),
    );
    return {
      id: path.relative(this.writer.folder, file),
      text: trimmed,
      created: localDate(date),
      ...(project && { projectId: project.id, projectName: project.name }),
    };
  }

  /** Löscht eine Erinnerung – nur Notizen in den Erinnerungs-Ordnern. */
  async remove(id: string): Promise<void> {
    if (!isMemoryPath(id)) throw new Error(tr('obsidian.noMemory'));
    await this.writer.deleteNote(id);
  }
}

/** `Erinnerungen/x.md` oder `Projekte/<Name>/Erinnerungen/x.md` – sonst nichts. */
export function isMemoryPath(id: string): boolean {
  const parts = id.split(/[\\/]/);
  if (!id.toLowerCase().endsWith('.md') || parts.includes('..')) return false;
  return (
    (parts.length === 2 && parts[0] === GLOBAL_DIR) ||
    (parts.length === 4 && parts[0] === PROJECTS_DIR && parts[2] === GLOBAL_DIR)
  );
}
