import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** „Über LocalDesk“ → Lizenzen: eigene MIT-Lizenz und die der mitgelieferten Pakete. */
export function LicenseSection() {
  const { t } = useTranslation();
  const [text, setText] = useState<string | null | undefined>();
  const open = text !== undefined;

  const toggle = async () => {
    if (open) {
      setText(undefined);
      return;
    }
    const licenses = await window.api.getLicenses();
    setText(
      licenses ? `${licenses.own.trim()}\n\n\n${licenses.thirdParty}` : null,
    );
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface p-4">
      <h3 className="text-[13px] font-medium">{t('settings.licenses')}</h3>
      <p className="text-xs text-muted">{t('settings.licensesIntro')}</p>
      <button
        type="button"
        onClick={() => void toggle()}
        className="min-h-7 rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
      >
        {open ? t('settings.licensesHide') : t('settings.licensesShow')}
      </button>
      {text === null && (
        <p className="text-xs text-error">{t('settings.licensesMissing')}</p>
      )}
      {text && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </div>
  );
}
