import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUp,
  FileText,
  Paperclip,
  Square,
  Table2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { ANSWER_RESERVE, suggestContextLength } from '../../../shared/context';
import { READABLE_EXTENSIONS } from '../../../shared/file-kinds';
import {
  FILE_DOCUMENT_MAX_BYTES,
  FILES_MAX_PER_MESSAGE,
  fileTokens,
} from '../../../shared/files';
import {
  IMAGE_MAX_PER_MESSAGE,
  IMAGE_SOURCE_MAX_BYTES,
} from '../../../shared/images';
import {
  FileProblem,
  prepareFile,
  prepareTable,
  type Attachments,
  type PreparedFile,
  type PreparedTable,
} from '../../chat/files';
import {
  ImageProblem,
  prepareImage,
  type PreparedImage,
} from '../../chat/images';
import {
  isTableName,
  TABLE_EXTENSIONS,
  TABLE_MAX_BYTES,
  tableTokens,
} from '../../../shared/tables';
import { useShortcut } from '../../shortcuts/useShortcut';
import { formatContext } from '../../utils/format';
import type { ResearchDepth } from '../../../shared/research';
import { ResearchStartCard } from '../research/ResearchStartCard';

interface ChatInputProps {
  disabled: boolean;
  isRunning: boolean;
  onSend: (text: string, attachments: Attachments) => void;
  onStop: () => void;
  /** Schalter in der Leiste unter dem Text (Wissen, Werkzeuge). */
  tools?: ReactNode;
  /**
   * Dateien und Bilder anhängen: fehlt = gibt es hier nicht (z. B. im Code-Bereich).
   * Dateien gehen an jedes Modell; Bilder nur, wenn das Modell sie lesen kann.
   */
  attach?: {
    /** Das gewählte Modell kann Bilder. */
    imagesAllowed: boolean;
    /** Ein installiertes Modell, das Bilder kann (für den Hinweis). */
    suggestion?: string;
    /** Für den Hinweis, wenn Dateien nicht in den Kontext passen. */
    context: {
      length: number;
      /** Schon belegt (ohne die neue Nachricht), geschätzt. */
      used: number;
      /** Größte Kontextlänge, die das Modell kann. */
      modelMax?: number;
      onRaise: (length: number) => void;
    };
  };
  /**
   * Knopf „Recherche“: Ist er an (`armed`), öffnet Senden die Startkarte statt zu senden;
   * erst „Starten“ ruft `onStart` auf. Fehlt = es gibt hier keine Recherche.
   */
  research?: {
    armed: boolean;
    onStart: (text: string, depth: ResearchDepth) => void;
    context: {
      length: number;
      modelMax?: number;
      onRaise: (length: number) => void;
    };
  };
}

const isImage = (file: File) =>
  file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);

const ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  '.heic',
  '.heif',
  ...READABLE_EXTENSIONS,
  ...TABLE_EXTENSIONS,
].join(',');

