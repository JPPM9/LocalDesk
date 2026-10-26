import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plug } from 'lucide-react';
import { McpServerPicker } from './McpServerPicker';

interface McpButtonProps {
  selected: string[];
  onChange: (serverIds: string[]) => void;
  modelSupportsTools: boolean | undefined;
}

/**
 * MCP-Button im Chat-Kopf (wie bei LocalAI): zeigt, wie viele Server dieser Chat
 * nutzt, und öffnet die Auswahl.
 */
export function McpButton({
  selected,
  onChange,
  modelSupportsTools,
}: McpButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Schließen bei Klick daneben oder Esc (Esc soll dabei keine Antwort stoppen).
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

  const active = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('mcpPicker.button')}
        aria-label={t('mcpPicker.button')}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-surface-hover ${
          active || open ? 'border-accent text-accent' : 'border-border'
        }`}
      >
        <Plug size={14} />
        {active && <span className="font-mono">{selected.length}</span>}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('mcpPicker.button')}
          className="absolute right-0 z-30 mt-1 w-72 space-y-2 rounded border border-border bg-surface p-3 shadow-lg"
        >
          <div>
            <h3 className="text-xs font-semibold">{t('mcpPicker.title')}</h3>
            <p className="text-[11px] text-muted">{t('mcpPicker.intro')}</p>
          </div>
          <McpServerPicker
            selected={selected}
            onChange={onChange}
            modelSupportsTools={modelSupportsTools}
          />
        </div>
      )}
    </div>
  );
}
