import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Folder, Inbox } from 'lucide-react';
import type { ChatFolder } from '../../../shared/api';

interface MoveMenuProps {
  folders: ChatFolder[];
  currentFolderId: string | undefined;
  onPick: (folderId: string | null) => void;
  onClose: () => void;
}

/** Kleines Menü „Verschieben nach …“ – die Alternative zum Ziehen mit der Maus. */
export function MoveMenu({
  folders,
  currentFolderId,
  onPick,
  onClose,
}: MoveMenuProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Schließen bei Klick daneben oder Esc.
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  const options: { id: string | null; name: string }[] = [
    { id: null, name: t('folders.unfiled') },
    ...folders,
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={t('folders.moveTo')}
      className="absolute right-1 z-20 mt-0.5 w-52 rounded border border-border bg-surface py-1 shadow-lg"
    >
      <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {t('folders.moveTo')}
      </div>
      {folders.length === 0 && (
        <p className="px-3 py-1.5 text-xs text-muted">{t('folders.noneYet')}</p>
      )}
      {options.map((option) => {
        const current = (option.id ?? undefined) === currentFolderId;
        const Icon = option.id ? Folder : Inbox;
        return (
          <button
            key={option.id ?? 'unfiled'}
            type="button"
            role="menuitem"
            disabled={current}
            onClick={() => onPick(option.id)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-hover disabled:text-muted disabled:hover:bg-transparent"
          >
            <Icon size={14} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            {current && <Check size={13} />}
          </button>
        );
      })}
    </div>
  );
}
