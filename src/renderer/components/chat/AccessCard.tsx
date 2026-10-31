import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, ShieldQuestion, FolderOpen } from 'lucide-react';
import type { ToolCallRecord, ToolDecision } from '../../../shared/api';
import type { MailAccountView } from '../../../shared/mail';
import type { AccessScope } from '../../../shared/access';
import { useMcpServers } from '../../hooks/useMcpServers';

interface AccessCardProps {
  call: ToolCallRecord;
  onDecision: (
    callId: string,
    decision: ToolDecision,
    args?: Record<string, unknown>,
  ) => void;
}

/**
 * Das Modell bittet um Zugriff (Postfach oder Dateien). Du wählst hier, was genau
 * und wie lange – die Schalter unten im Eingabefeld sind nur die Abkürzung dafür.
 */
export function AccessCard({ call, onDecision }: AccessCardProps) {
  const { t } = useTranslation();
  const what = call.arguments.what === 'files' ? 'files' : 'mail';
  const reason =
    typeof call.arguments.reason === 'string'
      ? call.arguments.reason.trim()
      : '';

  const [accounts, setAccounts] = useState<MailAccountView[] | null>(null);
  useEffect(() => {
    if (what === 'mail') void window.api.listMailAccounts().then(setAccounts);
  }, [what]);
  const servers = useMcpServers();
  const runningServers = (servers ?? []).filter(
    (s) => s.config.enabled && s.status.state === 'running',
  );

  // Auswahl: ein Konto (das erste) bzw. alle laufenden Datei-Server.
  const [account, setAccount] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const selectedAccount = account ?? accounts?.[0]?.id ?? null;
  const selectedServers =
    picked ?? new Set(runningServers.map((s) => s.config.id));

  const ids =
    what === 'mail'
      ? selectedAccount
        ? [selectedAccount]
        : []
      : runningServers
          .map((s) => s.config.id)
          .filter((id) => selectedServers.has(id));

  const decide = (scope: AccessScope) =>
    onDecision(call.id, 'once', {
      what,
      reason: call.arguments.reason ?? '',
      ids,
      scope,
    });
  const empty =
    what === 'mail'
      ? accounts !== null && accounts.length === 0
      : servers !== null && runningServers.length === 0;

  return (
    <div
      role="group"
      aria-label={t(what === 'mail' ? 'access.askMail' : 'access.askFiles')}
      className="space-y-2.5 rounded-xl border border-accent/40 bg-accent-soft/50 px-3.5 py-3"
    >
      <div className="flex items-center gap-2 font-medium">
        <ShieldQuestion size={16} className="shrink-0 text-accent-text" />
        {t(what === 'mail' ? 'access.askMail' : 'access.askFiles')}
      </div>
      {reason && (
        <p className="text-[13px]">
          <span className="text-muted">{t('access.reasonLabel')}</span> „
          {reason}“
        </p>
      )}

      {what === 'mail' ? (
        <fieldset className="space-y-1">
          <legend className="mb-1 flex items-center gap-1.5 text-xs text-muted">
            <Mail size={13} />
            {t('access.pickAccount')}
          </legend>
          {(accounts ?? []).map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name={`account-${call.id}`}
                checked={selectedAccount === a.id}
                onChange={() => setAccount(a.id)}
              />
              {a.email}
            </label>
          ))}
        </fieldset>
      ) : (
        <fieldset className="space-y-1">
          <legend className="mb-1 flex items-center gap-1.5 text-xs text-muted">
            <FolderOpen size={13} />
            {t('access.pickServers')}
          </legend>
          {runningServers.map((s) => (
            <label
              key={s.config.id}
              className="flex items-start gap-2 text-[13px]"
              title={s.config.folders.join('\n')}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedServers.has(s.config.id)}
                onChange={(event) => {
                  const next = new Set(selectedServers);
                  if (event.target.checked) next.add(s.config.id);
                  else next.delete(s.config.id);
                  setPicked(next);
                }}
              />
              <span className="min-w-0">
                {s.config.name}
                <span className="block truncate text-xs text-muted">
                  {s.config.folders.join(', ')}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {empty && <p className="text-xs text-warn">{t('access.nothing')}</p>}
      <p className="text-xs text-muted">
        {t(what === 'mail' ? 'access.mailHint' : 'access.filesHint')}
      </p>

      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          type="button"
          disabled={ids.length === 0}
          onClick={() => decide('chat')}
          className="rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('access.allowChat')}
        </button>
        <button
          type="button"
          disabled={ids.length === 0}
          onClick={() => decide('once')}
          className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
        >
          {t('access.allowOnce')}
        </button>
        <button
          type="button"
          onClick={() => onDecision(call.id, 'deny')}
          className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover"
        >
          {t('toolCall.deny')}
        </button>
      </div>
    </div>
  );
}
