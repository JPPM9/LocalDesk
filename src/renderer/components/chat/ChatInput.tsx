import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Paperclip, Square, X } from 'lucide-react';
import {
  IMAGE_MAX_PER_MESSAGE,
  IMAGE_SOURCE_MAX_BYTES,
} from '../../../shared/images';
import {
  ImageProblem,
  prepareImage,
  type PreparedImage,
} from '../../chat/images';
import { useShortcut } from '../../shortcuts/useShortcut';

interface ChatInputProps {
  disabled: boolean;
  isRunning: boolean;
  onSend: (text: string, images: PreparedImage[]) => void;
  onStop: () => void;
  /** Schalter in der Leiste unter dem Text (Wissen, Werkzeuge). */
  tools?: ReactNode;
  /**
   * Bilder anhängen: fehlt = gibt es hier nicht (z. B. im Code-Bereich). `allowed` = das
   * gewählte Modell kann Bilder; `suggestion` = ein installiertes Modell, das es kann.
   */
  images?: { allowed: boolean; suggestion?: string };
}

export function ChatInput({
  disabled,
  isRunning,
  onSend,
  onStop,
  tools,
  images,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Fokus-Wunsch, solange das Feld noch gesperrt ist (Modelle laden noch) –
  // ein gesperrtes Feld kann keinen Cursor bekommen.
  const [focusWanted, setFocusWanted] = useState(false);
  // Angehängte Bilder (schon verkleinert), was gerade vorbereitet wird, Hinweis, Ziehen über dem Fenster.
  const [attached, setAttached] = useState<PreparedImage[]>([]);
  const attachedRef = useRef(attached);
  attachedRef.current = attached;
  const [preparing, setPreparing] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Strg+L (und Strg+N für einen neuen Chat): Cursor ins Eingabefeld.
  useShortcut('focusInput', () => setFocusWanted(true));

  useEffect(() => {
    if (focusWanted && !disabled) {
      textareaRef.current?.focus();
      setFocusWanted(false);
    }
  }, [focusWanted, disabled]);

  // Ein Hinweis verschwindet nach einer Weile von selbst.
  useEffect(() => {
    if (!problem) return;
    const timer = setTimeout(() => setProblem(null), 8000);
    return () => clearTimeout(timer);
  }, [problem]);

  // Nicht gesendete Bilder geben ihre Vorschau-Adresse frei, wenn das Feld verschwindet.
  useEffect(
    () => () => {
      for (const image of attachedRef.current) URL.revokeObjectURL(image.url);
    },
    [],
  );

  const noVision = images?.suggestion
    ? t('chat.images.noVisionTry', { model: images.suggestion })
    : t('chat.images.noVision');

  const describe = (error: unknown): string => {
    if (!(error instanceof ImageProblem)) {
      return t('chat.images.unreadable', { name: '' });
    }
    const name = error.fileName;
    switch (error.code) {
      case 'notImage':
        return t('chat.images.notImage', { name });
      case 'tooLarge':
        return t('chat.images.tooLarge', {
          name,
          max: IMAGE_SOURCE_MAX_BYTES / 1_000_000,
        });
      default:
        return /\.hei[cf]$/i.test(name)
          ? t('chat.images.unreadableHeic', { name })
          : t('chat.images.unreadable', { name });
    }
  };

  /** Verkleinert die Bilder und hängt sie an (höchstens 4; Fehler als Hinweis, der Rest geht weiter). */
  const addFiles = async (files: File[]) => {
    if (!images || files.length === 0) return;
    if (!images.allowed) {
      setProblem(noVision);
      return;
    }
    setProblem(null);
    const room = Math.max(
      0,
      IMAGE_MAX_PER_MESSAGE - attachedRef.current.length,
    );
    if (files.length > room) {
      setProblem(t('chat.images.tooMany', { max: IMAGE_MAX_PER_MESSAGE }));
    }
    setPreparing((n) => n + 1);
    try {
      for (const file of files.slice(0, room)) {
        try {
          const image = await prepareImage(file);
          setAttached((current) => [...current, image]);
        } catch (error) {
          setProblem(describe(error));
        }
      }
    } finally {
      setPreparing((n) => n - 1);
    }
  };
  const addFilesRef = useRef(addFiles);
  addFilesRef.current = addFiles;

  // Bilder auf das Fenster ziehen (nur, wo es Bilder gibt).
  const hasImages = images !== undefined;
  useEffect(() => {
    if (!hasImages) return;
    const hasFiles = (event: DragEvent) =>
      event.dataTransfer?.types.includes('Files') ?? false;
    let depth = 0;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth++;
      setDragging(true);
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      void addFilesRef.current([...(event.dataTransfer?.files ?? [])]);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [hasImages]);

  const remove = (id: string) => {
    const image = attached.find((i) => i.id === id);
    if (image) URL.revokeObjectURL(image.url);
    setAttached((current) => current.filter((i) => i.id !== id));
  };

  const canSend =
    !disabled &&
    !isRunning &&
    preparing === 0 &&
    (text.trim() !== '' || attached.length > 0);

  const submit = () => {
    if (!canSend) return;
    // Die Vorschau-Adressen gehen mit: Die Nachricht zeigt dieselben Bilder.
    onSend(text, attached);
    setText('');
    setAttached([]);
    setProblem(null);
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

  // Strg+V mit einem Bild in der Zwischenablage (z. B. ein Screenshot).
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!images) return;
    const files = [...event.clipboardData.files].filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    event.preventDefault();
    void addFiles(files);
  };

  return (
    <div
      className={`rounded-2xl border bg-surface-2 px-3 pt-2.5 pb-2 transition-colors focus-within:border-accent/60 ${
        dragging ? 'border-accent ring-2 ring-accent/30' : 'border-border'
      }`}
    >
      {dragging && (
        <p className="mb-2 text-center text-sm font-medium text-accent-text">
          {t('chat.images.drop')}
        </p>
      )}
      {(attached.length > 0 || preparing > 0) && (
        <ul className="mb-2 flex flex-wrap items-center gap-2 px-1">
          {attached.map((image) => (
            <li key={image.id} className="relative">
              <img
                src={image.url}
                alt={image.name}
                title={image.name}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(image.id)}
                title={t('chat.images.remove', { name: image.name })}
                aria-label={t('chat.images.remove', { name: image.name })}
                className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-muted hover:text-text"
              >
                <X size={12} />
              </button>
            </li>
          ))}
          {preparing > 0 && (
            <li className="text-xs text-muted">{t('chat.images.preparing')}</li>
          )}
        </ul>
      )}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={t(
          disabled ? 'chat.inputNoModel' : 'chat.inputPlaceholder',
        )}
        disabled={disabled}
        rows={1}
        className="field-sizing-content max-h-48 min-h-11 w-full resize-none bg-transparent px-1.5 py-1 text-[14.5px] outline-none placeholder:text-subtle disabled:opacity-50"
      />
      {problem && (
        <p role="alert" className="px-1.5 pb-1 text-xs text-error">
          {problem}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-2">
        {images && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.heic,.heif"
              onChange={(event) => {
                void addFiles([...(event.target.files ?? [])]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || !images.allowed}
              title={images.allowed ? t('chat.images.attach') : noVision}
              aria-label={t('chat.images.attach')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              <Paperclip size={15} />
            </button>
          </>
        )}
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
            disabled={!canSend}
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
