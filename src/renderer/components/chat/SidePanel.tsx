import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TriangleAlert, X } from 'lucide-react';
import type {
  ChatFolder,
  ChatSettings,
  MessageRecord,
  ModelInfo,
} from '../../../shared/api';
import {
  suggestContextLength,
  type ContextPart,
  type ContextUsage,
} from '../../../shared/context';
import { useCollections } from '../../hooks/useCollections';
import { formatContext, formatMemory } from '../../utils/format';
import {
  DocumentList,
  IndexButton,
  ProgressBox,
} from '../knowledge/CollectionEditor';
import { SourceList } from './SourceList';

export type SidePanelTab = 'sources' | 'project' | 'context';

interface SidePanelProps {
  tab: SidePanelTab;
  onTab: (tab: SidePanelTab) => void;
  onClose: () => void;
  messages: MessageRecord[];
  project: ChatFolder | undefined;
  usage: ContextUsage;
  model: ModelInfo | undefined;
  settings: ChatSettings;
  onChangeSettings: (settings: ChatSettings) => void;
}

/** Seitenbereich neben dem Chat: Quellen, Projekt und Kontext-Füllstand. */
export function SidePanel(props: SidePanelProps) {
  const { t } = useTranslation();
  const tabs: SidePanelTab[] = ['sources', 'project', 'context'];

  return (
    <aside className="flex w-[310px] shrink-0 flex-col border-l border-border bg-bg">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <div
          role="tablist"
          className="flex flex-1 gap-1 rounded-lg bg-surface-2 p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={props.tab === tab}
              onClick={() => props.onTab(tab)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] ${
                props.tab === tab
                  ? 'bg-surface text-text shadow-card'
                  : 'text-muted hover:text-text'
              }`}
            >
              {t(`sidePanel.tab.${tab}`)}
              {tab === 'context' && props.usage.level !== 'ok' && (
                <LevelDot level={props.usage.level} />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={props.onClose}
          aria-label={t('sidePanel.close')}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-hover hover:text-text"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3.5 pb-4">
        {props.tab === 'sources' && <SourcesTab messages={props.messages} />}
        {props.tab === 'project' && <ProjectTab project={props.project} />}
        {props.tab === 'context' && <ContextTab {...props} />}
      </div>
    </aside>
  );
}

export function LevelDot({ level }: { level: ContextUsage['level'] }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${
        level === 'full' ? 'bg-error' : level === 'tight' ? 'bg-warn' : 'bg-ok'
      }`}
    />
  );
}

/** Die Quellen der letzten Antwort, die Wissen benutzt hat – gleich aufgeklappt. */
function SourcesTab({ messages }: { messages: MessageRecord[] }) {
  const { t } = useTranslation();
  const answer = [...messages]
    .reverse()
    .find((m) => m.sources && m.sources.length > 0);
  if (!answer?.sources) {
    return <p className="text-xs text-muted">{t('sidePanel.noSources')}</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted">{t('sidePanel.sourcesOf')}</p>
      <SourceList
        key={answer.id}
        sources={answer.sources}
        focus={null}
        expanded
      />
    </div>
  );
}

