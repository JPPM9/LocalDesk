import { useMemo } from 'react';
import type {
  ChatFolder,
  ChatSettings,
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
): ContextUsage {
  const servers = useMcpServers();

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
    const lastSources = [...messages]
      .reverse()
      .find((m) => m.sources && m.sources.length > 0)?.sources;
    const parts = estimateContextParts({
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
  }, [messages, settings, project, servers]);
}
