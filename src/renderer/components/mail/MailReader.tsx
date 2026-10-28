import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Paperclip, Sparkles, X } from 'lucide-react';
import type { MailMessage } from '../../../shared/mail';
import { useMailModel } from '../../mail/useMailModel';
import { fileSize } from '../../mail/format';
import { ReauthLink } from './ReauthLink';
import { PageHeader } from '../PageHeader';
import { ModelSelect } from '../chat/ModelSelect';

type SummaryState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; text: string; model: string }
  | { kind: 'error'; error: string };

interface MailReaderProps {
  accountId: string;
  messageId: string;
}

/** Eine Mail als Text, mit „Zusammenfassen“ durch das lokale Modell. */
export function MailReader({ accountId, messageId }: MailReaderProps) {
  const { t } = useTranslation();
  const [mail, setMail] = useState<MailMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryState>({ kind: 'idle' });
  const { models, model, choose: chooseModel } = useMailModel();

  useEffect(() => {
    void window.api.getMail(accountId, messageId).then((result) => {
      if (result.ok) setMail(result.value);
      else setError(result.error);
    });
  }, [accountId, messageId]);

  // Verlässt man die Mail, läuft die Zusammenfassung nicht weiter.
  useEffect(() => () => void window.api.cancelMailSummary(), []);

  const summarize = async () => {
    setSummary({ kind: 'running' });
    const result = await window.api.summarizeMail(accountId, messageId, model);
    setSummary(
      result.ok
        ? { kind: 'done', text: result.value, model }
        : { kind: 'error', error: result.error },
    );
  };

  return (
    <>
      <PageHeader
        title={mail ? mail.subject || t('mail.noSubject') : t('mail.title')}
        actions={
          mail && (
            <>
              <ModelSelect
                models={models}
                value={model}
                onChange={chooseModel}
                disabled={summary.kind === 'running'}
              />
              {summary.kind === 'running' ? (
                <button
                  type="button"
                  onClick={() => void window.api.cancelMailSummary()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] hover:bg-surface-hover"
                >
                  <LoaderCircle size={15} className="animate-spin" />
                  {t('mail.cancel')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void summarize()}
                  disabled={!model}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  <Sparkles size={15} />
                  {t('mail.summarize')}
                </button>
              )}
            </>
          )
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="mx-auto max-w-3xl space-y-2 px-7 py-6">
            <p className="text-error">{error}</p>
            <ReauthLink error={error} />
          </div>
        ) : !mail ? (
          <p className="px-7 py-6 text-muted">{t('mail.loading')}</p>
        ) : (
          <article className="mx-auto max-w-3xl space-y-5 px-7 py-6">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[13px]">
              <dt className="text-muted">{t('mail.from')}</dt>
              <dd className="break-words">{mail.from}</dd>
              {mail.to && (
                <>
                  <dt className="text-muted">{t('mail.to')}</dt>
                  <dd className="break-words">{mail.to}</dd>
                </>
              )}
              {mail.cc && (
                <>
                  <dt className="text-muted">{t('mail.cc')}</dt>
                  <dd className="break-words">{mail.cc}</dd>
                </>
              )}
              <dt className="text-muted">{t('mail.date')}</dt>
              <dd className="tabular-nums">
                {new Date(mail.date).toLocaleString('de-DE', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </dd>
            </dl>

            {mail.attachments.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted">{t('mail.attachments')}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {mail.attachments.map((a, i) => (
                    <li
                      key={`${a.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs"
                    >
                      <Paperclip size={12} className="text-subtle" />
                      <span className="font-mono">{a.name}</span>
                      <span className="text-subtle">{fileSize(a.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.kind === 'done' && (
              <section className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-accent-text" />
                  <h2 className="flex-1 font-medium">{t('mail.summary')}</h2>
                  <button
                    type="button"
                    onClick={() => setSummary({ kind: 'idle' })}
                    title={t('mail.close')}
                    aria-label={t('mail.close')}
                    className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Reiner Text: Links aus der Antwort werden nicht klickbar. */}
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                  {summary.text}
                </p>
                <p className="text-xs text-subtle">
                  {t('mail.summaryHint', { model: summary.model })}
                </p>
              </section>
            )}
            {summary.kind === 'running' && (
              <p className="flex items-center gap-2 text-muted">
                <LoaderCircle size={15} className="animate-spin" />
                {t('mail.summarizing')}
              </p>
            )}
            {summary.kind === 'error' && (
              <p className="text-error">{summary.error}</p>
            )}

            {mail.truncated && (
              <p className="text-xs text-warn">{t('mail.truncated')}</p>
            )}
            <div className="border-t border-border pt-5 text-[14px] leading-relaxed break-words whitespace-pre-wrap">
              {mail.text || mail.snippet}
            </div>
          </article>
        )}
      </div>
    </>
  );
}
