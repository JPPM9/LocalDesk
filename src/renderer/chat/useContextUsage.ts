import { useEffect, useMemo, useState } from 'react';
import type {
  ChatFolder,
  ChatSettings,
  MemoryView,
  MessageRecord,
  ToolDefinition,
} from '../../shared/api';
import { toRequestMessages } from '../../shared/chat';
import {
  contextUsage,
  estimateContextParts,
  OLLAMA_DEFAULT_CONTEXT,
  type ContextUsage,
} from '../../shared/context';
import { memoryPrompt, selectMemories } from '../../shared/memory';
import { skillsPrompt, skillTools, type SkillView } from '../../shared/skills';
import { effectivePermission } from '../../shared/permissions';
import { useMcpServers } from '../hooks/useMcpServers';

/**
 * Geschätzter Füllstand des Kontexts für die nächste Anfrage dieses Chats –
 * dieselben Teile, die der Main-Prozess beim Senden zusammenbaut.
 */
export function useContextUsage(
  messages: MessageRecord[],
  settings: ChatSettings,
  project: ChatFolder | undefined,
  /** Kann das Modell Werkzeuge? Dann kommt die Skill-Liste („Skill laden“) dazu. */
  modelSupportsTools = false,
): ContextUsage {
  const servers = useMcpServers();
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [skills, setSkills] = useState<SkillView[]>([]);

  // Erinnerungen neu lesen, wenn sich der Chat-Verlauf ändert (neue Erinnerung möglich).
  useEffect(() => {
    void window.api
      .listMemories()
      .then((result) => setMemories(result.ok ? result.value : []));
  }, [messages.length]);

  // Skills neu lesen, wenn sich die Auswahl ändert (Texte können sich geändert haben).
  const activeSkills = [
    ...new Set([...(project?.skills ?? []), ...(settings.skills ?? [])]),
  ];
  const skillKey = activeSkills.join('|');
  useEffect(() => {
    void window.api
      .listSkills()
      .then((result) => setSkills(result.ok ? result.value : []));
  }, [skillKey]);

  return useMemo(() => {
    // Nur Tools laufender Server dieses Chats, ohne die ausgeschalteten.
    const tools: ToolDefinition[] = (servers ?? [])
      .filter(
        (s) =>
          settings.mcpServers?.includes(s.config.id) &&
          s.status.state === 'running',
      )
      .flatMap((s) =>
        s.status.tools
          .filter((tool) => effectivePermission(tool, s.permissions) !== 'off')
          .map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          })),
      );
    // Wie im Main-Prozess: nicht eingeschaltete Skills kann das Modell selbst laden.
    const catalog = skills.filter(
      (s) => !s.error && !activeSkills.includes(s.id),
    );
    if (modelSupportsTools) {
      for (const tool of skillTools(
        catalog,
        settings.contextLength ?? OLLAMA_DEFAULT_CONTEXT,
      )) {
        tools.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        });
      }
    }
    const lastSources = [...messages]
      .reverse()
      .find((m) => m.sources && m.sources.length > 0)?.sources;
    // Wie im Main-Prozess: globale + Projekt-Erinnerungen, höchstens im Budget.
    const chatMemories = selectMemories(
      memories.filter((m) => !m.projectId || m.projectId === project?.id),
    );
    const parts = estimateContextParts({
      memoryText: memoryPrompt(chatMemories.map((m) => m.text)),
      skillsText: skillsPrompt(
        skills.filter((s) => activeSkills.includes(s.id) && !s.error),
      ),
      instructions: [project?.instructions, settings.systemPrompt]
        .filter(Boolean)
        .join('\n\n'),
      history: toRequestMessages(
        messages.filter((m) => m.status !== 'streaming'),
      ),
      knowledgeActive: Boolean(
        settings.collections?.length || project?.collectionId,
      ),
      lastSources,
      tools,
    });
    return contextUsage(
      parts,
      settings.contextLength ?? OLLAMA_DEFAULT_CONTEXT,
    );
  }, [
    messages,
    settings,
    project,
    servers,
    memories,
    skills,
    modelSupportsTools,
  ]);
}
