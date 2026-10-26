import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import type { ChatSummary, ModelInfo } from '../../shared/api';
import { thinkFitsModel } from '../../shared/settings';
import { useChat } from '../chat/useChat';
import { useChatList } from '../chat/useChatList';
import { PageHeader } from '../components/PageHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { ChatList } from '../components/chat/ChatList';
import { ChatSettingsPanel } from '../components/chat/ChatSettingsPanel';
import { MessageView } from '../components/chat/MessageView';
import { ModelSelect } from '../components/chat/ModelSelect';

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

/** Reine Embedding-Modelle können nicht chatten und gehören nicht in die Auswahl. */
function canChat(model: ModelInfo) {
  return (
    model.capabilities.length === 0 || model.capabilities.includes('completion')
  );
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasCustomSettings = Object.keys(settings).length > 0;

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void window.api.listModels().then((result) => {
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      const chatModels = result.value.filter(canChat);
      setModels(chatModels);
      const last = readLastModel();
      setModel(
        chatModels.find((m) => m.name === last)?.name ??
          chatModels[0]?.name ??
          '',
      );
    });
  }, []);

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

  return (
    <div className="flex h-full">
      <ChatList
        chats={chatList.chats}
        onNew={() => navigate('/chat')}
        onRename={(id, title) => void chatList.rename(id, title)}
        onDelete={(target) => void deleteChat(target)}
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
              <ModelSelect
                models={models}
                value={model}
                onChange={chooseModel}
                disabled={isRunning}
              />
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                title={t('settingsPanel.title')}
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
              <p className="pt-16 text-center text-muted">{t('chat.empty')}</p>
            )}
            {messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-6 pb-5">
          <ChatInput
            disabled={!model}
            isRunning={isRunning}
            onSend={(text) => send(text, model)}
            onStop={stop}
          />
          <p className="mt-1.5 text-center text-[11px] text-muted">
            {t('chat.hint')}
          </p>
        </div>
      </div>

      {settingsOpen && (
        <ChatSettingsPanel
          settings={settings}
          model={models.find((m) => m.name === model)}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
