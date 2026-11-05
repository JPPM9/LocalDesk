import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { clipboard, ipcMain, type WebContents } from 'electron';
import {
  IpcChannels,
  type ChatFolder,
  type ChatRequest,
  type ChatSendRequest,
  type ChatStreamEvent,
  type MessageRecord,
  type Result,
  type ToolAnswer,
  type ToolDecision,
} from '../shared/api';
import { applyChatEvent, isUsable, titleFromMessage } from '../shared/chat';
import {
  checkFileInputs,
  filesToSend,
  type ReadChatFile,
} from '../shared/files';
import { checkImageInputs, imagesToSend, sniffImage } from '../shared/images';
import {
  CODE_CONTEXT_DEFAULT,
  CODE_MAX_ROUNDS,
  codeAgentPrompt,
  type CodeMode,
} from '../shared/code-agent';
import { knowledgeQuery, withKnowledge } from '../shared/knowledge';
import { MAIL_TOOL_SERVER } from '../shared/mail';
import { isSortableLabel } from '../shared/mail-sorting';
import { MEMORY_TOOL_SERVER, withMemories } from '../shared/memory';
import {
  SKILL_TOOL_SERVER,
  skillTools,
  withSkills,
  type SkillView,
} from '../shared/skills';
import type { OfferedTool } from '../shared/tools';
import { isLocalServer } from '../shared/server';
import { buildChatRequest } from '../shared/settings';
import { describeChatError } from './chat-errors';
import { CODE_CHANGE_TOOLS } from '../shared/code';
import type { CodeBackups } from './code/backups';
import { CODE_TOOL_SERVER, callReadTool, readTools } from './code/code-tools';
import {
  GIT_TOOLS,
  callGitTool,
  describeCommit,
  gitTools,
} from './code/git-tools';
import { COMMAND_TOOL, commandTool, runCommand } from './code/command-tool';
import {
  applyChange,
  changePreview,
  editTools,
  planChange,
} from './code/edit-tools';
import { allowedInMode, filterForMode } from './code/code-mode';
import { Workspace } from './code/workspace';
import { readChatFile } from './chat-files';
import type {
  ChatRepository,
  StoredFile,
  StoredImage,
} from './db/chat-repository';
import { WorkerExtractor } from './rag/extractor';
import type { ChatKnowledge } from './knowledge-service';
import type { MailClient } from './mail/mail-client';
import { callMailTool, describeMailTool, mailTools } from './mail/mail-tools';
import { callSkill } from './skills/skill-call';
import {
  callWebSearchTool,
  callWebTool,
  chatWebLinks,
  webSearchTool,
  webTool,
  type WebAccess,
} from './web/web-tool';
import { WEB_SEARCH_TOOL, WEB_TOOL_SERVER } from '../shared/web';
import { compactedHistory, withCompaction } from '../shared/compaction';
import { OLLAMA_DEFAULT_CONTEXT } from '../shared/context';
import type { McpTools } from './mcp-service';
import { checkMemoryArguments, memoryTool } from './obsidian/memory-tool';
import type { ChatMemory } from './obsidian-service';
import type { Provider } from './providers/provider';
import { AccessGrants, type Mailbox } from './access';
import { ACCESS_TOOL_SERVER } from '../shared/access';
import { runAnswer, type ToolRuntime } from './tool-loop';
import { tr } from '../shared/messages';

/** Wie oft eine laufende Antwort zwischengespeichert wird (falls die App abstürzt). */
const SAVE_INTERVAL_MS = 1000;

const TOOL_DECISIONS: readonly ToolDecision[] = ['once', 'always', 'deny'];

/**
 * Verbindet die Oberfläche mit Chat und Datenbank.
 * Eine Antwort läuft im Hintergrund weiter; jedes Stück geht als Ereignis an das
 * Fenster, das gefragt hat, und landet in der Datenbank. Laufende Antworten merken
 * wir uns, damit „Stopp“ sie abbrechen kann.
 */
