import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { isMailReauthMessage } from '../../../shared/mail';

/** Bei abgelaufener Anmeldung: Weg zu den Einstellungen. */
export function ReauthLink({ error }: { error: string }) {
  const { t } = useTranslation();
  if (!isMailReauthMessage(error)) return null;
  return (
    <Link to="/settings" className="text-accent-text underline">
      {t('mail.reauth')}
    </Link>
  );
}
