import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { fileTokens, type MessageFile } from '../../../shared/files';

/** Die Dateien einer Nachricht als kleine Felder (der Text selbst steht nicht im Chat). */
export function MessageFiles({ files }: { files: MessageFile[] }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-wrap justify-end gap-2">
      {files.map((file) => (
        <li
          key={file.id}
          title={file.name}
          className="flex max-w-[280px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs"
        >
          <FileText size={16} className="shrink-0 text-muted" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{file.name}</span>
            <span className="block text-subtle">
              {file.pages !== undefined &&
                `${t('chat.files.pages', { count: file.pages })} · `}
              {t('chat.files.tokens', { tokens: fileTokens(file.chars) })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