/** Projekt des Chats: Anweisungen und Projekt-Dokumente mit Stand. */
function ProjectTab({ project }: { project: ChatFolder | undefined }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const view = useCollections()?.find(
    (c) => c.config.id === project?.collectionId,
  );

  if (!project) {
    return <p className="text-xs text-muted">{t('sidePanel.noProject')}</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-semibold">{project.name}</h3>
        <Link
          to={`/projects/${project.id}`}
          className="shrink-0 text-xs text-accent-text hover:underline"
        >
          {t('sidePanel.editProject')}
        </Link>
      </div>
      <section className="space-y-1">
        <h4 className="text-xs font-medium text-muted">
          {t('projects.instructions')}
        </h4>
        {project.instructions ? (
          <p className="max-h-40 overflow-auto rounded bg-bg px-2 py-1.5 text-xs whitespace-pre-wrap">
            {project.instructions}
          </p>
        ) : (
          <p className="text-xs text-muted">{t('sidePanel.noInstructions')}</p>
        )}
      </section>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted">
            {t('projects.documents')}
          </h4>
          {view && (
            <IndexButton view={view} disabled={false} onError={setError} />
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {view ? (
          <>
            <ProgressBox view={view} />
            <DocumentList view={view} />
          </>
        ) : (
          <p className="text-xs text-muted">{t('sidePanel.noDocuments')}</p>
        )}
      </section>
    </div>
  );
}

const PART_COLORS: Record<ContextPart, string> = {
  memory: 'bg-accent/50',
  instructions: 'bg-muted',
  history: 'bg-accent',
  knowledge: 'bg-ok',
  tools: 'bg-warn',
};

/** Füllstand: Anteile, Warnung, „Kontextlänge erhöhen“ mit geschätztem Speicher. */
function ContextTab({
  usage,
  messages,
  model,
  settings,
  onChangeSettings,
}: SidePanelProps) {
  const { t } = useTranslation();
  const [kvBytes, setKvBytes] = useState<number | null | undefined>();
  const [freeVram, setFreeVram] = useState<number | undefined>();

  useEffect(() => {
    if (!model) return;
    setKvBytes(undefined);
    void window.api.getKvBytesPerToken(model.name).then(setKvBytes);
    void window.api.getGpuStatus().then((gpu) => {
      const card = gpu.available ? gpu.gpus[0] : undefined;
      if (
        card?.memoryTotalBytes !== undefined &&
        card.memoryUsedBytes !== undefined
      ) {
        setFreeVram(card.memoryTotalBytes - card.memoryUsedBytes);
      }
    });
  }, [model]);

  const last = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.stats);
  const suggestion = suggestContextLength(
    usage.used,
    usage.contextLength,
    model?.contextLength,
  );
  const extraBytes =
    suggestion && kvBytes ? kvBytes * (suggestion - usage.contextLength) : null;
  const percent = Math.round(usage.ratio * 100);

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">
            {t('sidePanel.used', {
              used: usage.used.toLocaleString('de-DE'),
              total: formatContext(usage.contextLength),
            })}
          </span>
          <span
            className={`font-mono text-xs ${
              usage.level === 'full'
                ? 'text-error'
                : usage.level === 'tight'
                  ? 'text-warn'
                  : 'text-muted'
            }`}
          >
            {percent} %
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded bg-bg">
          {(Object.keys(usage.parts) as ContextPart[]).map((part) => (
            <div
              key={part}
              className={PART_COLORS[part]}
              style={{
                width: `${Math.min(100, (usage.parts[part] / usage.contextLength) * 100)}%`,
              }}
            />
          ))}
        </div>
        <ul className="space-y-0.5 text-xs">
          {(Object.keys(usage.parts) as ContextPart[]).map((part) => (
            <li key={part} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-sm ${PART_COLORS[part]}`} />
              <span className="flex-1">{t(`sidePanel.part.${part}`)}</span>
              <span className="font-mono text-muted">
                {usage.parts[part].toLocaleString('de-DE')}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted">{t('sidePanel.estimateHint')}</p>
      </div>

      {usage.level !== 'ok' && (
        <div
          className={`space-y-2 rounded border px-3 py-2 text-xs ${
            usage.level === 'full'
              ? 'border-error/40 bg-error/10'
              : 'border-warn/40 bg-warn/10'
          }`}
        >
          <p className="flex gap-1.5">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            {t(`sidePanel.level.${usage.level}`)}
          </p>
          {suggestion ? (
            <>
              <button
                type="button"
                onClick={() =>
                  onChangeSettings({ ...settings, contextLength: suggestion })
                }
                className="rounded bg-accent px-2.5 py-1 text-white"
              >
                {t('sidePanel.increase', { size: formatContext(suggestion) })}
              </button>
              <p className="text-muted">
                {extraBytes !== null
                  ? t('sidePanel.vramEstimate', {
                      extra: formatMemory(extraBytes),
                    })
                  : kvBytes === null
                    ? t('sidePanel.vramUnknown')
                    : ''}
                {extraBytes !== null &&
                  freeVram !== undefined &&
                  ' ' +
                    (extraBytes > freeVram
                      ? t('sidePanel.vramTooMuch', {
                          free: formatMemory(freeVram),
                        })
                      : t('sidePanel.vramFree', {
                          free: formatMemory(freeVram),
                        }))}
              </p>
            </>
          ) : (
            <p className="text-muted">{t('sidePanel.atMaximum')}</p>
          )}
        </div>
      )}

      {last?.stats && (
        <div className="space-y-0.5 rounded border border-border px-3 py-2 text-xs">
          <p className="font-medium">{t('sidePanel.measured')}</p>
          <p className="text-muted">
            {t('sidePanel.measuredValue', {
              prompt: last.stats.promptTokens.toLocaleString('de-DE'),
              output: last.stats.outputTokens.toLocaleString('de-DE'),
            })}
          </p>
          {last.stats.promptTokens + last.stats.outputTokens >=
            usage.contextLength - 16 && (
            <p className="text-warn">{t('sidePanel.probablyCut')}</p>
          )}
        </div>
      )}
    </div>
  );
}
