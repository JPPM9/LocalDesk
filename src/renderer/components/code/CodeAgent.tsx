import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../../chat/useChat';
import { useChatModels } from '../../hooks/useChatModels';
import { PageHeader } from '../PageHeader';
import { ChatInput } from '../chat/ChatInput';
import { MessageView } from '../chat/MessageView';
import { ModelSelect } from '../chat/ModelSelect';

const MODEL_KEY = 'localdesk.codeModel';

function rememberedModel(): string | null {
  try {
    return localStorage.getItem(MODEL_KEY);
  } catch {
    return null;
  }
}

interface CodeAgentProps {
  sessionId: string;
  /** Nach jeder Antwort: Sitzungsliste und Dateibaum auffrischen. */
  onChanged: () => void;
}

/** Der Agent-Chat einer Code-Sitzung – gleiche Nachrichten wie im Chat, eigene Werkzeuge. */
export function CodeAgent({ sessionId, onChanged }: CodeAgentProps) {
  const { t } = useTranslation();
  const { messages, isRunning, send, stop } = useChat(sessionId, {
    onCreated: () => {},
    onChanged,
  });
  const { models } = useChatModels();
  const [model, setModel] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Nur Modelle, die Werkzeuge können, taugen als Agent.
  const toolModels = models.filter((m) => m.capabilities.includes('tools'));
  useEffect(() => {
    if (model || toolModels.length === 0) return;
    const saved = rememberedModel();
    setModel(
      toolModels.find((m) => m.name === saved)?.name ?? toolModels[0].name,
    );
  }, [toolModels, model]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const choose = (name: string) => {
    setModel(name);
    try {
      localStorage.setItem(MODEL_KEY, name);
    } catch {
      // ohne Speicher gilt die Wahl nur bis zum Neustart
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={t('code.agent')}
        actions={
          <ModelSelect
            models={toolModels}
            value={model}
            onChange={choose}
            disabled={isRunning}
          />
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[820px] space-y-7 px-7 py-7">
          {models.length > 0 && toolModels.length === 0 && (
            <p className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-warn">
              {t('code.noToolModels')}
            </p>
          )}
          {messages.length === 0 && (
            <div className="space-y-2 pt-10 text-center text-muted">
              <p>{t('code.agentEmpty')}</p>
              <p className="text-xs text-subtle">{t('code.agentHint')}</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageView
              key={message.id}
              message={message}
              onToolDecision={(callId, decision, args) =>
                void window.api.chatToolDecision(callId, decision, args)
              }
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[820px] px-7 pb-4">
        <ChatInput
          disabled={!model}
          isRunning={isRunning}
          onSend={(text) => send(text, model)}
          onStop={stop}
        />
      </div>
    </div>
  );
}
