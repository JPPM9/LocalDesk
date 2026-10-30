import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { CodeFile } from '../../../shared/code';
import { fileSize } from '../../mail/format';

interface FileViewProps {
  sessionId: string;
  path: string;
  onClose: () => void;
}

/** Eine Datei aus dem Projekt zum Lesen – mit Zeilennummern, ohne Bearbeiten. */
export function FileView({ sessionId, path, onClose }: FileViewProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<CodeFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFile(null);
    setError(null);
    void window.api.readCodeFile(sessionId, path).then((result) => {
      if (result.ok) setFile(result.value);
      else setError(result.error);
    });
  }, [sessionId, path]);

  const lines = file?.text?.split(/\r?\n/) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
        <span
          className="min-w-0 flex-1 truncate font-mono text-[12.5px]"
          title={path}
        >
          {path}
        </span>
        {file && (
          <span className="shrink-0 text-xs text-subtle tabular-nums">
            {fileSize(file.size)}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          title={t('code.closeFile')}
          aria-label={t('code.closeFile')}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted hover:bg-surface-hover hover:text-text"
        >
          <X size={15} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-bg">
        {error ? (
          <p className="p-4 text-error">{error}</p>
        ) : !file ? (
          <p className="p-4 text-muted">{t('code.loading')}</p>
        ) : file.tooLarge ? (
          <p className="p-4 text-muted">{t('code.tooLarge')}</p>
        ) : file.binary ? (
          <p className="p-4 text-muted">{t('code.binary')}</p>
        ) : (
          <table className="font-mono text-[12.5px] leading-[1.55]">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="sticky left-0 bg-bg pr-3 pl-4 text-right align-top text-subtle select-none tabular-nums">
                    {i + 1}
                  </td>
                  <td className="pr-6 whitespace-pre">{line || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
