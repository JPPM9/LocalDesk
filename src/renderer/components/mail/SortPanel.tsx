import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Star, Tag, WandSparkles, X } from 'lucide-react';
import type { MailChange, MailLabel } from '../../../shared/mail';
import {
  isSortableLabel,
  SORT_MAILS_MAX,
  suggestionChanges as changesOf,
  type MailSuggestion,
} from '../../../shared/mail-sorting';
import { senderName } from '../../mail/format';
import { useMailModel } from '../../mail/useMailModel';
import { PageHeader } from '../PageHeader';
import { ModelSelect } from '../chat/ModelSelect';
import { LabelManager } from './LabelManager';
import { ReauthLink } from './ReauthLink';

interface SortPanelProps {
  accountId: string;
  /** Kennungen der Mails in der Liste (die ersten 25 werden sortiert). */
  messageIds: string[];
  onClose: () => void;
  /** Nach dem Übernehmen: Liste neu laden. */
  onApplied: () => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; suggestions: MailSuggestion[]; model: string }
  | { kind: 'error'; error: string };

/** Schlüssel einer einzelnen Änderung (für die Haken). */
const keyOf = (change: MailChange) => `${change.messageId}:${change.kind}`;

/**
 * „Sortieren vorschlagen“: Das Modell schlägt eigene Labels (auch neue) und Sterne
 * vor, du hakst an, was übernommen wird. Vorher ändert sich in Gmail nichts.
 * Darunter „Labels verwalten“ zum Anlegen und Umbenennen.
 */
