import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useMatch } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Activity, ExternalLink, X } from 'lucide-react';
import { StatusPanel } from './status/StatusPanel';

interface StatusFlyoutProps {
  /** Farbe des Punkts am Symbol (Ollama erreichbar?). */
  dotClass: string;
  /** „Ollama 0.9.0“ / „Ollama offline“ – steht im Tooltip und im Popup. */
  statusText: string;
  itemClass: (state: { isActive: boolean }) => string;
}

/**
 * Status-Symbol in der Leiste: Ein Klick öffnet ein Popup neben der Leiste mit
 * Grafikkarte und geladenen Modellen – man bleibt im Chat. Die ganze Seite
 * erreicht man über den Link im Popup. Abgefragt wird nur, solange es offen ist.
 */
export function StatusFlyout({
  dotClass,
  statusText,
  itemClass,
}: StatusFlyoutProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const onStatusPage = useMatch('/status') !== null;
  const location = useLocation();

  // Wechselt man die Seite, geht das Popup zu.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !popupRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const label = `${t('nav.status')} – ${statusText}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={itemClass({ isActive: open || onStatusPage })}
      >
        <Activity size={19} />
        <span
          className={`absolute top-2 right-2 h-2 w-2 rounded-full ring-2 ring-sidebar ${dotClass}`}
        />
      </button>
      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={t('nav.status')}
          className="fixed top-2 left-[68px] z-40 flex max-h-[calc(100vh-1rem)] w-[360px] flex-col rounded-xl border border-border bg-bg shadow-xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="min-w-0">
              <h2 className="font-semibold">{t('status.pageTitle')}</h2>
              <p className="truncate text-xs text-muted">{statusText}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                to="/status"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-text"
              >
                <ExternalLink size={13} />
                {t('status.openPage')}
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('status.close')}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-hover hover:text-text"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <StatusPanel compact />
          </div>
        </div>
      )}
    </>
  );
}
