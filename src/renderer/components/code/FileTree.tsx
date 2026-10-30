import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import type { CodeEntry } from '../../../shared/code';

interface FileTreeProps {
  sessionId: string;
  selected: string | null;
  onSelect: (path: string) => void;
  /** Ändert sich der Wert, wird der Baum neu geladen (z. B. nach Änderungen). */
  reloadKey?: number;
}

/** Dateibaum des Projektordners – Ordner werden erst beim Aufklappen geladen. */
export function FileTree({
  sessionId,
  selected,
  onSelect,
  reloadKey,
}: FileTreeProps) {
  return (
    <Dir
      key={`${sessionId}:${reloadKey ?? 0}`}
      sessionId={sessionId}
      path=""
      depth={0}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

function Dir({
  sessionId,
  path,
  depth,
  selected,
  onSelect,
}: {
  sessionId: string;
  path: string;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<CodeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    void window.api.listCodeDir(sessionId, path).then((result) => {
      if (result.ok) setEntries(result.value);
      else setError(result.error);
    });
  }, [sessionId, path]);

  const indent = { paddingLeft: `${8 + depth * 14}px` };

  if (error) {
    return (
      <p className="py-1 text-xs text-error" style={indent}>
        {error}
      </p>
    );
  }
  if (!entries) {
    return (
      <p className="py-1 text-xs text-subtle" style={indent}>
        {t('code.loading')}
      </p>
    );
  }
  if (entries.length === 0 && depth === 0) {
    return <p className="px-2 py-2 text-xs text-muted">{t('code.emptyDir')}</p>;
  }

  const toggle = (dir: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });

  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.path}>
          {entry.kind === 'dir' ? (
            <>
              <button
                type="button"
                onClick={() => toggle(entry.path)}
                aria-expanded={open.has(entry.path)}
                className="flex w-full items-center gap-1 rounded py-[3px] pr-2 text-left text-[13px] text-muted hover:bg-surface-hover hover:text-text"
                style={indent}
              >
                <ChevronRight
                  size={13}
                  className={`shrink-0 transition-transform ${open.has(entry.path) ? 'rotate-90' : ''}`}
                />
                {open.has(entry.path) ? (
                  <FolderOpen size={14} className="shrink-0" />
                ) : (
                  <Folder size={14} className="shrink-0" />
                )}
                <span className="truncate">{entry.name}</span>
              </button>
              {open.has(entry.path) && (
                <Dir
                  sessionId={sessionId}
                  path={entry.path}
                  depth={depth + 1}
                  selected={selected}
                  onSelect={onSelect}
                />
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(entry.path)}
              aria-current={selected === entry.path ? 'true' : undefined}
              className={`flex w-full items-center gap-1 rounded py-[3px] pr-2 text-left text-[13px] ${
                selected === entry.path
                  ? 'bg-accent-soft text-accent-text'
                  : 'text-muted hover:bg-surface-hover hover:text-text'
              }`}
              style={{ paddingLeft: `${8 + depth * 14 + 17}px` }}
            >
              <File size={14} className="shrink-0" />
              <span className="truncate font-mono text-[12.5px]">
                {entry.name}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
