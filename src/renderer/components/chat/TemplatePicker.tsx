import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookMarked } from 'lucide-react';
import type { ChatTemplate } from '../../../shared/api';

interface TemplatePickerProps {
  templates: ChatTemplate[];
  activeId: string | undefined;
  onPick: (template: ChatTemplate) => void;
}

/** Auswahl im leeren, neuen Chat: „Mit Vorlage starten“. */
export function TemplatePicker({
  templates,
  activeId,
  onPick,
}: TemplatePickerProps) {
  const { t } = useTranslation();

  if (templates.length === 0) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs text-subtle">{t('templates.noneHint')}</p>
        <NavLink
          to="/templates"
          className="inline-flex min-h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1 text-xs text-muted hover:bg-surface-hover hover:text-text"
        >
          <BookMarked size={13} />
          {t('templates.new')}
        </NavLink>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-center text-sm font-medium text-muted">
        {t('templates.pickerTitle')}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            aria-pressed={template.id === activeId}
            className={`flex flex-col justify-start rounded-xl border p-3.5 text-left hover:shadow-card ${
              template.id === activeId
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface-2 hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <BookMarked size={14} className="shrink-0 text-accent-text" />
              <span className="truncate">{template.name}</span>
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted">
              {template.model ?? t('templates.anyModel')}
            </div>
            {template.settings.systemPrompt && (
              <p className="mt-1.5 line-clamp-2 text-xs text-muted">
                {template.settings.systemPrompt}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
