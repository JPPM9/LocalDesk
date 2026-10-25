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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || models.length === 0}
      aria-label={t('chat.model')}
      className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs outline-none focus:border-accent disabled:opacity-50"
    >
      {models.length === 0 && <option value="">{t('chat.noModels')}</option>}
      {models.map((model) => (
        <option key={model.name} value={model.name}>
          {model.name}
          {model.parameterSize ? ` · ${model.parameterSize}` : ''}
        </option>
      ))}
    </select>
  );
}
