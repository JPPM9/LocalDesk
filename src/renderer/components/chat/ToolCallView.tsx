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
import { MEMORY_TOOL_SERVER } from '../../../shared/memory';
import { summarizeArguments } from '../../../shared/tools';
import { MemoryEditor } from './MemoryEditor';

interface ToolCallViewProps {
  call: ToolCallRecord;
  onDecision: (
    callId: string,
    decision: ToolDecision,
    args?: Record<string, unknown>,
  ) => void;
  /** Projekt des Chats – dann darf eine Erinnerung nur für das Projekt gelten. */
  projectName?: string;
}

/**
 * Ein Tool-Aufruf im Chat. Wartet er auf Freigabe, erscheint eine Karte mit
 * Knöpfen; sonst eine eingeklappte Zeile, die Eingabe und Ergebnis zeigt.
 */
export function ToolCallView({
  call,
  onDecision,
  projectName,
}: ToolCallViewProps) {
  const { t } = useTranslation();
  const summary = summarizeArguments(call.arguments);
  const isMemory = call.serverId === MEMORY_TOOL_SERVER;

  // „Erinnerung speichern“: Vorschlag bearbeiten, dann speichern oder ablehnen.
  if (isMemory && call.status === 'asking') {
    const { text, scope } = call.arguments;
    return (
      <MemoryEditor
        title={t('toolCall.memoryAsk')}
        initialText={typeof text === 'string' ? text : ''}
        initialScope={scope === 'projekt' ? 'projekt' : 'global'}
        projectName={projectName}
        onSave={(newText, newScope) =>
          onDecision(call.id, 'once', { text: newText, scope: newScope })
        }
        onCancel={() => onDecision(call.id, 'deny')}
        cancelLabel={t('toolCall.deny')}
      />
    );
  }

  if (call.status === 'asking') {
    return (
      <div
        role="group"
        aria-label={t('toolCall.askTitle', { tool: call.toolName })}
        className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft/50 px-3.5 py-3"
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
    <details className="group rounded-xl border border-border text-[13px]">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-muted select-none hover:text-text">
        <StatusIcon status={call.status} />
        {isMemory ? (
          <span>{t('toolCall.memoryTool')}</span>
        ) : (
          <span className="font-mono">{call.toolName}</span>
        )}
        {summary && (
          <span
            className={`min-w-0 truncate text-muted ${isMemory ? '' : 'font-mono'}`}
          >
            {summary}
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs text-subtle">
          {isMemory && call.status === 'done'
            ? t('toolCall.memorySaved')
            : t(`toolCall.status.${call.status}`)}
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
