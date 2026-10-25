import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';

export function ChatPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('chat.title')} />
      <p className="p-6 text-muted">{t('chat.placeholder')}</p>
    </>
  );
}
