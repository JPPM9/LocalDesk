import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  /** Die Frage. Zeilenumbrüche (\n) bleiben erhalten. */
  message: string;
  /** Beschriftung des Hauptknopfs, z. B. „Löschen“. */
  confirmLabel?: string;
  /** Rot und mit Warnzeichen – für Löschen und andere Dinge, die nicht rückgängig gehen. */
  danger?: boolean;
  /** Überschrift; Standard: „Wirklich löschen?“ bzw. „Bist du sicher?“. */
  title?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Eigener Bestätigungsdialog statt des Windows-Fensters (`window.confirm`):
 * `const confirm = useConfirm(); if (!(await confirm({ … }))) return;`
 * Esc, Klick daneben und „Abbrechen“ liefern false. Der Fokus startet auf
 * „Abbrechen“ – ein versehentliches Enter löscht also nichts.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((result: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback<Confirm>((options) => {
    // Eine zweite Frage, während die erste offen ist: die erste gilt als „Nein“.
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setRequest(options);
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && <Dialog options={request} onSettle={settle} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('ConfirmProvider fehlt.');
  return confirm;
}

function Dialog({
  options,
  onSettle,
}: {
  options: ConfirmOptions;
  onSettle: (result: boolean) => void;
}) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = options.danger ?? false;
  const title =
    options.title ??
    (danger ? t('dialog.deleteTitle') : t('dialog.confirmTitle'));

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    // Esc und Tab hier abfangen, bevor die Tastenkürzel der App sie sehen.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onSettle(false);
      } else if (event.key === 'Tab') {
        // Der Fokus bleibt im Dialog: zwischen den zwei Knöpfen wechseln.
        event.preventDefault();
        event.stopPropagation();
        const next =
          document.activeElement === cancelRef.current
            ? confirmRef.current
            : cancelRef.current;
        next?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      before?.focus?.();
    };
  }, [onSettle]);

  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => onSettle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              danger
                ? 'bg-error/15 text-error'
                : 'bg-accent-soft text-accent-text'
            }`}
          >
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-semibold">
              {title}
            </h2>
            <p
              id="confirm-message"
              className="mt-1 text-sm break-words whitespace-pre-line text-muted"
            >
              {options.message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onSettle(false)}
            className="rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm hover:bg-surface-hover"
          >
            {t('dialog.cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onSettle(true)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${
              danger
                ? 'bg-error text-bg hover:opacity-90'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {options.confirmLabel ?? t('dialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
