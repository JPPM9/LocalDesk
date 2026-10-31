import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, TriangleAlert } from 'lucide-react';
import type { MessageRecord, ToolDecision } from '../../../shared/api';
import { Markdown } from './Markdown';
import { CopyButton, EditBox, EditButton, RetryButton } from './MessageActions';
import { RememberButton } from './RememberButton';
import { SaveNoteButton } from './SaveNoteButton';
import { SourceList } from './SourceList';
import { ToolCallView } from './ToolCallView';
import { messageLocale } from '../../../shared/messages';

interface MessageViewProps {
  message: MessageRecord;
  onToolDecision: (
    callId: string,
    decision: ToolDecision,
    args?: Record<string, unknown>,
  ) => void;
  /** Projekt des Chats (für Erinnerungen nur im Projekt). */
  project?: { id: string; name: string };
  /** Vault eingerichtet → Knöpfe „Merken“ und „In Obsidian speichern“. */
  canRemember?: boolean;
  /** Gespeicherter Chat, zu dem die Nachricht gehört (für „In Obsidian speichern“). */
  chatId?: string;
  /** Dieser Chat durchsucht Wissen – solange Quellen fehlen, läuft die Suche noch. */
  usesKnowledge?: boolean;
  /** Eigene Nachricht ändern und neu senden (fehlt = „Bearbeiten“ gibt es nicht). */
  onEdit?: (text: string) => void;
  /** Letzte Antwort neu erzeugen (nur an der letzten Antwort gesetzt). */
  onRetry?: () => void;
}

export function MessageView({
  message,
  onToolDecision,
  project,
  canRemember = false,
  chatId,
  usesKnowledge = false,
  onEdit,
  onRetry,
}: MessageViewProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [citeFocus, setCiteFocus] = useState<{ n: number; at: number } | null>(
    null,
  );

  if (message.role === 'user') {
    if (editing && onEdit) {
      return (
        <div className="space-y-1">
          <EditBox
            initialText={message.content}
            onSend={(text) => {
              setEditing(false);
              onEdit(text);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      );
    }
    return (
      <div className="group space-y-1">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-bubble px-4 py-2.5 whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-1">
          <CopyButton text={message.content} />
          {onEdit && <EditButton onClick={() => setEditing(true)} />}
          {canRemember && (
            <RememberButton
              text={message.content}
              project={project}
              align="end"
            />
          )}
        </div>
      </div>
    );
  }

  const toolCalls = message.toolCalls ?? [];
  const streaming = message.status === 'streaming';
  const usedTools = toolCalls.length > 0;
  // Nur der Hinweis „lädt“, solange noch gar nichts da ist – und nicht, während
  // eine Rückfrage auf dich wartet.
  const waiting =
    streaming &&
    !message.content &&
    !toolCalls.some((c) => c.status === 'asking' || c.status === 'running') &&
    (usedTools || !message.thinking);
  const searching =
    streaming &&
    usesKnowledge &&
    message.sources === undefined &&
    message.knowledgeError === undefined;
  const sources = message.sources ?? [];

  return (
    <div className="group space-y-2">
      <div className="flex items-center gap-2 text-[12.5px] text-muted">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] bg-gradient-to-b from-[#3b76f0] to-[#1d4fd0] text-white">
          <Sparkles size={12} />
        </span>
        {message.model}
      </div>

      {message.thinking && (
        <details className="rounded-xl bg-surface-2 px-3.5 py-2 text-[13px] text-muted">
          <summary className="cursor-pointer select-none">
            {streaming && !message.content && !usedTools
              ? t('chat.thinkingNow')
              : t('chat.thinking')}
          </summary>
          <div className="mt-2 whitespace-pre-wrap">{message.thinking}</div>
        </details>
      )}

      {usedTools && (
        <div className="space-y-1.5">
          {toolCalls.map((call) => (
            <ToolCallView
              key={call.id}
              call={call}
              onDecision={onToolDecision}
              projectName={project?.name}
            />
          ))}
        </div>
      )}

      {waiting && (
        <p className="animate-pulse text-muted">
          {searching
            ? t('sources.searching')
            : usedTools
              ? t('chat.toolWorking')
              : t('chat.waiting')}
        </p>
      )}
      {message.content && (
        <Markdown
          text={message.content}
          sourceCount={sources.length}
          onCite={(n) => setCiteFocus({ n, at: Date.now() })}
        />
      )}

      {message.knowledgeError && (
        <p className="flex items-start gap-1.5 text-xs text-warn">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          {t('sources.error', { error: message.knowledgeError })}
        </p>
      )}
      {message.sources?.length === 0 && !message.knowledgeError && (
        <p className="text-xs text-muted">{t('sources.none')}</p>
      )}
      {sources.length > 0 && <SourceList sources={sources} focus={citeFocus} />}

      {message.status === 'error' && (
        <p className="rounded-xl border border-error/40 bg-error/10 px-3.5 py-2.5 text-error">
          {t('chat.error', { error: message.error })}
        </p>
      )}
      {message.status === 'aborted' && (
        <p className="text-xs text-muted">{t('chat.aborted')}</p>
      )}
      {message.stats && (
        <p className="text-xs text-subtle tabular-nums">
          {t('chat.stats', {
            tokens: message.stats.outputTokens,
            speed: message.stats.tokensPerSecond.toLocaleString(
              messageLocale(),
              {
                maximumFractionDigits: 1,
              },
            ),
            seconds: (message.stats.totalMs / 1000).toLocaleString(
              messageLocale(),
              {
                maximumFractionDigits: 1,
              },
            ),
          })}
        </p>
      )}
      {!streaming && message.content && (
        <div className="flex flex-wrap items-start gap-1">
          <CopyButton text={message.content} />
          {onRetry && <RetryButton onClick={onRetry} />}
          {canRemember && chatId && (
            <SaveNoteButton
              chatId={chatId}
              answerId={message.id}
              variant="text"
            />
          )}
          {canRemember && (
            <RememberButton text={message.content} project={project} />
          )}
        </div>
      )}
    </div>
  );
}
