import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { SHORTCUTS } from '../shortcuts/keymap';

/** Übersicht aller Tastenkürzel (Strg+/ oder F1). Schließen mit Esc oder Klick daneben. */
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        className="w-full max-w-md rounded-lg border border-border bg-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <h2 className="font-semibold">{t('shortcuts.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shortcuts.close')}
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-surface-hover hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
        <dl className="divide-y divide-border px-4 py-1">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between gap-4 py-2"
            >
              <dt>{t(shortcut.descriptionKey)}</dt>
              <dd>
                <kbd className="rounded border border-border bg-bg px-2 py-0.5 font-mono text-xs whitespace-pre">
                  {shortcut.label}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
          {t('shortcuts.footer')}
        </p>
      </div>
    </div>
  );
}
