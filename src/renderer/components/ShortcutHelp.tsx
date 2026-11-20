import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { SHORTCUTS } from '../shortcuts/keymap';

/** Übersicht aller Tastenkürzel (Strg+/ oder F1). Schließen mit Esc oder Klick daneben. */
/** Fenster-Kürzel (laufen im Hauptprozess, siehe window-chrome.ts). */
const WINDOW_SHORTCUTS = [
  ['zoomIn', 'Strg+Plus'],
  ['zoomOut', 'Strg+Minus'],
  ['zoomReset', 'Strg+0'],
  ['fullscreen', 'F11'],
  ['devtools', 'Strg+Umschalt+I'],
] as const;

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center dialog-scrim"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        className="w-full max-w-md dialog !p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <h2 className="font-medium">{t('shortcuts.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shortcuts.close')}
            className="icon-btn"
          >
            <X size={16} />
          </button>
        </div>
        <dl className="px-4 py-1">
          {[
            ...SHORTCUTS.map((s) => ({
              id: s.id,
              text: t(s.descriptionKey),
              label: s.label,
            })),
            ...WINDOW_SHORTCUTS.map(([id, label]) => ({
              id,
              text: t(`palette.${id}`),
              label,
            })),
          ].map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between gap-4 py-2"
            >
              <dt>{shortcut.text}</dt>
              <dd>
                <kbd className="rounded px-2 py-0.5 tabular-nums text-xs whitespace-pre bg-surface shadow-card">
                  {shortcut.label}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="px-4 py-3 text-xs text-muted">{t('shortcuts.footer')}</p>
      </div>
    </div>
  );
}
