import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Pencil, RefreshCw } from 'lucide-react';

const BUTTON =
  'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-surface-hover hover:text-text focus:opacity-100';
const HIDDEN = 'opacity-0 group-hover:opacity-100';

/** Kleiner Knopf unter einer Nachricht; sichtbar beim Überfahren oder per Tastatur. */
export function ActionButton({
  icon,
  label,
  onClick,
  visible = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Immer sichtbar (z. B. „Kopiert“). */
  visible?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${BUTTON} ${visible ? '' : HIDDEN}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Kopiert den Text über den Main-Prozess (die Oberfläche selbst darf die Zwischenablage nicht). */
export function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ActionButton
      visible={copied}
      icon={
        copied ? <Check size={12} className="text-ok" /> : <Copy size={12} />
      }
      label={copied ? t('chat.copied') : t('chat.copy')}
      onClick={() => {
        void window.api.copyText(text).then(() => {
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        });
      }}
    />
  );
}

export function EditButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <ActionButton
      icon={<Pencil size={12} />}
      label={t('chat.edit')}
      onClick={onClick}
    />
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <ActionButton
      icon={<RefreshCw size={12} />}
      label={t('chat.retry')}
      onClick={onClick}
    />
  );
}

/**
 * Eigene Nachricht ändern: Der Text wird bearbeitet und neu gesendet, alle
 * Nachrichten ab hier (auch die Antworten) werden ersetzt.
 */
export function EditBox({
  initialText,
  onSend,
  onCancel,
}: {
  initialText: string;
  onSend: (text: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }, []);
  const send = () => {
    if (text.trim()) onSend(text);
  };

  return (
    <div className="ml-auto w-full max-w-[80%] space-y-2 rounded-2xl border border-accent/50 bg-bubble p-3">
      <textarea
        ref={ref}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else if (
            event.key === 'Enter' &&
            (event.ctrlKey || event.metaKey)
          ) {
            event.preventDefault();
            send();
          }
        }}
        rows={3}
        aria-label={t('chat.edit')}
        className="field-sizing-content max-h-72 min-h-16 w-full resize-none bg-transparent outline-none"
      />
      <p className="text-xs text-muted">{t('chat.editHint')}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-sm hover:bg-surface-hover"
        >
          {t('dialog.cancel')}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('chat.editSend')}
        </button>
      </div>
    </div>
  );
}
