import { useTranslation } from 'react-i18next';
import type { ModelInfo } from '../../../shared/api';

interface ModelSelectProps {
  models: ModelInfo[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelect({
  models,
  value,
  onChange,
  disabled,
}: ModelSelectProps) {
  const { t } = useTranslation();
  return (
    <label className="flex min-w-24 shrink items-center gap-2 rounded-lg border border-border bg-surface py-0.5 pr-1 pl-2.5 focus-within:border-accent">
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${value ? 'bg-ok' : 'bg-subtle'}`}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || models.length === 0}
        aria-label={t('chat.model')}
        // Darf schmaler werden (Name wird gekürzt), damit bei offenem Seitenbereich
        // der Chat-Titel sichtbar bleibt.
        className="min-w-0 flex-1 bg-surface py-1 text-[13px] font-medium outline-none disabled:opacity-50"
      >
        {models.length === 0 && <option value="">{t('chat.noModels')}</option>}
        {models.map((model) => (
          <option key={model.name} value={model.name}>
            {model.name}
            {model.parameterSize ? ` · ${model.parameterSize}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
