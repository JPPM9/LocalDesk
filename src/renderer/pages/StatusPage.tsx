import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { StatusPanel } from '../components/status/StatusPanel';

/** Wie oft die Seite neu abfragt – hier darf es schneller sein als in der Statusleiste. */
const POLL_MS = 2000;

export function StatusPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t('status.pageTitle')} />
      <div className="max-w-3xl p-6">
        <StatusPanel intervalMs={POLL_MS} />
      </div>
    </>
  );
}
