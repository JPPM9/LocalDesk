import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../../chat/useChat';
import { useChatModels } from '../../hooks/useChatModels';
import { PageHeader } from '../PageHeader';
import { StickyScroll } from '../StickyScroll';
import { ChatInput } from '../chat/ChatInput';
import { MessageView } from '../chat/MessageView';
import { ModelSelect } from '../chat/ModelSelect';
import { CodeModeSwitch } from './CodeModeSwitch';
import type { CodeMode } from '../../../shared/code-agent';

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
  const { messages, settings, isRunning, send, stop, updateSettings } = useChat(
    sessionId,
    {
      onCreated: () => {},
      onChanged,
    },
  );
  const mode: CodeMode = settings.codeMode ?? 'manual';
  const setMode = (next: CodeMode) => {
    const { codeMode: _old, ...rest } = settings;
    updateSettings(next === 'plan' ? { ...rest, codeMode: 'plan' } : rest);
  };
  // Plan fertig: letzte Nachricht ist eine fertige Antwort des Agenten – dann darf der Plan freigegeben werden.
  const last = messages.at(-1);
  const planReady =
    mode === 'plan' &&
    !isRunning &&
    last?.role === 'assistant' &&
    last.status === 'done' &&
    last.content.trim() !== '';
  const approvePlan = () => {
    setMode('manual');
    send(t('code.plan.executeMessage'), model);
  };
  const { models } = useChatModels();
  const [model, setModel] = useState('');

  // Nur Modelle, die Werkzeuge können, taugen als Agent.
  const toolModels = models.filter((m) => m.capabilities.includes('tools'));
  useEffect(() => {
    if (model || toolModels.length === 0) return;
    const saved = rememberedModel();
    setModel(
      toolModels.find((m) => m.name === saved)?.name ?? toolModels[0].name,
    );
  }, [toolModels, model]);

  const lastUserId =
    [...messages].reverse().find((m) => m.role === 'user')?.id ?? null;

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
      <StickyScroll resetKey={sessionId} followKey={lastUserId}>
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
        </div>
      </StickyScroll>
      <div className="mx-auto w-full max-w-[820px] px-7 pb-4">
        {planReady && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5">
            <div className="min-w-0 text-sm">
              <p className="font-medium text-accent-text">
                {t('code.plan.ready')}
              </p>
              <p className="text-xs text-muted">{t('code.plan.executeHint')}</p>
            </div>
            <button
              type="button"
              onClick={approvePlan}
              disabled={!model}
              className="shrink-0 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('code.plan.execute')}
            </button>
          </div>
        )}
        <ChatInput
          disabled={!model}
          isRunning={isRunning}
          onSend={(text) => send(text, model)}
          onStop={stop}
          tools={
            <CodeModeSwitch
              mode={mode}
              onChange={setMode}
              disabled={isRunning}
            />
          }
        />
      </div>
    </div>
  );
}
