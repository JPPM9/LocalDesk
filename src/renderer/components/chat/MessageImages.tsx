import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageOff, X } from 'lucide-react';
import type { MessageImage } from '../../../shared/images';
import { useImageUrl } from '../../chat/images';

/** Die Bilder einer Nachricht als kleine Vorschau; ein Klick vergrößert. */
export function MessageImages({ images }: { images: MessageImage[] }) {
  const [open, setOpen] = useState<MessageImage | null>(null);
  return (
    <>
      <ul className="flex flex-wrap justify-end gap-2">
        {images.map((image) => (
          <li key={image.id}>
            <Thumb image={image} onOpen={() => setOpen(image)} />
          </li>
        ))}
      </ul>
      {open && <Lightbox image={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Thumb({ image, onOpen }: { image: MessageImage; onOpen: () => void }) {
  const { t } = useTranslation();
  const { url, failed } = useImageUrl(image.id);
  if (failed) {
    return (
      <span
        title={t('chat.images.gone', { name: image.name })}
        className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 text-center text-xs text-muted"
      >
        <ImageOff size={16} />
        <span className="max-w-full truncate">{image.name}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!url}
      title={t('chat.images.enlarge', { name: image.name })}
      aria-label={t('chat.images.enlarge', { name: image.name })}
      className="block overflow-hidden rounded-xl border border-border bg-surface hover:opacity-90"
    >
      {url ? (
        <img
          src={url}
          alt={image.name}
          className="max-h-40 max-w-[240px] object-cover"
        />
      ) : (
        <span className="block h-24 w-32 animate-pulse bg-surface-2" />
      )}
    </button>
  );
}

/** Das Bild groß: Klick daneben oder Esc schließt. */
function Lightbox({
  image,
  onClose,
}: {
  image: MessageImage;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { url } = useImageUrl(image.id);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.name}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        title={t('chat.images.close')}
        aria-label={t('chat.images.close')}
        className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <X size={18} />
      </button>
      {url && (
        <img
          src={url}
          alt={image.name}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      )}
      <p className="text-sm text-white/80">{image.name}</p>
    </div>
  );
}
