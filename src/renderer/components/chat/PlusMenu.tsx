import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { ManageLinks } from '../ManageLinks';

/** „+“-Menü im Eingabefeld: hier liegen Wissen, Skills, E-Mail, Werkzeuge, Recherche, Internet. */
export function PlusMenu({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('plus.open')}
        title={t('plus.open')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="icon-btn !rounded-full"
      >
        <Plus
          size={18}
          className={`transition-transform ${open ? 'rotate-45' : ''}`}
        />
      </button>
      {open && (
        <div className="dialog absolute bottom-full left-0 z-30 mb-2 flex w-[410px] max-w-[calc(100vw-48px)] flex-wrap gap-2 !p-4">
          <p className="w-full text-xs font-medium text-muted">
            {t('plus.hint')}
          </p>
          {children}
          <div className="w-full pt-1">
            <ManageLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