export function SortPanel({
  accountId,
  messageIds,
  onClose,
  onApplied,
}: SortPanelProps) {
  const { t } = useTranslation();
  const { models, model, choose } = useMailModel();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [outcome, setOutcome] = useState<{
    applied: number;
    failed: string[];
  } | null>(null);
  const [labels, setLabels] = useState<MailLabel[] | null>(null);
  const hasLabels = labels ? labels.some(isSortableLabel) : null;
  const count = Math.min(messageIds.length, SORT_MAILS_MAX);

  const loadLabels = () =>
    void window.api.listMailLabels(accountId).then((result) => {
      if (result.ok) setLabels(result.value);
    });
  useEffect(loadLabels, [accountId]);

  // Panel zu = Anfrage abbrechen.
  useEffect(() => () => void window.api.cancelMailSorting(), []);

  const suggest = async () => {
    setOutcome(null);
    setChecked(new Set());
    setState({ kind: 'running' });
    const result = await window.api.suggestMailSorting(
      accountId,
      messageIds.slice(0, SORT_MAILS_MAX),
      model,
    );
    setState(
      result.ok
        ? { kind: 'done', suggestions: result.value, model }
        : { kind: 'error', error: result.error },
    );
  };

  const suggestions = state.kind === 'done' ? state.suggestions : [];
  const allChanges = suggestions.flatMap(changesOf);
  const selected = allChanges.filter((c) => checked.has(keyOf(c)));

  const toggle = (change: MailChange) =>
    setChecked((current) => {
      const next = new Set(current);
      const key = keyOf(change);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const apply = async () => {
    setApplying(true);
    const result = await window.api.applyMailChanges(accountId, selected);
    setApplying(false);
    if (!result.ok) {
      setOutcome({ applied: 0, failed: [result.error] });
      return;
    }
    setOutcome(result.value);
    // Übernommenes verschwindet aus der Liste, der Rest bleibt zur Wahl.
    if (state.kind === 'done') {
      const done = new Set(selected.map(keyOf));
      setState({
        ...state,
        suggestions: state.suggestions
          .map((s) => ({
            ...s,
            ...(s.label &&
              done.has(`${s.messageId}:label`) && { label: undefined }),
            ...(s.newLabel &&
              done.has(`${s.messageId}:newLabel`) && { newLabel: undefined }),
            ...(s.star !== undefined &&
              done.has(`${s.messageId}:star`) && { star: undefined }),
          }))
          .filter((s) => s.label || s.newLabel || s.star !== undefined),
      });
    }
    setChecked(new Set());
    // Neue Labels sind jetzt in Gmail angelegt.
    loadLabels();
    onApplied();
  };

  return (
    <>
      <PageHeader
        title={t('mailSort.title')}
        actions={
          <>
            <ModelSelect
              models={models}
              value={model}
              onChange={choose}
              disabled={state.kind === 'running'}
            />
            {state.kind === 'running' ? (
              <button
                type="button"
                onClick={() => void window.api.cancelMailSorting()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] hover:bg-surface-hover"
              >
                <LoaderCircle size={15} className="animate-spin" />
                {t('mail.cancel')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void suggest()}
                disabled={!model || count === 0}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                <WandSparkles size={15} />
                {t('mailSort.start')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title={t('mail.close')}
              aria-label={t('mail.close')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-hover hover:text-text"
            >
              <X size={17} />
            </button>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-7 py-6">
          <p className="text-muted">{t('mailSort.intro', { count })}</p>
          {hasLabels === false && (
            <p className="text-xs text-warn">{t('mailSort.noLabels')}</p>
          )}
          {labels && (
            <LabelManager
              accountId={accountId}
              labels={labels}
              onChanged={loadLabels}
            />
          )}

          {state.kind === 'running' && (
            <p className="flex items-center gap-2 text-muted">
              <LoaderCircle size={15} className="animate-spin" />
              {t('mailSort.running', { count })}
            </p>
          )}
          {state.kind === 'error' && (
            <div className="space-y-1">
              <p className="text-error">{state.error}</p>
              <ReauthLink error={state.error} />
            </div>
          )}
          {outcome && (
            <div className="space-y-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px]">
              <p className="text-ok">
                {t('mailSort.applied', { count: outcome.applied })}
              </p>
              {outcome.failed.map((error, i) => (
                <p key={i} className="text-error">
                  {error}
                </p>
              ))}
            </div>
          )}

          {state.kind === 'done' && suggestions.length === 0 && (
            <p className="text-muted">{t('mailSort.none')}</p>
          )}

          {suggestions.length > 0 && (
            <>
              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li
                    key={s.messageId}
                    className="space-y-1.5 rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 font-medium">
                        {senderName(s.from)}
                      </span>
                      <span className="min-w-0 truncate text-muted">
                        {s.subject || t('mail.noSubject')}
                      </span>
                    </div>
                    {s.reason && (
                      <p className="text-xs text-subtle">{s.reason}</p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 pt-0.5">
                      {changesOf(s).map((change) => (
                        <label
                          key={keyOf(change)}
                          className="flex cursor-pointer items-center gap-2 text-[13px]"
                        >
                          <input
                            type="checkbox"
                            checked={checked.has(keyOf(change))}
                            onChange={() => toggle(change)}
                            className="accent-accent"
                          />
                          {change.kind === 'label' ? (
                            <>
                              <Tag size={13} className="text-muted" />
                              {t('mailSort.addLabel', { name: s.label?.name })}
                            </>
                          ) : change.kind === 'newLabel' ? (
                            <>
                              <Tag size={13} className="text-accent-text" />
                              {t('mailSort.addNewLabel', { name: change.name })}
                            </>
                          ) : (
                            <>
                              <Star
                                size={13}
                                className={
                                  change.starred
                                    ? 'fill-warn text-warn'
                                    : 'text-muted'
                                }
                              />
                              {t(
                                change.starred
                                  ? 'mailSort.addStar'
                                  : 'mailSort.removeStar',
                              )}
                            </>
                          )}
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-bg py-3">
                <button
                  type="button"
                  onClick={() =>
                    setChecked(
                      selected.length === allChanges.length
                        ? new Set()
                        : new Set(allChanges.map(keyOf)),
                    )
                  }
                  className="rounded border border-border px-3 py-1 text-xs hover:bg-surface-hover"
                >
                  {selected.length === allChanges.length
                    ? t('mailSort.selectNone')
                    : t('mailSort.selectAll')}
                </button>
                <span className="flex-1 text-xs text-subtle">
                  {t('mailSort.byModel', {
                    model: state.kind === 'done' ? state.model : '',
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={selected.length === 0 || applying}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {applying && (
                    <LoaderCircle size={15} className="animate-spin" />
                  )}
                  {t('mailSort.apply', { count: selected.length })}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
