import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Pencil, Tag } from 'lucide-react';
import type { MailLabel } from '../../../shared/mail';
import { LABEL_NAME_MAX } from '../../../shared/mail-labels';
import { isSortableLabel } from '../../../shared/mail-sorting';

interface LabelManagerProps {
  accountId: string;
  /** Alle Labels des Kontos (angezeigt werden nur die eigenen). */
  labels: MailLabel[];
  /** Nach dem Anlegen oder Umbenennen: Labels neu laden. */
  onChanged: () => void;
}

/**
 * „Labels verwalten“: eigene Gmail-Labels anlegen und umbenennen. Dein Klick ist
 * die Bestätigung. Löschen gibt es nicht – das geht nur in Gmail.
 */
export function LabelManager({
  accountId,
  labels,
  onChanged,
}: LabelManagerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const own = labels.filter(isSortableLabel);

  const create = async () => {
    setBusy(true);
    const result = await window.api.createMailLabel(accountId, newName);
    setBusy(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setNewName('');
    setMessage({
      ok: true,
      text: t('mailLabels.created', { name: result.value.name }),
    });
    onChanged();
  };

  const rename = async () => {
    if (!editing) return;
    setBusy(true);
    const result = await window.api.renameMailLabel(
      accountId,
      editing.id,
      editing.name,
    );
    setBusy(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setEditing(null);
    setMessage({
      ok: true,
      text: t('mailLabels.renamed', { name: result.value.name }),
    });
    onChanged();
  };

  return (
    <section className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium hover:bg-surface-hover"
      >
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <Tag size={14} className="text-muted" />
        {t('mailLabels.title')}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted">{t('mailLabels.intro')}</p>

          {own.length === 0 ? (
            <p className="text-xs text-subtle">{t('mailLabels.none')}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {own.map((label) => (
                <li
                  key={label.id}
                  className="flex items-center gap-2 px-3 py-1.5"
                >
                  {editing?.id === label.id ? (
                    <>
                      <input
                        autoFocus
                        value={editing.name}
                        maxLength={LABEL_NAME_MAX}
                        onChange={(e) =>
                          setEditing({ id: label.id, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !busy) void rename();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => void rename()}
                        disabled={busy || !editing.name.trim()}
                        className="rounded bg-accent px-2.5 py-1 text-xs text-white disabled:opacity-40"
                      >
                        {t('mailLabels.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
                      >
                        {t('mailLabels.cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {label.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null);
                          setEditing({ id: label.id, name: label.name });
                        }}
                        title={t('mailLabels.rename')}
                        aria-label={`${t('mailLabels.rename')}: ${label.name}`}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted hover:bg-surface-hover hover:text-text"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <input
              value={newName}
              maxLength={LABEL_NAME_MAX}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim() && !busy) void create();
              }}
              placeholder={t('mailLabels.newPlaceholder')}
              className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy || !newName.trim()}
              className="shrink-0 rounded bg-accent px-3 py-1.5 text-[13px] text-white disabled:opacity-40"
            >
              {t('mailLabels.create')}
            </button>
          </div>

          {message && (
            <p
              className={message.ok ? 'text-xs text-ok' : 'text-xs text-error'}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
