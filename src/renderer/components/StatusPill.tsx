import { useTranslation } from 'react-i18next';
import { useOllamaStatus } from '../hooks/useOllamaStatus';

interface StatusPillProps {
  /** Bei eingeklappter Seitenleiste nur den farbigen Punkt zeigen. */
  compact: boolean;
}

export function StatusPill({ compact }: StatusPillProps) {
  const { t } = useTranslation();
  const status = useOllamaStatus();

  let dotClass = 'bg-muted';
  let label = t('status.checking');
  let detail = '';

  if (status?.online) {
    dotClass = 'bg-ok';
    label = t('status.online', { version: status.version });
    detail = status.baseUrl;
  } else if (status) {
    dotClass = 'bg-error';
    label = t('status.offline');
    detail = `${status.baseUrl} – ${status.error}`;
  }

  return (
    <div
      className="flex items-center gap-2 text-xs"
      title={detail ? `${label}\n${detail}` : label}
      role="status"
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`}
      />
      {!compact && (
        <div className="min-w-0">
          <div className="truncate">{label}</div>
          {detail && (
            <div className="truncate font-mono text-[11px] text-muted">
              {detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
