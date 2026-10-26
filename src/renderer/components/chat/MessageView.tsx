import { useTranslation } from 'react-i18next';
import type { MessageRecord } from '../../../shared/api';
import { Markdown } from './Markdown';

export function MessageView({ message }: { message: MessageRecord }) {
  const { t } = useTranslation();

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-accent-soft px-4 py-2.5 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting =
    message.status === 'streaming' && !message.content && !message.thinking;

  return (
    <div className="space-y-2">
      <div className="font-mono text-[11px] text-muted">{message.model}</div>

      {message.thinking && (
        <details className="rounded border border-border bg-surface px-3 py-2 text-[13px] text-muted">
          <summary className="cursor-pointer select-none">
            {message.status === 'streaming' && !message.content
              ? t('chat.thinkingNow')
              : t('chat.thinking')}
          </summary>
          <div className="mt-2 whitespace-pre-wrap">{message.thinking}</div>
        </details>
      )}

      {waiting && (
        <p className="animate-pulse text-muted">{t('chat.waiting')}</p>
      )}
      {message.content && <Markdown text={message.content} />}

      {message.status === 'error' && (
        <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-error">
          {t('chat.error', { error: message.error })}
        </p>
      )}
      {message.status === 'aborted' && (
        <p className="text-xs text-muted">{t('chat.aborted')}</p>
      )}
      {message.stats && (
        <p className="font-mono text-[11px] text-muted">
          {t('chat.stats', {
            tokens: message.stats.outputTokens,
            speed: message.stats.tokensPerSecond.toLocaleString('de-DE', {
              maximumFractionDigits: 1,
            }),
            seconds: (message.stats.totalMs / 1000).toLocaleString('de-DE', {
              maximumFractionDigits: 1,
            }),
          })}
        </p>
      )}
    </div>
  );
}
