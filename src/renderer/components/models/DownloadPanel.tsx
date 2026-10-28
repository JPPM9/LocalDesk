import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleX, Download, ExternalLink, X } from 'lucide-react';
import { downloadPercent, isValidModelName } from '../../../shared/download';
import type { DownloadView } from '../../hooks/useDownloads';
import { formatBytes } from '../../utils/format';
import { remaining } from '../../utils/downloadSpeed';

/** Offizielle Modell-Bibliothek – öffnet sich im normalen Browser. */
const LIBRARY_URL = 'https://ollama.com/library';

/** Abschnitt „Modell herunterladen“: Eingabe plus Liste laufender/fertiger Downloads. */
export function DownloadPanel({ downloads }: { downloads: DownloadView[] }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const model = name.trim();
    if (!isValidModelName(model)) {
      setError(t('downloads.invalidName'));
      return;
    }
    const result = await window.api.startDownload(model);
    if (result.ok) {
      setName('');
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="space-y-3">
      <form onSubmit={(e) => void submit(e)} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder={t('downloads.placeholder')}
          aria-label={t('downloads.placeholder')}
          className="min-w-0 flex-1 rounded border border-border bg-surface px-3 py-1.5 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-white disabled:opacity-40"
        >
          <Download size={15} />
          {t('downloads.start')}
        </button>
      </form>
      <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
        {t('downloads.hint')}
        <a
          href={LIBRARY_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-accent-text underline"
        >
          ollama.com/library <ExternalLink size={11} />
        </a>
      </p>
      {error && <p className="text-xs text-error">{error}</p>}

      {downloads.length > 0 && (
        <ul className="space-y-2">
          {downloads.map((download) => (
            <DownloadRow key={download.model} download={download} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DownloadRow({ download }: { download: DownloadView }) {
  const { t } = useTranslation();
  const running = ['starting', 'downloading', 'verifying'].includes(
    download.phase,
  );
  const percent = downloadPercent(download);

  const details = [
    download.totalBytes > 0
      ? t('downloads.bytes', {
          // formatBytes zeigt für 0 einen Strich („unbekannt“) – hier heißt 0 aber „noch nichts“.
          done:
            download.completedBytes > 0
              ? formatBytes(download.completedBytes)
              : '0 MB',
          total: formatBytes(download.totalBytes),
        })
      : null,
    download.bytesPerSecond
      ? `${formatBytes(download.bytesPerSecond)}/s`
      : null,
    download.phase === 'downloading'
      ? remaining(
          download.totalBytes,
          download.completedBytes,
          download.bytesPerSecond,
        )
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="space-y-1.5 rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        {download.phase === 'done' && (
          <CircleCheck size={15} className="text-ok" />
        )}
        {download.phase === 'error' && (
          <CircleX size={15} className="text-error" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {download.model}
        </span>
        <span className="tabular-nums text-xs text-muted">
          {t(`downloads.phase.${download.phase}`)}
          {download.phase === 'downloading' && ` · ${percent} %`}
        </span>
        <button
          type="button"
          onClick={() =>
            void (running
              ? window.api.cancelDownload(download.model)
              : window.api.dismissDownload(download.model))
          }
          title={t(running ? 'downloads.cancel' : 'downloads.dismiss')}
          aria-label={t(running ? 'downloads.cancel' : 'downloads.dismiss')}
          className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text"
        >
          <X size={14} />
        </button>
      </div>
      {(running || download.phase === 'done') && (
        <div className="h-2 overflow-hidden rounded-full bg-bg">
          <div
            className={`h-full transition-[width] duration-300 ${
              download.phase === 'done' ? 'bg-ok' : 'bg-accent'
            } ${download.phase === 'verifying' ? 'animate-pulse' : ''}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {details && running && (
        <p className="tabular-nums text-xs text-muted">{details}</p>
      )}
      {download.phase === 'error' && (
        <p className="text-xs text-error">{download.error}</p>
      )}
    </li>
  );
}