export function registerChatHandlers(
  /** Liefert den Provider des gerade aktiven Servers (umschaltbar). */
  getProvider: () => Provider,
  chats: ChatRepository,
  mcpTools: McpTools,
  knowledge: ChatKnowledge,
  /** Projekt eines Chats (Anweisungen, Projekt-Dokumente). */
  projectOf: (folderId: string) => ChatFolder | null,
  /** Erinnerungen über dich aus dem Obsidian-Vault. */
  memory: ChatMemory,
  /** Skills aus dem Skill-Ordner (fehlende oder kaputte werden übergangen). */
  skills: {
    get(id: string): Promise<SkillView | null>;
    list(): Promise<SkillView[]>;
    /** Text einer Zusatzdatei eines Skills. */
    readFile(id: string, file: string): Promise<string>;
  },
  /** Angemeldete Mail-Konten (Schalter „E-Mail“). */
  mail: {
    exists(accountId: string): boolean;
    client(accountId: string): MailClient;
    accounts(): { id: string; email: string }[];
  },
  /** Sicherungen für „Rückgängig“ im Code-Bereich. */
  codeBackups: CodeBackups,
  /** Der Ollama-Schlüssel für die Websuche (null = keiner gespeichert). */
  webSearchKey: () => Promise<string | null>,
) {
  const running = new Map<string, AbortController>();
  /** Rückfragen, auf deren Antwort ein Tool-Aufruf wartet (Aufruf-ID → Antwort). */
  const pendingDecisions = new Map<string, (answer: ToolAnswer) => void>();

  ipcMain.handle(IpcChannels.listChats, () => chats.listChats());

  ipcMain.handle(IpcChannels.getChat, (_event, chatId: unknown) =>
    typeof chatId === 'string' ? chats.getChat(chatId) : null,
  );

  ipcMain.handle(
    IpcChannels.renameChat,
    (_event, chatId: unknown, title: unknown) => {
      if (typeof chatId !== 'string' || typeof title !== 'string') return;
      const trimmed = title.trim();
      if (trimmed) chats.renameChat(chatId, trimmed.slice(0, 200));
    },
  );

  ipcMain.handle(IpcChannels.deleteChat, (_event, chatId: unknown) => {
    if (typeof chatId === 'string') chats.deleteChat(chatId);
  });

  ipcMain.handle(IpcChannels.searchChats, (_event, query: unknown) =>
    typeof query === 'string'
      ? chats.search(query.slice(0, 500))
      : { chats: [], hits: [] },
  );

  // Die Prüfung der Werte übernimmt das Repository (normalizeSettings).
  ipcMain.handle(
    IpcChannels.updateChatSettings,
    (_event, chatId: unknown, settings: unknown) => {
      if (typeof chatId === 'string') {
        chats.updateSettings(chatId, settings as object);
      }
    },
  );

  ipcMain.handle(IpcChannels.chatSend, async (event, request: unknown) => {
    if (!isChatSendRequest(request)) {
      throw new Error(tr('error.invalidChatRequest'));
    }
    if (running.has(request.requestId)) return;
    // Bilder aus der Oberfläche: Anzahl, Größe und Format werden hier geprüft.
    const checked = checkImageInputs(request.images);
    if (!checked.ok) throw new Error(checked.error);
    const imageInputs = checked.value;
    // Dateien: Anzahl, Art und Länge des (schon gelesenen) Textes werden hier geprüft.
    const checkedFiles = checkFileInputs(request.files);
    if (!checkedFiles.ok) throw new Error(checkedFiles.error);
    const fileInputs = checkedFiles.value;
    if (
      request.content.trim() === '' &&
      imageInputs.length === 0 &&
      fileInputs.length === 0
    ) {
      throw new Error(tr('error.invalidChatRequest'));
    }
    const storedImages: StoredImage[] = imageInputs.map((image) => ({
      id: image.id,
      name: image.name,
      mime: sniffImage(image.data)!,
      data: image.data,
    }));
    const storedFiles: StoredFile[] = fileInputs;

    if (!chats.chatExists(request.chatId)) {
      chats.createChat({
        id: request.chatId,
        title: request.content.trim()
          ? titleFromMessage(request.content)
          : imageInputs.length > 0
            ? tr('chat.imageTitle', { name: imageInputs[0].name })
            : tr('chat.fileTitle', { name: fileInputs[0].name }),
        model: request.model,
        settings: request.settings,
      });
      // Neuer Chat direkt im Projekt (gibt es das Projekt nicht, bleibt er „ohne“).
      if (request.folderId) chats.moveChat(request.chatId, request.folderId);
    }
    const chat = chats.getChat(request.chatId);
    const history = chat?.messages ?? [];
    const workspace = chat?.workspace ?? null;
    // Code-Sitzungen: mehr Kontext, falls nicht selbst eingestellt.
    const settings = {
      ...(workspace && { contextLength: CODE_CONTEXT_DEFAULT }),
      ...(chat?.settings ?? {}),
    };
    const project = chat?.folderId ? projectOf(chat.folderId) : null;
    // Code-Sitzung: „Plan“ = nur lesen (gilt ab dieser Nachricht), sonst alles mit Rückfrage.
    const codeMode: CodeMode = workspace
      ? (settings.codeMode ?? 'manual')
      : 'manual';

    const userMessage: MessageRecord = {
      id: request.userMessageId,
      role: 'user',
      content: request.content,
      ...(storedImages.length > 0 && {
        images: storedImages.map((image) => ({
          id: image.id,
          name: image.name,
          size: image.data.byteLength,
        })),
      }),
      ...(storedFiles.length > 0 && {
        files: storedFiles.map((file) => ({
          id: file.id,
          name: file.name,
          kind: file.kind,
          chars: file.text.length,
          ...(file.pages !== undefined && { pages: file.pages }),
        })),
      }),
      thinking: '',
      status: 'done',
    };
    const answer: MessageRecord = {
      id: request.requestId,
      role: 'assistant',
      content: '',
      thinking: '',
      status: 'streaming',
      model: request.model,
    };
    chats.appendMessage(request.chatId, userMessage);
    if (storedImages.length > 0) chats.addImages(userMessage.id, storedImages);
    if (storedFiles.length > 0) chats.addFiles(userMessage.id, storedFiles);
    chats.appendMessage(request.chatId, answer);

    const controller = new AbortController();
    running.set(request.requestId, controller);
    // Der Server wird beim Absenden festgelegt – ein Umschalten während der
    // Antwort lässt diese Antwort auf ihrem Server zu Ende laufen.
    const provider = getProvider();
    // Ein verdichteter Chat schickt statt der älteren Nachrichten ihre Zusammenfassung.
    const compacted = compactedHistory(history, chat?.compaction);
    const sendable = [...compacted.messages, userMessage];
    // Bilder gehen nur an Modelle mit Bild-Fähigkeit mit (sonst lehnt Ollama die Anfrage ab);
    // dann sind es die letzten 4 des Verlaufs, die übrigen stehen als Text-Hinweis.
    const vision = sendable.some((m) => m.images?.length)
      ? await supportsCapability(provider, request.model, 'vision')
      : false;
    const imageData = new Map<string, string>();
    for (const id of imagesToSend(sendable.filter(isUsable), vision)) {
      const image = chats.getImage(id);
      if (image) imageData.set(id, Buffer.from(image.data).toString('base64'));
    }
    // Der Text der letzten 3 Dateien des Verlaufs geht mit; ältere stehen nur als Hinweis.
    const fileText = new Map<string, string>();
    for (const id of filesToSend(sendable.filter(isUsable))) {
      const file = chats.getFile(id);
      if (file) fileText.set(id, file.text);
    }
    const plainRequest = buildChatRequest(
      request.model,
      sendable,
      settings,
      workspace
        ? codeAgentPrompt(path.basename(workspace), new Date(), codeMode)
        : project?.instructions,
      {
        vision,
        data: (id) => imageData.get(id),
        fileText: (id) => fileText.get(id),
      },
    );
    const chatRequest = compacted.compaction
      ? withCompaction(plainRequest, compacted.compaction.summary)
      : plainRequest;
    // Projekt-Dokumente werden immer durchsucht, dazu die per Wissen-Knopf gewählten.
    const collectionIds = [
      ...(project?.collectionId ? [project.collectionId] : []),
      ...(settings.collections ?? []),
    ];
    const knowledgeSearch =
      collectionIds.length > 0 && !workspace
        ? {
            collectionIds,
            query: knowledgeQuery(history, request.content),
            rerank: settings.rerank === true,
          }
        : null;
    // Schalter „Internet“: Adressen, die du selbst in diesem Chat geschrieben hast, liest das
    // Modell ohne Rückfrage – nur dein eigener Text zählt, nie Datei- oder Webseiten-Inhalt.
    const web =
      !workspace && (settings.web === true || settings.webSearch === true)
        ? {
            read: settings.web === true,
            search: settings.webSearch === true,
            links: chatWebLinks(
              history,
              request.content,
              settings.webSearch === true,
            ),
          }
        : null;
    // Bewusst nicht abwarten: Die Oberfläche bekommt die Antwort über Ereignisse.
    void stream(
      provider,
      event.sender,
      chatRequest,
      // Der Code-Agent hat nur seine eigenen Werkzeuge.
      workspace ? [] : (settings.mcpServers ?? []),
      // Projekt-Skills gelten in jedem Chat des Projekts, dazu die des Chats.
      workspace
        ? (settings.skills ?? [])
        : [
            ...new Set([
              ...(project?.skills ?? []),
              ...(settings.skills ?? []),
            ]),
          ],
      workspace ? null : (settings.mailAccounts?.[0] ?? null),
      workspace,
      codeMode,
      knowledgeSearch,
      web,
      { projectId: project?.id, question: request.content },
      request.chatId,
      answer,
      controller,
    ).finally(() => running.delete(request.requestId));
  });

  // Die Bytes eines Bildes aus einer Nachricht (nur zum Anzeigen).
  ipcMain.handle(
    IpcChannels.getChatImage,
    (_event, imageId: unknown): Result<{ mime: string; data: Uint8Array }> => {
      const image =
        typeof imageId === 'string' && imageId.length <= 100
          ? chats.getImage(imageId)
          : null;
      return image
        ? { ok: true, value: { mime: image.mime, data: image.data } }
        : { ok: false, error: tr('images.notFound') };
    },
  );

  // Eine Datei für die Nachricht lesen (PDF, Word, Text, Code) – speichert nichts; erst das
  // Senden legt den Text bei der Nachricht ab.
  ipcMain.handle(
    IpcChannels.readChatFile,
    (_event, name: unknown, data: unknown) =>
      readChatFile(
        name,
        data,
        // Der Worker liegt nach dem Bauen als eigene Datei neben main.js.
        () => new WorkerExtractor(path.join(__dirname, 'extract-worker.cjs')),
      ),
  );

  // Der gelesene Text einer Datei aus einer Nachricht (für „Bearbeiten“ und „Antwort wiederholen“).
  ipcMain.handle(
    IpcChannels.getChatFile,
    (_event, fileId: unknown): Result<ReadChatFile> => {
      const file =
        typeof fileId === 'string' && fileId.length <= 100
          ? chats.getFile(fileId)
          : null;
      return file
        ? { ok: true, value: file }
        : { ok: false, error: tr('files.notFound') };
    },
  );

  // „Bearbeiten“ und „Antwort wiederholen“: alles ab dieser Nachricht wegnehmen.
  ipcMain.handle(
    IpcChannels.chatTruncate,
    (_event, chatId: unknown, messageId: unknown): boolean =>
      typeof chatId === 'string' &&
      typeof messageId === 'string' &&
      chats.truncateFrom(chatId, messageId),
  );

  // Zwischenablage: nur Text, und nicht unbegrenzt viel.
  ipcMain.handle(IpcChannels.copyText, (_event, text: unknown) => {
    if (typeof text === 'string' && text.length <= 1_000_000) {
      clipboard.writeText(text);
    }
  });

  ipcMain.handle(IpcChannels.chatCancel, (_event, requestId: unknown) => {
    if (typeof requestId === 'string') running.get(requestId)?.abort();
  });

  // Nur Antworten auf Rückfragen, die wirklich offen sind, zählen.
  ipcMain.handle(
    IpcChannels.chatToolDecision,
    (_event, callId: unknown, decision: unknown, args: unknown) => {
      if (typeof callId !== 'string') return;
      if (!(TOOL_DECISIONS as readonly unknown[]).includes(decision)) return;
      // Geänderte Eingaben prüft später das Werkzeug selbst (checkArguments).
      const changed =
        typeof args === 'object' && args !== null && !Array.isArray(args)
          ? (args as Record<string, unknown>)
          : undefined;
      pendingDecisions.get(callId)?.({
        decision: decision as ToolDecision,
        ...(changed && { arguments: changed }),
      });
    },
  );

  /**
   * Verbindet die Tool-Schleife mit den MCP-Servern dieses Chats und den Rückfragen.
   * Mit `memoryProject` (gesetzt, wenn ein Vault eingerichtet ist und das Modell
   * Tools kann) kommt „Erinnerung speichern“ dazu – im Projekt mit Wahl des Ziels.
   */
  function toolRuntime(
    /** Freigaben dieser Antwort: Postfach und Datei-Server (können unterwegs dazukommen). */
    grants: AccessGrants,
    signal: AbortSignal,
    memoryTarget: { projectId: string | undefined } | null,
    /** Skills, die das Modell selbst laden darf (leer = Werkzeug nicht anbieten). */
    skillCatalog: SkillView[],
    /** Projektordner einer Code-Sitzung (null = normaler Chat). */
    code: Workspace | null,
    /** Plan-Modus: Ändern, Befehle und Commits werden nicht einmal angeboten. */
    codeMode: CodeMode = 'manual',
    /** Das Modell darf mit „Zugriff anfragen“ um Postfach/Dateien bitten (nur Chats mit Tools). */
    offerAccess = false,
    /** Kontextlänge dieses Chats – ein Skill, der nicht hineinpasst, wird nicht geladen. */
    contextLength: number = OLLAMA_DEFAULT_CONTEXT,
    /** Schalter „Internet“: was das Modell lesen und suchen darf (null = nichts davon anbieten). */
    web: WebAccess | null = null,
  ): ToolRuntime {
    const codeOffers = code
      ? filterForMode(
          [
            ...readTools(),
            ...editTools(async (toolName, args) =>
              changePreview(await planChange(code, toolName, args)),
            ),
            commandTool(),
            ...gitTools((args) => describeCommit(code.root, args)),
          ],
          codeMode,
        )
      : [];
    // Das Postfach kann unterwegs dazukommen (Freigabe-Karte) – darum jede Runde neu.
    const mailOffers = (): OfferedTool[] => {
      const mailbox = grants.mailbox;
      return mailbox
        ? mailTools(mailbox.labels, (toolName, args) =>
            describeMailTool(
              mailbox.client,
              toolName,
              args,
              mailbox.labels,
              mailbox.allLabels,
            ),
          )
        : [];
    };
    // Jeder Skill ein eigenes Werkzeug (siehe skillTools). Liest nur deinen
    // eigenen Text – keine Rückfrage nötig.
    const offeredSkills = skillTools(skillCatalog, contextLength);
    const skillOffers: OfferedTool[] = offeredSkills.map((t) => ({
      serverId: SKILL_TOOL_SERVER,
      serverName: 'Skills',
      toolName: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      destructive: false,
      permission: 'always',
    }));
    const webOffers: OfferedTool[] = [
      ...(web?.read ? [webTool(web.links)] : []),
      ...(web?.searchKey ? [webSearchTool()] : []),
    ];
    return {
      tools: () => [
        ...(memoryTarget
          ? [memoryTool(memoryTarget.projectId !== undefined)]
          : []),
        ...skillOffers,
        ...mailOffers(),
        ...webOffers,
        ...codeOffers,
        ...mcpTools.offered(grants.serverIds),
        ...(offerAccess ? [grants.tool()].filter((t) => t !== null) : []),
      ],
      call: async (tool, args, callSignal, callId) => {
        if (tool.serverId === CODE_TOOL_SERVER && code) {
          // Doppelt gesichert: Im Plan-Modus läuft nichts außer Lesen, auch wenn ein Aufruf durchrutscht.
          if (!allowedInMode(codeMode, tool.toolName)) {
            return { text: tr('code.planBlocked'), isError: true };
          }
          if ((GIT_TOOLS as readonly string[]).includes(tool.toolName)) {
            return {
              text: await callGitTool(code, tool.toolName, args),
              isError: false,
            };
          }
          if (tool.toolName === COMMAND_TOOL) {
            return {
              text: await runCommand(code.root, args, callSignal),
              isError: false,
            };
          }
          if (CODE_CHANGE_TOOLS.includes(tool.toolName)) {
            return {
              text: await applyChange(
                code,
                codeBackups,
                callId,
                tool.toolName,
                args,
              ),
              isError: false,
            };
          }
          const result = await callReadTool(code, tool.toolName, args);
          if (result === null) {
            return {
              text: tr('error.toolMissing', { tool: tool.toolName }),
              isError: true,
            };
          }
          return { text: result, isError: false };
        }
        if (tool.serverId === ACCESS_TOOL_SERVER) {
          return grants.grant(args);
        }
        const mailbox = grants.mailbox;
        if (tool.serverId === MAIL_TOOL_SERVER && mailbox) {
          return {
            text: await callMailTool(
              mailbox.client,
              tool.toolName,
              args,
              mailbox.labels,
              mailbox.allLabels,
            ),
            isError: false,
          };
        }
        if (tool.serverId === WEB_TOOL_SERVER && web) {
          return {
            text:
              tool.toolName === WEB_SEARCH_TOOL
                ? await callWebSearchTool(args, {
                    apiKey: web.searchKey,
                    signal: callSignal,
                    links: web.links,
                  })
                : await callWebTool(args, {
                    contextLength,
                    signal: callSignal,
                  }),
            isError: false,
          };
        }
        if (tool.serverId === SKILL_TOOL_SERVER) {
          const found = offeredSkills.find((t) => t.name === tool.toolName);
          // Frisch aus der Datei – falls du ihn gerade bearbeitet hast.
          const skill = found ? await skills.get(found.skillId) : null;
          if (!skill || skill.error) {
            return {
              text: tr('error.skillGone'),
              isError: true,
            };
          }
          return callSkill(
            skill,
            args,
            (id, file) => skills.readFile(id, file),
            contextLength,
          );
        }
        if (tool.serverId !== MEMORY_TOOL_SERVER) {
          return mcpTools.call(tool, args, callSignal);
        }
        const checked = checkMemoryArguments(args);
        if (!checked) return { text: tr('error.invalidMemory'), isError: true };
        const projectId =
          checked.scope === 'projekt' ? memoryTarget?.projectId : undefined;
        const saved = await memory.save(checked.text, projectId);
        return {
          text: `Erinnerung gespeichert${saved.projectName ? ` (Projekt ${saved.projectName})` : ''}: ${saved.text}`,
          isError: false,
        };
      },
      allowAlways: (tool) => mcpTools.allowAlways(tool),
      ask: (call) =>
        new Promise<ToolAnswer>((resolve) => {
          const finish = (answer: ToolAnswer) => {
            pendingDecisions.delete(call.id);
            signal.removeEventListener('abort', onAbort);
            resolve(answer);
          };
          // „Stopp“ während der Rückfrage = nicht ausführen.
          const onAbort = () => finish({ decision: 'deny' });
          pendingDecisions.set(call.id, finish);
          signal.addEventListener('abort', onAbort, { once: true });
        }),
    };
  }

  async function stream(
    provider: Provider,
    sender: WebContents,
    chatRequest: ChatRequest,
    serverIds: string[],
    skillIds: string[],
    mailAccountId: string | null,
    workspacePath: string | null,
    codeMode: CodeMode,
    knowledgeSearch: {
      collectionIds: string[];
      query: string;
      rerank: boolean;
    } | null,
    /** Schalter „Internet“: lesen und/oder suchen, dazu die Adressen, die ohne Rückfrage gelesen werden; sonst null. */
    web: { read: boolean; search: boolean; links: string[] } | null,
    memoryContext: { projectId: string | undefined; question: string },
    chatId: string,
    initial: MessageRecord,
    controller: AbortController,
  ) {
    const requestId = initial.id;
    let answer = initial;
    let lastSave = Date.now();

    const save = () => {
      chats.updateMessage(answer.id, answer);
      lastSave = Date.now();
    };
    const emit = (event: ChatStreamEvent) => {
      answer = applyChatEvent([answer], event)[0];
      if (!sender.isDestroyed()) sender.send(IpcChannels.chatEvent, event);
      // Tool-Aufrufe und Quellen sofort speichern – sie sind selten, aber wichtig.
      if (
        event.type === 'tool-call' ||
        event.type === 'sources' ||
        Date.now() - lastSave > SAVE_INTERVAL_MS
      ) {
        save();
      }
    };

    try {
      // Eingeschaltete Skills, frisch aus ihren Dateien – dann davor die Erinnerungen.
      const activeSkills = (
        await Promise.all(
          skillIds.map((id) => skills.get(id).catch(() => null)),
        )
      ).filter((s): s is SkillView => s !== null && !s.error);
      // Erinnerungen über dich (frisch aus dem Vault) vorne in die System-Nachricht.
      // Code-Sitzungen bekommen keine Erinnerungen – der Platz gehört dem Code.
      let request = workspacePath
        ? withSkills(chatRequest, activeSkills)
        : withMemories(
            withSkills(chatRequest, activeSkills),
            await memory.forChat(
              memoryContext.projectId,
              memoryContext.question,
            ),
          );
      // Dann im Wissen suchen und antworten. Geht die Suche schief, kommt die
      // Antwort ohne Wissen – mit Hinweis, statt gar nicht.
      if (knowledgeSearch) {
        const found = await knowledge.search(
          knowledgeSearch.collectionIds,
          knowledgeSearch.query,
          knowledgeSearch.rerank
            ? {
                rerank: {
                  model: request.model,
                  contextLength:
                    request.options?.contextLength ?? OLLAMA_DEFAULT_CONTEXT,
                  signal: controller.signal,
                },
              }
            : undefined,
        );
        controller.signal.throwIfAborted();
        if (found.ok) {
          emit({ requestId, type: 'sources', sources: found.value });
          request = withKnowledge(request, found.value);
        } else {
          emit({ requestId, type: 'sources', sources: [], error: found.error });
        }
      }
      // „Erinnerung speichern“ nur mit Vault und nur für Modelle, die Tools können.
      const canUseTools = await supportsTools(provider, request.model);
      const offerMemory = memory.available() && canUseTools && !workspacePath;
      // Skills, die nicht schon eingeschaltet sind, darf das Modell selbst laden.
      const skillCatalog =
        canUseTools && !workspacePath
          ? (await skills.list().catch(() => [])).filter(
              (s) => !s.error && !skillIds.includes(s.id),
            )
          : [];
      // Schalter „E-Mail“: Postfach lesen dürfen (nur Modelle mit Tools). Die
      // Labels holen wir einmal – fürs Vorschlagen nur deine eigenen.
      const openMailbox = async (
        accountId: string,
      ): Promise<Mailbox | null> => {
        if (!mail.exists(accountId)) return null;
        const client = mail.client(accountId);
        const allLabels = await client.labels().catch(() => []);
        return {
          client,
          labels: allLabels.filter(isSortableLabel),
          allLabels,
        };
      };
      const mailbox =
        canUseTools && mailAccountId ? await openMailbox(mailAccountId) : null;
      // Freigaben, die das Modell mit „Zugriff anfragen“ erbitten darf; „für diesen
      // Chat“ landet dauerhaft in den Einstellungen des Chats (wie die Schalter).
      const grants = new AccessGrants(
        {
          mailAccounts: () => mail.accounts(),
          servers: () => mcpTools.available(),
          openMailbox,
          persist: (patch) => {
            const current = chats.getChat(chatId)?.settings ?? {};
            chats.updateSettings(chatId, {
              ...current,
              ...(patch.mailAccountId && {
                mailAccounts: [patch.mailAccountId],
              }),
              ...(patch.serverIds && {
                mcpServers: [
                  ...new Set([
                    ...(current.mcpServers ?? []),
                    ...patch.serverIds,
                  ]),
                ],
              }),
            });
          },
        },
        { mailbox, serverIds },
      );
      // Code-Sitzung: Projektordner frisch prüfen (könnte verschoben worden sein).
      const code =
        workspacePath && canUseTools
          ? await Workspace.open(workspacePath)
          : null;
      controller.signal.throwIfAborted();
      const runtime = toolRuntime(
        grants,
        controller.signal,
        offerMemory ? { projectId: memoryContext.projectId } : null,
        skillCatalog,
        code,
        codeMode,
        canUseTools && !workspacePath,
        request.options?.contextLength ?? OLLAMA_DEFAULT_CONTEXT,
        web && canUseTools
          ? {
              read: web.read,
              // Ohne gespeicherten Schlüssel wird die Suche gar nicht erst angeboten.
              searchKey: web.search ? await webSearchKey() : null,
              links: new Set(web.links),
            }
          : null,
      );
      await runAnswer({
        provider,
        request,
        requestId,
        runtime,
        emit,
        signal: controller.signal,
        newId: randomUUID,
        ...(code && { maxRounds: CODE_MAX_ROUNDS }),
        // Server auf einem anderen Rechner: jedes Werkzeug fragt nach.
        confirmAll: !isLocalServer(provider.baseUrl),
      });
    } catch (error) {
      if (controller.signal.aborted) {
        emit({ requestId, type: 'aborted' });
      } else {
        emit({ requestId, type: 'error', error: describeChatError(error) });
      }
    }
    // Endet der Stream ohne „done“ (Verbindung weg), gilt die Antwort als abgebrochen.
    if (answer.status === 'streaming') {
      emit({ requestId, type: 'aborted' });
    }
    save();
  }
}

