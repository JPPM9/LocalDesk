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
      <p className="text-center text-xs text-muted">
        <NavLink to="/templates" className="underline hover:text-text">
          {t('templates.new')}
        </NavLink>
      </p>
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
              <BookMarked size={14} className="shrink-0 text-accent" />
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
