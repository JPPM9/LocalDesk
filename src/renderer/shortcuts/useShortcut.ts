import { useEffect, useRef } from 'react';
import type { ShortcutId } from './keymap';

// Kürzel werden als Ereignis an die Komponente geschickt, die dafür zuständig ist
// (z. B. das Suchfeld für Strg+K). So muss der globale Handler die Komponenten
// nicht kennen.
const SHORTCUT_EVENT = 'localdesk:shortcut';

/**
 * Kürzel, das gerade ausgelöst wurde, aber noch keinen Empfänger hatte – etwa
 * Strg+K auf der Einstellungsseite: Erst wird zur Chat-Seite gewechselt, dann
 * holt sich das Suchfeld beim Erscheinen den Auftrag ab. Nur kurz gültig, damit
 * kein alter Auftrag später überraschend ausgeführt wird.
 */
let pending: { id: ShortcutId; at: number } | null = null;
const PENDING_MS = 1000;

export function triggerShortcut(id: ShortcutId) {
  pending = { id, at: Date.now() };
  window.dispatchEvent(
    new CustomEvent<ShortcutId>(SHORTCUT_EVENT, { detail: id }),
  );
}

/** Führt `handler` aus, wenn das Kürzel `id` ausgelöst wird. */
export function useShortcut(id: ShortcutId, handler: () => void) {
  // Immer die neueste Version des Handlers verwenden, ohne neu anzumelden.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const run = () => {
      pending = null;
      handlerRef.current();
    };
    if (pending?.id === id && Date.now() - pending.at < PENDING_MS) run();

    const listener = (event: Event) => {
      if ((event as CustomEvent<ShortcutId>).detail === id) run();
    };
    window.addEventListener(SHORTCUT_EVENT, listener);
    return () => window.removeEventListener(SHORTCUT_EVENT, listener);
  }, [id]);
}
