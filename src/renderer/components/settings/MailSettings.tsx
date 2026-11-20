import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, LoaderCircle, Lock, Mail } from 'lucide-react';
import type { MailAccountView, MailAppView } from '../../../shared/mail';
import { Field } from './SettingsFields';
import { useConfirm } from '../ConfirmDialog';

/** Abschnitt „E-Mail“ in den Einstellungen: eigene Google-App und Konten. */
export function MailSettings() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [google, setGoogle] = useState<MailAppView | null | undefined>();
  const [accounts, setAccounts] = useState<MailAccountView[]>([]);
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void window.api
      .getMailApps()
      .then((apps) =>
        setGoogle(apps.find((a) => a.provider === 'google') ?? null),
      );
    void window.api.listMailAccounts().then(setAccounts);
  }, []);

  const startEdit = () => {
    setClientId(google?.clientId ?? '');
    // Den gespeicherten Schlüssel zeigen wir nicht – neu eintragen.
    setClientSecret('');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const result = await window.api.setGoogleApp({ clientId, clientSecret });
    if (result.ok) {
      setGoogle(result.value);
      setEditing(false);
      setClientSecret('');
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const remove = async () => {
    if (
      !(await confirm({
        message: t('mailSettings.confirmRemove'),
        confirmLabel: t('dialog.remove'),
        danger: true,
      }))
    )
      return;
    const result = await window.api.clearGoogleApp();
    if (result.ok) setGoogle(null);
    else setError(result.error);
  };

  const connect = async () => {
    setError(null);
    setNotice(null);
    setConnecting(true);
    const result = await window.api.connectGoogle();
    setConnecting(false);
    if (result.ok) setAccounts(await window.api.listMailAccounts());
    else setError(result.error);
  };

  const disconnect = async (account: MailAccountView) => {
    if (
      !(await confirm({
        message: t('mailSettings.confirmDisconnect', { email: account.email }),
        confirmLabel: t('mailSettings.disconnect'),
        danger: true,
      }))
    ) {
      return;
    }
    setError(null);
    const result = await window.api.disconnectMailAccount(account.id);
    if (!result.ok) setError(result.error);
    else if (!result.value.revoked) setNotice(t('mailSettings.revokeFailed'));
    else setNotice(null);
    setAccounts(await window.api.listMailAccounts());
  };

  const locked = accounts.length > 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{t('mailSettings.title')}</h2>
        <p className="mt-1 text-xs text-muted">{t('mailSettings.intro')}</p>
        <p className="mt-1 text-xs text-muted">{t('mailSettings.guide')}</p>
      </div>

      <div className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2 font-medium">
          <Mail size={15} className="text-muted" />
          {t('mailSettings.gmail')}
        </div>

        {editing ? (
          <div className="space-y-4">
            <Field
              label={t('mailSettings.clientId')}
              hint={t('mailSettings.clientIdHint')}
            >
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789012-abc….apps.googleusercontent.com"
                spellCheck={false}
                className="field w-full tabular-nums"
              />
            </Field>
            <Field
              label={t('mailSettings.clientSecret')}
              hint={t('mailSettings.clientSecretHint')}
            >
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="GOCSPX-…"
                spellCheck={false}
                autoComplete="off"
                className="field w-full tabular-nums"
              />
            </Field>
            {error && <p className="text-xs text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-secondary"
              >
                {t('mcp.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="btn btn-primary"
              >
                {t('mcp.save')}
              </button>
            </div>
          </div>
        ) : google ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs text-ok">
                <CircleCheck size={13} />
                {t('mailSettings.saved')} · {t('mailSettings.secretStored')}
              </p>
              <p className="tabular-nums text-xs break-all text-muted">
                {google.clientId}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={startEdit}
                  disabled={locked}
                  className="btn btn-secondary"
                >
                  {t('mailSettings.change')}
                </button>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={locked}
                  className="btn btn-secondary"
                >
                  {t('mailSettings.remove')}
                </button>
                {locked && (
                  <span className="text-xs text-subtle">
                    {t('mailSettings.lockedHint')}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <h3 className="text-[13px] font-medium">
                {t('mailSettings.accounts')}
              </h3>
              {accounts.length === 0 ? (
                <p className="text-xs text-muted">
                  {t('mailSettings.noAccounts')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {accounts.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 bg-surface shadow-card"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        {account.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => void disconnect(account)}
                        className="btn btn-secondary"
                      >
                        {t('mailSettings.disconnect')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {connecting ? (
                <div className="space-y-2 rounded-lg bg-accent-soft/50 px-3 py-2">
                  <p className="flex items-start gap-2 text-xs">
                    <LoaderCircle
                      size={14}
                      className="mt-0.5 shrink-0 animate-spin text-accent-text"
                    />
                    {t('mailSettings.waiting')}
                  </p>
                  <button
                    type="button"
                    onClick={() => void window.api.cancelMailConnect()}
                    className="btn btn-secondary"
                  >
                    {t('mailSettings.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void connect()}
                  className="btn btn-primary"
                >
                  {t(
                    accounts.length > 0
                      ? 'mailSettings.connectAnother'
                      : 'mailSettings.connect',
                  )}
                </button>
              )}
              <p className="flex items-center gap-2 text-xs text-subtle">
                <Lock size={12} />
                {t('mailSettings.encrypted')}
              </p>
              {error && <p className="text-xs text-error">{error}</p>}
              {notice && <p className="text-xs text-warn">{notice}</p>}
            </div>
          </div>
        ) : (
          google === null && (
            <div className="space-y-2">
              <p className="text-xs text-muted">{t('mailSettings.notSetUp')}</p>
              <button
                type="button"
                onClick={startEdit}
                className="btn btn-primary"
              >
                {t('mailSettings.setUp')}
              </button>
            </div>
          )
        )}
      </div>

      <p className="text-xs text-subtle">{t('mailSettings.outlookLater')}</p>
    </section>
  );
}
