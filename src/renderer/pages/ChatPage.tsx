import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FolderOpen, PanelRight, SlidersHorizontal, X } from 'lucide-react';
import type { ChatFolder, ChatSummary, ChatTemplate } from '../../shared/api';
import { thinkFitsModel } from '../../shared/settings';
import { useChat } from '../chat/useChat';
import { useContextUsage } from '../chat/useContextUsage';
import {
  LevelDot,
  SidePanel,
  type SidePanelTab,
} from '../components/chat/SidePanel';
import { useChatList } from '../chat/useChatList';
import { useChatModels } from '../hooks/useChatModels';
import { useTemplates } from '../templates/useTemplates';
import { TemplatePicker } from '../components/chat/TemplatePicker';
import { shortcutLabel } from '../shortcuts/keymap';
import { useShortcut } from '../shortcuts/useShortcut';
import { PageHeader } from '../components/PageHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { ChatList } from '../components/chat/ChatList';
import { ChatSettingsPanel } from '../components/chat/ChatSettingsPanel';
import { MessageView } from '../components/chat/MessageView';
import { ModelSelect } from '../components/chat/ModelSelect';
import { KnowledgeButton } from '../components/knowledge/CollectionPicker';
import { McpButton } from '../components/mcp/McpButton';

// Nur eine Bequemlichkeit pro Rechner: das zuletzt gewählte Modell für neue Chats.
// Gespeicherte Chats merken sich ihr Modell in der Datenbank.
const LAST_MODEL_KEY = 'localdesk.lastModel';

function readLastModel(): string | null {
  try {
    return localStorage.getItem(LAST_MODEL_KEY);
  } catch {
    return null;
  }
}

function saveLastModel(model: string) {
  try {
    localStorage.setItem(LAST_MODEL_KEY, model);
  } catch {
    // Kein Speicher verfügbar – dann eben nicht merken.
  }
}

