import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Markdown } from '../chat/Markdown';

/** Abschnitt „Datenschutz“: kurze Zusage und die ganze Erklärung (docs/privacy.md). */
export function PrivacySection() {
  const { t } = useTranslation();
  const [text, setText] = useState<string | null | undefined>();
  const open = text !== undefined;

  const toggle = async () => {
    setText(open ? undefined : await window.api.getPrivacy());
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{t('privacy.title')}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} className="mt-px shrink-0 text-ok" />
          {t('privacy.intro')}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        className="min-h-7 rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
      >
        {open ? t('privacy.hide') : t('privacy.show')}
      </button>
      {text === null && (
        <p className="text-xs text-error">{t('privacy.missing')}</p>
      )}
      {text && (
        <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-border bg-surface px-5 py-4 text-[13.5px]">
          <Markdown text={text} />
        </div>
      )}
    </section>
  );
}
