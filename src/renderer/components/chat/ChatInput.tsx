import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';
import { useShortcut } from '../../shortcuts/useShortcut';

interface ChatInputProps {
  disabled: boolean;
  isRunning: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Schalter in der Leiste unter dem Text (Wissen, Werkzeuge). */
  tools?: ReactNode;
}

export function ChatInput({
  disabled,
  isRunning,
  onSend,
  onStop,
  tools,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Fokus-Wunsch, solange das Feld noch gesperrt ist (Modelle laden noch) –
  // ein gesperrtes Feld kann keinen Cursor bekommen.
  const [focusWanted, setFocusWanted] = useState(false);

  // Strg+L (und Strg+N für einen neuen Chat): Cursor ins Eingabefeld.
  useShortcut('focusInput', () => setFocusWanted(true));

  useEffect(() => {
    if (focusWanted && !disabled) {
      textareaRef.current?.focus();
      setFocusWanted(false);
    }
  }, [focusWanted, disabled]);

  const submit = () => {
    if (disabled || isRunning || !text.trim()) return;
    onSend(text);
    setText('');
  };

  // Enter schickt ab, Umschalt+Enter macht eine neue Zeile.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-2 px-3 pt-2.5 pb-2 transition-colors focus-within:border-accent/60">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t(
          disabled ? 'chat.inputNoModel' : 'chat.inputPlaceholder',
        )}
        disabled={disabled}
        rows={1}
        className="field-sizing-content max-h-48 min-h-11 w-full resize-none bg-transparent px-1.5 py-1 text-[14.5px] outline-none placeholder:text-subtle disabled:opacity-50"
      />
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-2">
        {tools}
        <span className="flex-1" />
        {isRunning ? (
          <button
            type="button"
            onClick={onStop}
            title={t('chat.stop')}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm hover:bg-surface-hover"
          >
            <Square size={13} className="fill-current" />
            {t('chat.stop')}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !text.trim()}
            title={t('chat.send')}
            aria-label={t('chat.send')}
            className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white hover:opacity-90 disabled:opacity-35"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
