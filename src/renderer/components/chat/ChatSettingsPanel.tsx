import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, X } from 'lucide-react';
import type {
  ChatSettings,
  ModelInfo,
  ThinkSetting,
} from '../../../shared/api';
import { TEMPERATURE_MAX, thinkStyle } from '../../../shared/settings';
import { formatContext } from '../../utils/format';

interface ChatSettingsPanelProps {
  settings: ChatSettings;
  model: ModelInfo | undefined;
  onChange: (settings: ChatSettings) => void;
  onClose: () => void;
}

/** Ollama nutzt ohne Angabe 4096 Tokens Kontext (gemessen mit Ollama 0.40). */
const OLLAMA_DEFAULT_CONTEXT = 4096;
const CONTEXT_PRESETS = [8192, 16384, 32768, 65536, 131072, 262144];
/** Wo der Regler steht, solange keine eigene Temperatur gesetzt ist. */
const TEMPERATURE_PLACEHOLDER = 0.8;

export function ChatSettingsPanel({
  settings,
  model,
  onChange,
  onClose,
}: ChatSettingsPanelProps) {
  const { t } = useTranslation();

  // Setzt einen Wert; `undefined` heißt „zurück auf Standard“.
  const set = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K],
  ) => {
    const next = { ...settings };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const maxContext = model?.contextLength;
  const contextOptions = CONTEXT_PRESETS.filter(
    (size) => maxContext === undefined || size <= maxContext,
  );
  const style = thinkStyle(model);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <h2 className="font-semibold">{t('settingsPanel.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('settingsPanel.close')}
          className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <Field
          label={t('settingsPanel.systemPrompt')}
          hint={t('settingsPanel.systemPromptHint')}
        >
          <textarea
            value={settings.systemPrompt ?? ''}
            onChange={(e) => set('systemPrompt', e.target.value || undefined)}
            rows={6}
            placeholder={t('settingsPanel.systemPromptPlaceholder')}
            className="w-full resize-y rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
          />
        </Field>

        <Field
          label={t('settingsPanel.contextLength')}
          hint={
            maxContext
              ? t('settingsPanel.contextHintMax', {
                  max: formatContext(maxContext),
                })
              : t('settingsPanel.contextHint')
          }
        >
          <select
            value={settings.contextLength ?? ''}
            onChange={(e) =>
              set(
                'contextLength',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono outline-none focus:border-accent"
          >
            <option value="">
              {t('settingsPanel.contextDefault', {
                size: formatContext(OLLAMA_DEFAULT_CONTEXT),
              })}
            </option>
            {/* Ein gespeicherter Wert, der nicht in den Vorgaben steht, bleibt wählbar. */}
            {settings.contextLength !== undefined &&
              !contextOptions.includes(settings.contextLength) && (
                <option value={settings.contextLength}>
                  {formatContext(settings.contextLength)}
                </option>
              )}
            {contextOptions.map((size) => (
              <option key={size} value={size}>
                {formatContext(size)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={t('settingsPanel.temperature')}
          hint={t('settingsPanel.temperatureHint')}
          value={
            settings.temperature !== undefined
              ? settings.temperature.toLocaleString('de-DE')
              : t('settingsPanel.default')
          }
          onReset={
            settings.temperature !== undefined
              ? () => set('temperature', undefined)
              : undefined
          }
        >
          <input
            type="range"
            min={0}
            max={TEMPERATURE_MAX}
            step={0.05}
            value={settings.temperature ?? TEMPERATURE_PLACEHOLDER}
            onChange={(e) => set('temperature', Number(e.target.value))}
            className={`w-full accent-[var(--ld-accent)] ${
              settings.temperature === undefined ? 'opacity-40' : ''
            }`}
          />
        </Field>

        <Field
          label={t('settingsPanel.seed')}
          hint={t('settingsPanel.seedHint')}
        >
          <input
            type="number"
            min={0}
            step={1}
            value={settings.seed ?? ''}
            onChange={(e) =>
              set(
                'seed',
                e.target.value === ''
                  ? undefined
                  : Math.trunc(Number(e.target.value)),
              )
            }
            placeholder={t('settingsPanel.seedPlaceholder')}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono outline-none focus:border-accent"
          />
        </Field>

        {style !== 'none' && (
          <Field
            label={t('settingsPanel.think')}
            hint={t(
              style === 'levels'
                ? 'settingsPanel.thinkHintLevels'
                : 'settingsPanel.thinkHint',
            )}
          >
            <select
              value={thinkToValue(settings.think)}
              onChange={(e) => set('think', valueToThink(e.target.value))}
              className="w-full rounded border border-border bg-bg px-2 py-1.5 outline-none focus:border-accent"
            >
              <option value="">{t('settingsPanel.default')}</option>
              {style === 'toggle' ? (
                <>
                  <option value="on">{t('settingsPanel.thinkOn')}</option>
                  <option value="off">{t('settingsPanel.thinkOff')}</option>
                </>
              ) : (
                <>
                  <option value="low">{t('settingsPanel.thinkLow')}</option>
                  <option value="medium">
                    {t('settingsPanel.thinkMedium')}
                  </option>
                  <option value="high">{t('settingsPanel.thinkHigh')}</option>
                </>
              )}
            </select>
          </Field>
        )}
      </div>

      <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
        {t('settingsPanel.footer')}
      </p>
    </aside>
  );
}

function Field({
  label,
  hint,
  value,
  onReset,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
  onReset?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold">{label}</label>
        <div className="flex items-center gap-1">
          {value && (
            <span className="font-mono text-xs text-muted">{value}</span>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title={t('settingsPanel.reset')}
              aria-label={t('settingsPanel.reset')}
              className="rounded p-0.5 text-muted hover:text-text"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

// <select> kennt nur Texte – true/false werden dafür zu "on"/"off".
function thinkToValue(think: ThinkSetting | undefined): string {
  if (think === undefined) return '';
  if (think === true) return 'on';
  if (think === false) return 'off';
  return think;
}

function valueToThink(value: string): ThinkSetting | undefined {
  if (value === '') return undefined;
  if (value === 'on') return true;
  if (value === 'off') return false;
  return value as ThinkSetting;
}