export function ChatInput({
  disabled,
  isRunning,
  onSend,
  onStop,
  tools,
  attach,
  research,
}: ChatInputProps) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  // Die Startkarte einer Recherche ist offen.
  const [startCard, setStartCard] = useState(false);
  const researchArmed = research?.armed === true;
  useEffect(() => {
    // Knopf „Recherche“ wieder aus (oder gesendet): Die Karte verschwindet.
    if (!researchArmed || isRunning) setStartCard(false);
  }, [researchArmed, isRunning]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Fokus-Wunsch, solange das Feld noch gesperrt ist (Modelle laden noch) –
  // ein gesperrtes Feld kann keinen Cursor bekommen.
  const [focusWanted, setFocusWanted] = useState(false);
  // Angehängte Bilder (schon verkleinert) und Dateien (Text schon gelesen), was gerade
  // vorbereitet wird, Hinweis, Ziehen über dem Fenster.
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [tables, setTables] = useState<PreparedTable[]>([]);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const filesRef = useRef(files);
  filesRef.current = files;
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
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
      for (const image of imagesRef.current) URL.revokeObjectURL(image.url);
    },
    [],
  );

  const noVision = attach?.suggestion
    ? t('chat.images.noVisionTry', { model: attach.suggestion })
    : t('chat.images.noVision');

  const describeImage = (error: unknown): string => {
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
  const addImages = async (list: File[], problems: string[]) => {
    if (list.length === 0) return;
    if (!attach?.imagesAllowed) {
      problems.push(noVision);
      return;
    }
    const room = Math.max(0, IMAGE_MAX_PER_MESSAGE - imagesRef.current.length);
    if (list.length > room) {
      problems.push(t('chat.images.tooMany', { max: IMAGE_MAX_PER_MESSAGE }));
    }
    for (const file of list.slice(0, room)) {
      try {
        const image = await prepareImage(file);
        setImages((current) => [...current, image]);
      } catch (error) {
        problems.push(describeImage(error));
      }
    }
  };

  /** Lässt die Dateien lesen und hängt sie an (höchstens 3; Fehler als Hinweis, der Rest geht weiter). */
  const addDocuments = async (list: File[], problems: string[]) => {
    if (list.length === 0) return;
    // Dateien und Tabellen zählen zusammen.
    const room = Math.max(
      0,
      FILES_MAX_PER_MESSAGE -
        filesRef.current.length -
        tablesRef.current.length,
    );
    if (list.length > room) {
      problems.push(t('chat.files.tooMany', { max: FILES_MAX_PER_MESSAGE }));
    }
    for (const file of list.slice(0, room)) {
      try {
        const prepared = await prepareFile(file);
        setFiles((current) => [...current, prepared]);
      } catch (error) {
        problems.push(
          error instanceof FileProblem && error.tooBig
            ? t('chat.files.tooBig', {
                name: error.fileName,
                max: FILE_DOCUMENT_MAX_BYTES / 1024 / 1024,
              })
            : error instanceof Error && error.message
              ? error.message
              : t('chat.files.unreadable', { name: file.name }),
        );
      }
    }
  };

  /** Lässt die Tabellen (CSV, TSV, Excel) lesen und hängt sie an – zusammen mit den Dateien höchstens 3. */
  const addTables = async (list: File[], problems: string[]) => {
    if (list.length === 0) return;
    const room = Math.max(
      0,
      FILES_MAX_PER_MESSAGE -
        filesRef.current.length -
        tablesRef.current.length,
    );
    if (list.length > room) {
      problems.push(t('chat.files.tooMany', { max: FILES_MAX_PER_MESSAGE }));
    }
    for (const file of list.slice(0, room)) {
      try {
        const prepared = await prepareTable(file);
        setTables((current) => [...current, prepared]);
      } catch (error) {
        problems.push(
          error instanceof FileProblem && error.tooBig
            ? t('chat.files.tooBig', {
                name: error.fileName,
                max: TABLE_MAX_BYTES / 1024 / 1024,
              })
            : error instanceof Error && error.message
              ? error.message
              : t('chat.files.unreadable', { name: file.name }),
        );
      }
    }
  };

  const addAttachments = async (all: File[]) => {
    if (!attach || all.length === 0) return;
    setProblem(null);
    const problems: string[] = [];
    setPreparing((n) => n + 1);
    try {
      await Promise.all([
        addImages(all.filter(isImage), problems),
        addTables(
          all.filter((file) => !isImage(file) && isTableName(file.name)),
          problems,
        ),
        addDocuments(
          all.filter((file) => !isImage(file) && !isTableName(file.name)),
          problems,
        ),
      ]);
    } finally {
      setPreparing((n) => n - 1);
    }
    if (problems.length > 0) setProblem(problems.join(' '));
  };
  const addRef = useRef(addAttachments);
  addRef.current = addAttachments;

  // Dateien und Bilder auf das Fenster ziehen (nur, wo es das Anhängen gibt).
  const canAttach = attach !== undefined;
  useEffect(() => {
    if (!canAttach) return;
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
      void addRef.current([...(event.dataTransfer?.files ?? [])]);
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
  }, [canAttach]);

  const removeImage = (id: string) => {
    const image = images.find((i) => i.id === id);
    if (image) URL.revokeObjectURL(image.url);
    setImages((current) => current.filter((i) => i.id !== id));
  };
  const removeFile = (id: string) =>
    setFiles((current) => current.filter((f) => f.id !== id));
  // Die Tabelle liegt im Hauptprozess – dort gleich wegwerfen.
  const removeTable = (id: string) => {
    void window.api.discardChatTable(id);
    setTables((current) => current.filter((x) => x.id !== id));
  };

  const hasAttachment =
    images.length > 0 || files.length > 0 || tables.length > 0;
  const canSend =
    !disabled &&
    !isRunning &&
    preparing === 0 &&
    (text.trim() !== '' || hasAttachment);

  const submit = () => {
    if (!canSend) return;
    // Knopf „Recherche“ an: erst die Startkarte (Stufe, Zustimmung), gesendet wird dort.
    if (researchArmed) {
      if (hasAttachment) setProblem(t('research.attachProblem'));
      else setStartCard(true);
      return;
    }
    // Die Vorschau-Adressen der Bilder gehen mit: Die Nachricht zeigt dieselben Bilder.
    onSend(text, { images, files, tables });
    setText('');
    setImages([]);
    setFiles([]);
    setTables([]);
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

  // Strg+V mit einer Datei oder einem Bild in der Zwischenablage (Screenshot, in Explorer kopierte Datei).
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!attach) return;
    const pasted = [...event.clipboardData.files];
    if (pasted.length === 0) return;
    event.preventDefault();
    void addAttachments(pasted);
  };

  // Passen die Dateien noch in den Kontext? Sonst Hinweis (Ollama würde den Anfang still abschneiden).
  const fileTokenSum =
    files.reduce((sum, f) => sum + fileTokens(f.chars), 0) +
    tables.reduce((sum, x) => sum + tableTokens(x.columns), 0);
  const context = attach?.context;
  const needed = (context?.used ?? 0) + fileTokenSum;
  const tooTight =
    context !== undefined &&
    (files.length > 0 || tables.length > 0) &&
    context.length - needed < ANSWER_RESERVE;
  const raiseTo =
    tooTight && context
      ? suggestContextLength(needed, context.length, context.modelMax)
      : null;

  return (
    <div
      className={`rounded-2xl border bg-surface-2 px-3 pt-2.5 pb-2 transition-colors focus-within:border-accent/60 ${
        dragging ? 'border-accent ring-2 ring-accent/30' : 'border-border'
      }`}
    >
      {dragging && (
        <p className="mb-2 text-center text-sm font-medium text-accent-text">
          {t('chat.attach.drop')}
        </p>
      )}
      {(hasAttachment || preparing > 0) && (
        <ul className="mb-2 flex flex-wrap items-center gap-2 px-1">
          {files.map((file) => (
            <li
              key={file.id}
              title={file.name}
              className="relative flex max-w-[260px] items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pr-3 pl-2.5 text-xs"
            >
              <FileText size={16} className="shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{file.name}</span>
                <span className="block text-subtle">
                  {file.pages !== undefined &&
                    `${t('chat.files.pages', { count: file.pages })} · `}
                  {t('chat.files.tokens', { tokens: fileTokens(file.chars) })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                title={t('chat.files.remove', { name: file.name })}
                aria-label={t('chat.files.remove', { name: file.name })}
                className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-muted hover:text-text"
              >
                <X size={12} />
              </button>
            </li>
          ))}
          {tables.map((table) => (
            <li
              key={table.id}
              title={table.name}
              className="relative flex max-w-[260px] items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pr-3 pl-2.5 text-xs"
            >
              <Table2 size={16} className="shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{table.name}</span>
                <span className="block text-subtle">
                  {t('chat.tables.size', {
                    rows: table.rows.toLocaleString(i18n.language),
                    columns: table.columns,
                  })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeTable(table.id)}
                title={t('chat.files.remove', { name: table.name })}
                aria-label={t('chat.files.remove', { name: table.name })}
                className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-muted hover:text-text"
              >
                <X size={12} />
              </button>
            </li>
          ))}
          {images.map((image) => (
            <li key={image.id} className="relative">
              <img
                src={image.url}
                alt={image.name}
                title={image.name}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                title={t('chat.images.remove', { name: image.name })}
                aria-label={t('chat.images.remove', { name: image.name })}
                className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-muted hover:text-text"
              >
                <X size={12} />
              </button>
            </li>
          ))}
          {preparing > 0 && (
            <li className="text-xs text-muted">{t('chat.attach.preparing')}</li>
          )}
        </ul>
      )}
      {tooTight && context && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
          <TriangleAlert size={14} className="shrink-0 text-warn" />
          <span className="min-w-0 flex-1">
            {t('chat.files.tight', {
              tokens: fileTokenSum,
              length: formatContext(context.length),
            })}
            {raiseTo === null && (
              <>
                {' '}
                {t('chat.files.noRaise', {
                  length: formatContext(context.modelMax ?? context.length),
                })}
              </>
            )}
          </span>
          {raiseTo !== null && (
            <button
              type="button"
              onClick={() => context.onRaise(raiseTo)}
              className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              {t('chat.files.raise', { length: formatContext(raiseTo) })}
            </button>
          )}
        </div>
      )}
      {startCard && researchArmed && research && (
        <ResearchStartCard
          question={text.trim()}
          context={research.context}
          onStart={(depth) => {
            research.onStart(text.trim(), depth);
            setText('');
            setStartCard(false);
          }}
          onCancel={() => setStartCard(false)}
        />
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
        {attach && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept={ACCEPT}
              onChange={(event) => {
                void addAttachments([...(event.target.files ?? [])]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              title={t('chat.attach.button')}
              aria-label={t('chat.attach.button')}
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
