import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Mail } from 'lucide-react';
import type { MailAppView } from '../../../shared/mail';
import { Field } from './SettingsFields';

/** Abschnitt „E-Mail“ in den Einstellungen: die eigene Google-App eintragen. */
export function MailSettings() {
  const { t } = useTranslation();
  const [google, setGoogle] = useState<MailAppView | null | undefined>();
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.api
      .getMailApps()
      .then((apps) =>
        setGoogle(apps.find((a) => a.provider === 'google') ?? null),
      );
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
    } else {
      setError(result.error);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('mailSettings.confirmRemove'))) return;
    await window.api.clearGoogleApp();
    setGoogle(null);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{t('mailSettings.title')}</h2>
        <p className="mt-1 text-xs text-muted">{t('mailSettings.intro')}</p>
        <p className="mt-1 text-xs text-muted">{t('mailSettings.guide')}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
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
                className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
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
                className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
              />
            </Field>
            {error && <p className="text-xs text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-border px-3 py-1 hover:bg-surface-hover"
              >
                {t('mcp.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="rounded bg-accent px-3 py-1 text-white disabled:opacity-40"
              >
                {t('mcp.save')}
              </button>
            </div>
          </div>
        ) : google ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-ok">
              <CircleCheck size={13} />
              {t('mailSettings.saved')} · {t('mailSettings.secretStored')}
            </p>
            <p className="font-mono text-xs break-all text-muted">
              {google.clientId}
            </p>
            <p className="text-xs text-muted">{t('mailSettings.nextStep')}</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={startEdit}
                className="rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
              >
                {t('mailSettings.change')}
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                className="rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
              >
                {t('mailSettings.remove')}
              </button>
            </div>
          </div>
        ) : (
          google === null && (
            <div className="space-y-2">
              <p className="text-xs text-muted">{t('mailSettings.notSetUp')}</p>
              <button
                type="button"
                onClick={startEdit}
                className="rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90"
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