/** Kann das Modell Tools aufrufen? Im Zweifel (Liste nicht ladbar) nein. */
function supportsTools(provider: Provider, model: string): Promise<boolean> {
  return supportsCapability(provider, model, 'tools');
}

/** Hat das Modell diese Fähigkeit („tools“, „vision“ …)? Im Zweifel (Liste nicht ladbar) nein. */
async function supportsCapability(
  provider: Provider,
  model: string,
  capability: string,
): Promise<boolean> {
  const models = await provider.listModels();
  return (
    models.ok &&
    models.value.some(
      (m) => m.name === model && m.capabilities.includes(capability),
    )
  );
}

// Die Oberfläche gilt als nicht vertrauenswürdig: Eingaben vom Renderer prüfen wir.
function isChatSendRequest(value: unknown): value is ChatSendRequest {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<ChatSendRequest>;
  return (
    typeof r.chatId === 'string' &&
    r.chatId !== '' &&
    typeof r.userMessageId === 'string' &&
    typeof r.requestId === 'string' &&
    typeof r.model === 'string' &&
    r.model !== '' &&
    // Leer ist erlaubt, wenn Bilder dabei sind – das prüft der Aufrufer nach den Bildern.
    typeof r.content === 'string' &&
    (r.images === undefined || Array.isArray(r.images)) &&
    (r.files === undefined || Array.isArray(r.files)) &&
    (r.folderId === undefined || typeof r.folderId === 'string')
  );
}