export function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const chatId = useParams().chatId ?? null;

  const chatList = useChatList();
  const {
    chat,
    messages,
    settings,
    isRunning,
    notFound,
    send,
    stop,
    updateSettings,
  } = useChat(chatId, {
    onCreated: (id) => navigate(`/chat/${id}`),
    onChanged: () => void chatList.refresh(),
  });
  // Rechts ist Platz für genau ein Panel: Einstellungen ODER Seitenbereich.
  const [settingsOpen, setSettingsOpenState] = useState(false);
  const [sideTab, setSideTabState] = useState<SidePanelTab | null>(null);
  const setSettingsOpen = (update: (open: boolean) => boolean) =>
    setSettingsOpenState((open) => {
      const next = update(open);
      if (next) setSideTabState(null);
      return next;
    });
  const setSideTab = (tab: SidePanelTab | null) => {
    setSideTabState(tab);
    if (tab) setSettingsOpenState(false);
  };

  useShortcut('chatSettings', () => setSettingsOpen((open) => !open));
  // Esc stoppt nur, wenn gerade eine Antwort läuft – sonst passiert nichts.
  useShortcut('stop', () => {
    if (isRunning) stop();
  });
  // Der Punkt am Einstellungs-Knopf gilt nur für das Panel – MCP-Server und Wissen
  // zeigen ihre eigenen Knöpfe.
  const hasCustomSettings = Object.keys(settings).some(
    (key) => key !== 'mcpServers' && key !== 'collections',
  );
  const setList = (key: 'mcpServers' | 'collections', ids: string[]) => {
    const { [key]: _old, ...rest } = settings;
    updateSettings(ids.length > 0 ? { ...rest, [key]: ids } : rest);
  };

  const { models, loaded: modelsLoaded, error: loadError } = useChatModels();
  const [model, setModel] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    templates,
    loaded: templatesLoaded,
    refresh: refreshTemplates,
  } = useTemplates();
  // Vorlage, die in diesem (noch leeren) Chat gewählt wurde – nur zur Anzeige.
  const [activeTemplate, setActiveTemplate] = useState<ChatTemplate | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();

  // Startmodell: das zuletzt gewählte, sonst das erste installierte.
  useEffect(() => {
    if (!modelsLoaded) return;
    const last = readLastModel();
    setModel(
      (current) =>
        current ||
        (models.find((m) => m.name === last)?.name ?? models[0]?.name ?? ''),
    );
  }, [models, modelsLoaded]);

  useEffect(() => {
    setActiveTemplate(null);
  }, [chatId]);

  /**
   * Kopiert Modell und Einstellungen der Vorlage in den neuen Chat.
   * Ohne festes (oder installiertes) Modell bleibt das gewählte Modell.
   */
  const applyTemplate = (template: ChatTemplate) => {
    const templateModel = models.find((m) => m.name === template.model);
    const targetModel = templateModel ?? models.find((m) => m.name === model);
    if (templateModel) setModel(templateModel.name);
    const { think, ...rest } = template.settings;
    updateSettings(
      thinkFitsModel(think, targetModel) ? template.settings : rest,
    );
    setActiveTemplate(template);
  };

  const clearTemplate = () => {
    updateSettings({});
    setActiveTemplate(null);
  };

  // Projekt dieses Chats – bei einem neuen Chat aus „Neuer Chat im Projekt“ (/chat?project=<id>).
  const projectId =
    chatId === null
      ? searchParams.get('project')
      : chatList.chats.find((c) => c.id === chatId)?.folderId;
  const project = chatList.folders.find((f) => f.id === projectId);
  const contextUsage = useContextUsage(messages, settings, project);
  const contextLevel = contextUsage.level;

  // „Chat damit starten“ auf der Vorlagen-Seite öffnet /chat?template=<id>.
  const templateFromUrl = searchParams.get('template');
  useEffect(() => {
    if (!templateFromUrl || !templatesLoaded || !modelsLoaded) return;
    const template = templates.find((tpl) => tpl.id === templateFromUrl);
    if (template && chatId === null) applyTemplate(template);
    setSearchParams({}, { replace: true });
    // applyTemplate nutzt den aktuellen Stand; neu auslösen soll nur die Adresse.
  }, [templateFromUrl, templatesLoaded, modelsLoaded]);

  // Ein gespeicherter Chat öffnet mit dem Modell, mit dem er zuletzt lief –
  // sofern es noch installiert ist.
  useEffect(() => {
    if (chat && models.some((m) => m.name === chat.model)) {
      setModel(chat.model);
    }
  }, [chat, models]);

  // Gibt es den Chat nicht (mehr), zurück zu einem neuen Chat.
  useEffect(() => {
    if (notFound) navigate('/chat', { replace: true });
  }, [notFound, navigate]);

  // Beim Streamen mitscrollen, damit die neueste Zeile sichtbar bleibt.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  // Suchtreffer: /chat/<id>?m=<Nachricht> springt zur Nachricht und hebt sie kurz hervor.
  // Steht bewusst NACH dem Mitscrollen – so gewinnt der Sprung, wenn beides zugleich passiert.
  const jumpTo = searchParams.get('m');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (!jumpTo) return;
    const element = document.getElementById(`msg-${jumpTo}`);
    if (!element) return; // Nachrichten noch nicht geladen – läuft erneut, wenn sie da sind
    element.scrollIntoView({ block: 'center' });
    setHighlightId(jumpTo);
    setSearchParams(
      (params) => {
        params.delete('m');
        return params;
      },
      { replace: true },
    );
  }, [jumpTo, messages, setSearchParams]);
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const chooseModel = (name: string) => {
    setModel(name);
    saveLastModel(name);
    // „Denken: Aus“ von qwen3 passt nicht zu gpt-oss (nur Stufen) und umgekehrt –
    // dann lieber zurück auf den Standard des neuen Modells.
    const next = models.find((m) => m.name === name);
    if (!thinkFitsModel(settings.think, next)) {
      const { think: _dropped, ...rest } = settings;
      updateSettings(rest);
    }
  };

  const deleteChat = async (target: ChatSummary) => {
    if (!window.confirm(t('chat.confirmDelete', { title: target.title })))
      return;
    await chatList.remove(target.id);
    if (target.id === chatId) navigate('/chat');
  };

  const deleteFolder = async (folder: ChatFolder) => {
    if (!window.confirm(t('folders.confirmDelete', { name: folder.name })))
      return;
    await chatList.deleteFolder(folder.id);
  };

  return (
    <div className="flex h-full">
      <ChatList
        chats={chatList.chats}
        folders={chatList.folders}
        onNew={() => navigate('/chat')}
        onRename={(id, title) => void chatList.rename(id, title)}
        onDelete={(target) => void deleteChat(target)}
        onMove={(id, folderId) => void chatList.moveChat(id, folderId)}
        onCreateFolder={chatList.createFolder}
        onRenameFolder={(id, name) => void chatList.renameFolder(id, name)}
        onDeleteFolder={(folder) => void deleteFolder(folder)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          // Titel aus der Liste: Die wird nach dem Umbenennen sofort aktualisiert.
          title={
            chatList.chats.find((c) => c.id === chatId)?.title ??
            chat?.title ??
            t('chat.newChat')
          }
          actions={
            <>
              {project && (
                <Link
                  to={`/projects/${project.id}`}
                  title={t('folders.open')}
                  className="flex max-w-48 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent hover:underline"
                >
                  <FolderOpen size={12} className="shrink-0" />
                  <span className="truncate">
                    {t('projects.badge', { name: project.name })}
                  </span>
                </Link>
              )}
              <KnowledgeButton
                selected={settings.collections ?? []}
                onChange={(ids) => setList('collections', ids)}
              />
              <McpButton
                selected={settings.mcpServers ?? []}
                onChange={(ids) => setList('mcpServers', ids)}
                modelSupportsTools={models
                  .find((m) => m.name === model)
                  ?.capabilities.includes('tools')}
              />
              <ModelSelect
                models={models}
                value={model}
                onChange={chooseModel}
                disabled={isRunning}
              />
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                title={`${t('settingsPanel.title')} (${shortcutLabel('chatSettings')})`}
                aria-label={t('settingsPanel.title')}
                aria-pressed={settingsOpen}
                className={`relative rounded border px-2 py-1 hover:bg-surface-hover ${
                  settingsOpen ? 'border-accent text-accent' : 'border-border'
                }`}
              >
                <SlidersHorizontal size={15} />
                {/* Punkt zeigt: Dieser Chat hat eigene Einstellungen. */}
                {hasCustomSettings && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setSideTab(
                    sideTab
                      ? null
                      : contextLevel === 'ok'
                        ? 'sources'
                        : 'context',
                  )
                }
                title={t('sidePanel.button')}
                aria-label={t('sidePanel.button')}
                aria-pressed={sideTab !== null}
                className={`relative rounded border px-2 py-1 hover:bg-surface-hover ${
                  sideTab ? 'border-accent text-accent' : 'border-border'
                }`}
              >
                <PanelRight size={15} />
                {/* Gelb/rot: Der Kontext wird knapp – auch bei geschlossenem Seitenbereich sichtbar. */}
                {contextLevel !== 'ok' && (
                  <span className="absolute -top-1 -right-1">
                    <LevelDot level={contextLevel} />
                  </span>
                )}
              </button>
            </>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
            {loadError && (
              <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
                {t('chat.modelsError', { error: loadError })}
              </p>
            )}
            {messages.length === 0 && !loadError && (
              <div className="space-y-8 pt-12">
                <p className="text-center text-muted">{t('chat.empty')}</p>
                {chatId === null && (
                  <TemplatePicker
                    templates={templates}
                    activeId={activeTemplate?.id}
                    onPick={applyTemplate}
                  />
                )}
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={`rounded-lg transition-shadow duration-500 ${
                  highlightId === message.id
                    ? 'ring-2 ring-accent ring-offset-4 ring-offset-bg'
                    : ''
                }`}
              >
                <MessageView
                  message={message}
                  onToolDecision={(callId, decision) =>
                    void window.api.chatToolDecision(callId, decision)
                  }
                  usesKnowledge={Boolean(
                    settings.collections?.length || project?.collectionId,
                  )}
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-6 pb-5">
          {activeTemplate && messages.length === 0 && (
            <div className="mb-2 flex">
              <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">
                {t('templates.active', { name: activeTemplate.name })}
                <button
                  type="button"
                  onClick={clearTemplate}
                  title={t('templates.clear')}
                  aria-label={t('templates.clear')}
                  className="rounded-full hover:text-text"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}
          <ChatInput
            disabled={!model}
            isRunning={isRunning}
            onSend={(text) => send(text, model, project?.id)}
            onStop={stop}
          />
          <p className="mt-1.5 text-center text-[11px] text-muted">
            {t('chat.hint')}
          </p>
        </div>
      </div>

      {sideTab && (
        <SidePanel
          tab={sideTab}
          onTab={setSideTab}
          onClose={() => setSideTab(null)}
          messages={messages}
          project={project}
          usage={contextUsage}
          model={models.find((m) => m.name === model)}
          settings={settings}
          onChangeSettings={updateSettings}
        />
      )}
      {settingsOpen && (
        <ChatSettingsPanel
          settings={settings}
          model={models.find((m) => m.name === model)}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(() => false)}
          onTemplateSaved={() => void refreshTemplates()}
        />
      )}
    </div>
  );
}
