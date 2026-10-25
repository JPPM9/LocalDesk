import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SquarePen } from 'lucide-react';
import type { ModelInfo } from '../../shared/api';
import { useChat } from '../chat/useChat';
import { PageHeader } from '../components/PageHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageView } from '../components/chat/MessageView';
import { ModelSelect } from '../components/chat/ModelSelect';

// Nur eine Bequemlichkeit pro Rechner: das zuletzt gewählte Modell.
// Richtige Einstellungen landen später in der Datenbank.
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
  const { messages, isRunning, send, stop, reset } = useChat();
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

  // Beim Streamen mitscrollen, damit die neueste Zeile sichtbar bleibt.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const chooseModel = (name: string) => {
    setModel(name);
    saveLastModel(name);
  };

  const actions = (
    <>
      <ModelSelect
        models={models}
        value={model}
        onChange={chooseModel}
        disabled={isRunning}
      />
      <button
        type="button"
        onClick={reset}
        disabled={messages.length === 0}
        className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
      >
        <SquarePen size={14} />
        {t('chat.newChat')}
      </button>
    </>
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('chat.title')} actions={actions} />

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
  );
}
