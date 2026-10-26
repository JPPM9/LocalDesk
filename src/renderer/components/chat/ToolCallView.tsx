import { useTranslation } from 'react-i18next';
import {
  Ban,
  Check,
  CircleAlert,
  LoaderCircle,
  ShieldQuestion,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import type { ToolCallRecord, ToolDecision } from '../../../shared/api';
import { summarizeArguments } from '../../../shared/tools';

interface ToolCallViewProps {
  call: ToolCallRecord;
  onDecision: (callId: string, decision: ToolDecision) => void;
}

/**
 * Ein Tool-Aufruf im Chat. Wartet er auf Freigabe, erscheint eine Karte mit
 * Knöpfen; sonst eine eingeklappte Zeile, die Eingabe und Ergebnis zeigt.
 */
export function ToolCallView({ call, onDecision }: ToolCallViewProps) {
  const { t } = useTranslation();
  const summary = summarizeArguments(call.arguments);

  if (call.status === 'asking') {
    return (
      <div
        role="group"
        aria-label={t('toolCall.askTitle', { tool: call.toolName })}
        className="space-y-2 rounded border border-accent bg-accent-soft/40 px-3 py-2.5"
      >
        <div className="flex items-center gap-2 font-medium">
          <ShieldQuestion size={16} className="shrink-0 text-accent" />
          {t('toolCall.askTitle', { tool: call.toolName })}
        </div>
        <p className="text-xs text-muted">
          {t('toolCall.server', { name: call.serverName })}
        </p>
        {call.destructive && (
          <p className="flex items-center gap-1.5 text-xs text-warn">
            <TriangleAlert size={13} className="shrink-0" />
            {t('toolCall.askDestructive')}
          </p>
        )}
        <Code text={formatArguments(call.arguments)} />
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onDecision(call.id, 'once')}
            className="rounded bg-accent px-3 py-1 text-xs text-white hover:opacity-90"
          >
            {t('toolCall.allowOnce')}
          </button>
          <button
            type="button"
            onClick={() => onDecision(call.id, 'always')}
            title={t('toolCall.allowAlwaysHint')}
            className="rounded border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover"
          >
            {t('toolCall.allowAlways')}
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

  return (
    <details className="group rounded border border-border bg-surface text-[13px]">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-1.5 select-none">
        <StatusIcon status={call.status} />
        <span className="font-mono">{call.toolName}</span>
        {summary && (
          <span className="min-w-0 truncate font-mono text-muted">
            {summary}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-muted">
          {t(`toolCall.status.${call.status}`)}
        </span>
      </summary>
      <div className="space-y-2 border-t border-border px-3 py-2">
        <p className="text-[11px] text-muted">
          {t('toolCall.server', { name: call.serverName || '–' })}
        </p>
        <Section label={t('toolCall.arguments')}>
          <Code text={formatArguments(call.arguments)} />
        </Section>
        {call.result !== undefined && (
          <Section label={t('toolCall.result')}>
            <Code text={call.result} />
          </Section>
        )}
      </div>
    </details>
  );
}

function StatusIcon({ status }: { status: ToolCallRecord['status'] }) {
  switch (status) {
    case 'running':
      return (
        <LoaderCircle size={14} className="shrink-0 animate-spin text-accent" />
      );
    case 'done':
      return <Check size={14} className="shrink-0 text-ok" />;
    case 'error':
      return <CircleAlert size={14} className="shrink-0 text-error" />;
    case 'denied':
    case 'cancelled':
      return <Ban size={14} className="shrink-0 text-muted" />;
    default:
      return <Wrench size={14} className="shrink-0 text-muted" />;
  }
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      {children}
    </div>
  );
}

function Code({ text }: { text: string }) {
  return (
    <pre className="max-h-64 overflow-auto rounded bg-bg px-2 py-1.5 font-mono text-xs whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

function formatArguments(args: Record<string, unknown>): string {
  return JSON.stringify(args, null, 2);
}
