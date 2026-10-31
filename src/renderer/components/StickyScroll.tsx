import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown } from 'lucide-react';

/** So nah am Ende zählt noch als „unten“ (Pixel). */
const NEAR_BOTTOM = 48;

/** Ist die Ansicht (fast) ganz unten? Eigene Funktion, damit sie sich testen lässt. */
export function isNearBottom(
  box: { scrollHeight: number; scrollTop: number; clientHeight: number },
  tolerance = NEAR_BOTTOM,
): boolean {
  return box.scrollHeight - box.scrollTop - box.clientHeight <= tolerance;
}

interface StickyScrollProps {
  children: ReactNode;
  /** Wechselt beim Öffnen eines anderen Chats: dann geht es wieder nach unten. */
  resetKey?: string | null;
  /** Ändert sich bei einer neuen Nachricht von dir: dann geht es immer nach unten. */
  followKey?: string | null;
  /** Zusätzliche Klassen für den Scrollbereich. */
  className?: string;
}

/**
 * Scrollbereich für den Chat. Neuer Text schiebt die Ansicht nur dann nach
 * unten, wenn du schon unten bist – scrollst du hoch, um etwas zu lesen,
 * bleibst du dort (vorher sprang sie mit jedem Wort zurück). Ein Knopf bringt
 * dich wieder nach unten. Gescrollt wird NUR dieser Bereich (nie die ganze
 * Seite), und der Platz für die Bildlaufleiste ist immer reserviert, damit
 * der Text nicht seitlich wackelt, wenn sie auftaucht.
 */
export function StickyScroll({
  children,
  resetKey,
  followKey,
  className = '',
}: StickyScrollProps) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const toBottom = useCallback(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, []);

  const onScroll = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const near = isNearBottom(box);
    stuck.current = near;
    setShowJump(!near);
  }, []);

  // Anderer Chat oder neue eigene Nachricht: nach unten und wieder „dranbleiben“.
  useLayoutEffect(() => {
    stuck.current = true;
    setShowJump(false);
    toBottom();
  }, [resetKey, followKey, toBottom]);

  // Der Inhalt wird größer (neues Wort, Bild, Codeblock): nur nachziehen, wenn unten.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (stuck.current) toBottom();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [toBottom]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={boxRef}
        onScroll={onScroll}
        className={`h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable] ${className}`}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {showJump && (
        <button
          type="button"
          onClick={() => {
            stuck.current = true;
            setShowJump(false);
            toBottom();
          }}
          title={t('chat.jumpToBottom')}
          aria-label={t('chat.jumpToBottom')}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-lg hover:text-text"
        >
          <ArrowDown size={14} />
          {t('chat.jumpToBottom')}
        </button>
      )}
    </div>
  );
}
