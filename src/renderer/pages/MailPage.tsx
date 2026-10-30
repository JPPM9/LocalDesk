import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Mail, RefreshCw, Search, Star, WandSparkles } from 'lucide-react';
import type { MailAccountView, MailSummary } from '../../shared/mail';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { MailReader } from '../components/mail/MailReader';
import { ReauthLink } from '../components/mail/ReauthLink';
import { SortPanel } from '../components/mail/SortPanel';
import { mailDate, senderName } from '../mail/format';

const ACCOUNT_KEY = 'localdesk.mailAccount';
const PAGE_SIZE = 25;

const ICON_BTN =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40';

function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Seite „E-Mail“: links die Liste (Posteingang oder Gmail-Suche), rechts die
 * gewählte Mail als Text. Die Mails kommen jedes Mal frisch von Gmail –
 * LocalDesk speichert keine Kopie.
 */
export function MailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const messageId = useParams().messageId ?? null;

  const [accounts, setAccounts] = useState<MailAccountView[] | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [nextPage, setNextPage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState(false);

  useEffect(() => {
    void window.api.listMailAccounts().then((list) => {
      setAccounts(list);
      const saved = remembered(ACCOUNT_KEY);
      setAccountId(list.find((a) => a.id === saved)?.id ?? list[0]?.id ?? null);
    });
  }, []);

  const load = useCallback(
    async (pageToken?: string) => {
      if (!accountId) return;
      setLoading(true);
      setError(null);
      const result = await window.api.listMail({
        accountId,
        query: query || undefined,
        pageToken,
        max: PAGE_SIZE,
      });
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((current) =>
        pageToken
          ? [...current, ...result.value.messages]
          : result.value.messages,
      );
      setNextPage(result.value.nextPageToken);
    },
    [accountId, query],
  );

  useEffect(() => {
    setMessages([]);
    setNextPage(undefined);
    void load();
  }, [load]);

  const chooseAccount = (id: string) => {
    try {
      localStorage.setItem(ACCOUNT_KEY, id);
    } catch {
      // ohne Speicher gilt die Wahl nur bis zum Neustart
    }
    setAccountId(id);
    setSorting(false);
    navigate('/mail');
  };

  if (accounts && accounts.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('mail.title')} />
        <EmptyState
          icon={Mail}
          text={t('mail.setupText')}
          action={
            <Link
              to="/settings"
              className="inline-block rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
            >
              {t('mail.toSettings')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="space-y-2 px-2.5 pt-3 pb-2">
          {accounts && accounts.length > 1 && (
            <select
              value={accountId ?? ''}
              onChange={(e) => chooseAccount(e.target.value)}
              aria-label={t('mail.account')}
              className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[13px] outline-none focus:border-accent"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5">
            <form
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-bg px-2.5 focus-within:border-accent"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(input.trim());
              }}
            >
              <Search size={14} className="shrink-0 text-subtle" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('mail.search')}
                title={t('mail.searchHint')}
                aria-label={t('mail.search')}
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none"
              />
            </form>
            <button
              type="button"
              onClick={() => {
                setSorting(true);
                navigate('/mail');
              }}
              disabled={messages.length === 0}
              title={t('mailSort.open')}
              aria-label={t('mailSort.open')}
              className={ICON_BTN}
            >
              <WandSparkles size={16} />
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              title={t('mail.refresh')}
              aria-label={t('mail.refresh')}
              className={ICON_BTN}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="px-1 text-xs text-subtle">
            {query ? t('mail.results') : t('mail.inbox')}
            {accounts?.length === 1 && ` · ${accounts[0].email}`}
          </p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
          {error && (
            <div className="space-y-2 px-2 py-2 text-xs">
              <p className="text-error">{error}</p>
              <ReauthLink error={error} />
            </div>
          )}
          {!loading && !error && messages.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted">
              {t('mail.empty')}
            </p>
          )}
          {messages.map((m) => (
            <NavLink
              key={m.id}
              to={`/mail/${m.id}`}
              className={({ isActive }) =>
                `my-px block rounded-lg px-2.5 py-2 ${
                  isActive
                    ? 'bg-surface-hover text-text'
                    : 'text-muted hover:bg-surface-hover hover:text-text'
                }`
              }
            >
              <div className="flex items-center gap-1.5">
                {m.unread && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    title={t('mail.unread')}
                  />
                )}
                <span
                  className={`min-w-0 flex-1 truncate ${m.unread ? 'font-semibold text-text' : ''}`}
                >
                  {senderName(m.from)}
                </span>
                {m.starred && (
                  <Star
                    size={12}
                    className="shrink-0 fill-warn text-warn"
                    aria-label={t('mail.starred')}
                  />
                )}
                <span className="shrink-0 text-xs text-subtle tabular-nums">
                  {mailDate(m.date)}
                </span>
              </div>
              <div
                className={`truncate text-[13px] ${m.unread ? 'font-medium text-text' : ''}`}
              >
                {m.subject || t('mail.noSubject')}
              </div>
              <div className="truncate text-xs text-subtle">{m.snippet}</div>
            </NavLink>
          ))}
          {nextPage && (
            <button
              type="button"
              onClick={() => void load(nextPage)}
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-border py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
            >
              {loading ? t('mail.loading') : t('mail.more')}
            </button>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {accountId && sorting && !messageId ? (
          <SortPanel
            accountId={accountId}
            messageIds={messages.map((m) => m.id)}
            onClose={() => setSorting(false)}
            onApplied={() => void load()}
          />
        ) : accountId && messageId ? (
          <MailReader
            key={`${accountId}:${messageId}`}
            accountId={accountId}
            messageId={messageId}
          />
        ) : (
          <>
            <PageHeader title={t('mail.title')} />
            <EmptyState
              icon={Mail}
              text={t('mail.noSelection')}
              hint={t('mail.noSelectionHint')}
            />
          </>
        )}
      </div>
    </div>
  );
}
