import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PickerButtonProps {
  icon: LucideIcon;
  /** Beschriftung für Tooltip und Screenreader. */
  label: string;
  /** Kurzer Text auf dem Schalter, z. B. „Wissen“. */
  chipText: string;
  /** Wie viele Einträge gewählt sind – 0 = Knopf neutral, sonst hervorgehoben mit Zahl. */
  count: number;
  title: string;
  intro: string;
  children: ReactNode;
}

/**
 * Schalter im Eingabefeld mit aufklappender Auswahl (Wissen, Werkzeuge). Schließt
 * bei Klick daneben oder Esc – Esc stoppt dabei keine laufende Antwort.
 */
export function PickerButton({
  icon: Icon,
  label,
  chipText,
  count,
  title,
  intro,
  children,
}: PickerButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const active = count > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] ${
          active || open
            ? 'border-transparent bg-accent-soft text-accent-text'
            : 'border-border bg-surface text-muted hover:text-text'
        }`}
      >
        <Icon size={14} />
        {chipText}
        {active && <span className="tabular-nums">· {count}</span>}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute bottom-full left-0 z-30 mb-2 w-72 space-y-2 rounded-xl border border-border bg-surface p-3 shadow-card"
        >
          <div>
            <h3 className="text-xs font-semibold">{title}</h3>
            <p className="text-[11px] text-muted">{intro}</p>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
