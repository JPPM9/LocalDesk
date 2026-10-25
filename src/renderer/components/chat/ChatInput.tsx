import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SendHorizontal, Square } from 'lucide-react';

interface ChatInputProps {
  disabled: boolean;
  isRunning: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInput({
  disabled,
  isRunning,
  onSend,
  onStop,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

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
    <div className="flex items-end gap-2 rounded-lg border border-border bg-surface p-2 focus-within:border-accent">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t(
          disabled ? 'chat.inputNoModel' : 'chat.inputPlaceholder',
        )}
        disabled={disabled}
        rows={1}
        className="field-sizing-content max-h-48 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 outline-none disabled:opacity-50"
      />
      {isRunning ? (
        <button
          type="button"
          onClick={onStop}
          title={t('chat.stop')}
          className="flex h-9 items-center gap-1.5 rounded border border-border px-3 hover:bg-surface-hover"
        >
          <Square size={14} />
          {t('chat.stop')}
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          title={t('chat.send')}
          aria-label={t('chat.send')}
          className="flex h-9 w-9 items-center justify-center rounded bg-accent text-white disabled:opacity-40"
        >
          <SendHorizontal size={16} />
        </button>
      )}
    </div>
  );
}
