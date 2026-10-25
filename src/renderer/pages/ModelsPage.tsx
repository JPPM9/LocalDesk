import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';

export function ModelsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('models.title')} />
      <p className="p-6 text-muted">{t('models.placeholder')}</p>
    </>
  );
}
