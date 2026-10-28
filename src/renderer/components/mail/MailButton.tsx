import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import type { MailAccountView } from '../../../shared/mail';
import { PickerButton } from '../PickerButton';

interface MailButtonProps {
  /** Gewähltes Konto (höchstens eins). */
  selected: string[];
  onChange: (accountIds: string[]) => void;
  /** Ohne Werkzeug-Fähigkeit kann das Modell keine Mails lesen. */
  modelSupportsTools: boolean | undefined;
}

/** Schalter „E-Mail“ im Eingabefeld: Darf das Modell in diesem Chat ins Postfach sehen? */
export function MailButton({
  selected,
  onChange,
  modelSupportsTools,
}: MailButtonProps) {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<MailAccountView[] | null>(null);

  useEffect(() => {
    void window.api.listMailAccounts().then(setAccounts);
  }, []);

  // Ein abgemeldetes Konto zählt nicht mehr.
  const active = selected.filter((id) => accounts?.some((a) => a.id === id));

  return (
    <PickerButton
      icon={Mail}
      label={t('mailChat.button')}
      chipText={t('mailChat.chip')}
      count={active.length}
      title={t('mailChat.title')}
      intro={t('mailChat.intro')}
    >
      {accounts === null ? (
        <p className="text-xs text-muted">{t('status.loading')}</p>
      ) : accounts.length === 0 ? (
        <p className="text-xs text-muted">
          {t('mailChat.none')}{' '}
          <Link to="/settings" className="text-accent-text underline">
            {t('mailChat.toSettings')}
          </Link>
        </p>
      ) : (
        <ul className="space-y-1">
          {accounts.map((account) => (
            <li key={account.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-hover">
                <input
                  type="checkbox"
                  checked={active.includes(account.id)}
                  onChange={(e) =>
                    onChange(e.target.checked ? [account.id] : [])
                  }
                  className="accent-[var(--ld-accent)]"
                />
                <span className="min-w-0 flex-1 truncate">{account.email}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {modelSupportsTools === false && active.length > 0 && (
        <p className="text-[11.5px] text-warn">{t('mailChat.noTools')}</p>
      )}
    </PickerButton>
  );
}
