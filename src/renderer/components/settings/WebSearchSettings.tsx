import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, LoaderCircle, Search } from 'lucide-react';
import type { WebSearchState } from '../../../shared/web';
import { Field } from './SettingsFields';
import { useConfirm } from '../ConfirmDialog';

/** Abschnitt „Internet-Suche“ in den Einstellungen: der Ollama-Schlüssel für die Websuche. */
export function WebSearchSettings() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [state, setState] = useState<WebSearchState | null>(null);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);

  useEffect(() => {
    void window.api.getWebSearch().then(setState);
  }, []);

  const save = async () => {
    const result = await window.api.setWebSearchKey(key);
    if (result.ok) {
      setState(result.value);
      setEditing(false);
      setKey('');
      setError(null);
      setTestResult(null);
    } else {
      setError(result.error);
    }
  };

  const remove = async () => {
    if (
      !(await confirm({
        message: t('webSearchSettings.confirmRemove'),
        confirmLabel: t('dialog.remove'),
        danger: true,
      }))
    )
      return;
    setState(await window.api.clearWebSearchKey());
    setTestResult(null);
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await window.api.testWebSearch();
    setTesting(false);
    setTestResult(result.ok ? { ok: true } : result);
  };

  const showForm = editing || (state !== null && !state.configured);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{t('webSearchSettings.title')}</h2>
        <p className="mt-1 text-xs text-muted">
          {t('webSearchSettings.intro')}
        </p>
        <p className="mt-1 text-xs text-muted">
          {t('webSearchSettings.privacy')}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 font-medium">
          <Search size={15} className="text-muted" />
          {t('webSearchSettings.provider')}
        </div>

        {state === null ? null : showForm ? (
          <div className="space-y-4">
            <Field
              label={t('webSearchSettings.keyLabel')}
              hint={t('webSearchSettings.keyHint')}
            >
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t('webSearchSettings.keyPlaceholder')}
                spellCheck={false}
                autoComplete="off"
                className="field w-full font-mono"
              />
            </Field>
            {error && <p className="text-xs text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              {state.configured && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setKey('');
                    setError(null);
                  }}
                  className="btn btn-secondary"
                >
                  {t('mcp.cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={() => void save()}
                disabled={!key.trim()}
                className="btn btn-primary"
              >
                {t('mcp.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs text-ok">
              <CircleCheck size={13} />
              {t('webSearchSettings.saved')} ·{' '}
              {t('webSearchSettings.encrypted')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void test()}
                disabled={testing}
                title={t('webSearchSettings.testHint')}
                className="btn btn-secondary flex items-center gap-2"
              >
                {testing && <LoaderCircle size={12} className="animate-spin" />}
                {testing
                  ? t('webSearchSettings.testing')
                  : t('webSearchSettings.test')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKey('');
                  setError(null);
                  setEditing(true);
                }}
                className="btn btn-secondary"
              >
                {t('webSearchSettings.replace')}
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                className="btn btn-secondary text-error"
              >
                {t('webSearchSettings.remove')}
              </button>
            </div>
            {testResult &&
              (testResult.ok ? (
                <p className="text-xs text-ok" role="status">
                  {t('webSearchSettings.testOk')}
                </p>
              ) : (
                <p className="text-xs text-error" role="alert">
                  {testResult.error}
                </p>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
