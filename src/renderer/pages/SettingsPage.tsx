import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppInfo } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { ServerSettings } from '../components/settings/ServerSettings';

export function SettingsPage() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.api.getAppInfo().then(setInfo);
  }, []);

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="max-w-2xl space-y-8 p-6">
        <ServerSettings />
        <section>
          <h2 className="mb-3 font-semibold">{t('settings.about')}</h2>
          {info ? (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 rounded border border-border bg-surface p-4 font-mono text-[13px]">
              <dt className="text-muted">{t('settings.version')}</dt>
              <dd>{info.version}</dd>
              <dt className="text-muted">Electron</dt>
              <dd>{info.electron}</dd>
              <dt className="text-muted">Node</dt>
              <dd>{info.node}</dd>
              <dt className="text-muted">Chromium</dt>
              <dd>{info.chrome}</dd>
              <dt className="text-muted">{t('settings.dataPath')}</dt>
              <dd className="break-all">{info.dataPath}</dd>
            </dl>
          ) : (
            <p className="text-muted">{t('settings.loading')}</p>
          )}
        </section>
      </div>
    </>
  );
}
