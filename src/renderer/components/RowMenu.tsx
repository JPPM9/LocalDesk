import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';

export interface RowMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/** Zeilenmenü „Mehr“: ein beschrifteter Knopf statt dreier Symbole (JOURNEY.md Fläche 1). */
export function RowMenu({
  name,
  items,
}: {
  name: string;
  items: RowMenuItem[];
}) {
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
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        title={t('sidebar.more')}
        aria-label={t('sidebar.moreFor', { name })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          // Der Knopf liegt im Link – ohne das würde der Klick auch die Zeile öffnen.
          event.preventDefault();
          event.stopPropagation();
          setOpen((o) => !o);
        }}
        className="icon-btn !h-7 !w-7"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-48 rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow-4)]"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`flex h-9 w-full items-center rounded-[10px] px-3 text-left text-sm hover:bg-surface-hover ${
                item.danger ? 'text-error' : 'text-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
