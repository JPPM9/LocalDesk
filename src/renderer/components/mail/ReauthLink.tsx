import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MAIL_REAUTH_MESSAGE } from '../../../shared/mail';

/** Bei abgelaufener Anmeldung: Weg zu den Einstellungen. */
export function ReauthLink({ error }: { error: string }) {
  const { t } = useTranslation();
  if (!error.includes(MAIL_REAUTH_MESSAGE)) return null;
  return (
    <Link to="/settings" className="text-accent-text underline">
      {t('mail.reauth')}
    </Link>
  );
}
