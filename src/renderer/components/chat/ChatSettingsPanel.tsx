import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, X } from 'lucide-react';
import type { ChatSettings, ModelInfo } from '../../../shared/api';
import { SettingsFields } from '../settings/SettingsFields';

interface ChatSettingsPanelProps {
  settings: ChatSettings;
  model: ModelInfo | undefined;
  onChange: (settings: ChatSettings) => void;
  onClose: () => void;
  /** Nach „Als Vorlage speichern“ – damit die Vorlagen-Auswahl aktuell bleibt. */
  onTemplateSaved: () => void;
}

export function ChatSettingsPanel({
  settings,
  model,
  onChange,
  onClose,
  onTemplateSaved,
}: ChatSettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-[310px] shrink-0 flex-col border-l border-border bg-bg">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <h2 className="font-semibold">{t('settingsPanel.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('settingsPanel.close')}
          className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-surface-hover hover:text-text"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <SettingsFields settings={settings} model={model} onChange={onChange} />
        <SaveAsTemplate
          settings={settings}
          modelName={model?.name}
          onSaved={onTemplateSaved}
        />
      </div>

      <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
        {t('settingsPanel.footer')}
      </p>
    </aside>
  );
}

/** Speichert Modell + Einstellungen dieses Chats als neue Vorlage. */
function SaveAsTemplate({
  settings,
  modelName,
  onSaved,
}: {
  settings: ChatSettings;
  modelName: string | undefined;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const save = async () => {
    if (name === null) return;
    const result = await window.api.saveTemplate({
      id: crypto.randomUUID(),
      name,
      model: modelName,
      settings,
    });
    if (result.ok) {
      setMessage({
        ok: true,
        text: t('templates.savedAs', { name: result.value.name }),
      });
      setName(null);
      onSaved();
    } else {
      setMessage({ ok: false, text: result.error });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') void save();
    if (event.key === 'Escape') setName(null);
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      {name === null ? (
        <button
          type="button"
          onClick={() => {
            setName('');
            setMessage(null);
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-border px-3 py-1.5 hover:bg-surface-hover"
        >
          <BookmarkPlus size={15} />
          {t('templates.saveFromChat')}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('templates.namePlaceholder')}
            aria-label={t('templates.name')}
            className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void save()}
            className="rounded bg-accent px-3 text-white"
          >
            {t('templates.save')}
          </button>
        </div>
      )}
      {message && (
        <p className={`text-xs ${message.ok ? 'text-ok' : 'text-error'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
