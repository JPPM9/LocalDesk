import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FolderCode, Plus, Trash2 } from 'lucide-react';
import type { CodeSession } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { FileTree } from '../components/code/FileTree';
import { FileView } from '../components/code/FileView';

/**
 * Seite „Code“: links die Sitzungen (je ein Projektordner), daneben der
 * Dateibaum, rechts die gewählte Datei – und ab Schritt 2 der Agent.
 */
export function CodePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessionId = useParams().sessionId ?? null;
  const [sessions, setSessions] = useState<CodeSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const session = sessions?.find((s) => s.id === sessionId) ?? null;

  const load = useCallback(
    () => window.api.listCodeSessions().then(setSessions),
    [],
  );
  useEffect(() => void load(), [load]);
  useEffect(() => setFile(null), [sessionId]);

  const create = async () => {
    setError(null);
    const result = await window.api.createCodeSession();
    if (!result) return;
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
    navigate(`/code/${result.value.id}`);
  };

  const remove = async (s: CodeSession) => {
    if (!window.confirm(t('code.confirmDelete', { name: s.title }))) return;
    await window.api.deleteChat(s.id);
    await load();
    if (s.id === sessionId) navigate('/code');
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-[230px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-2.5 pt-3 pb-2">
          <button
            type="button"
            onClick={() => void create()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            {t('code.new')}
          </button>
          {error && <p className="px-1 pt-2 text-xs text-error">{error}</p>}
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
          {sessions?.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted">
              {t('code.none')}
            </p>
          )}
          {sessions?.map((s) => (
            <div key={s.id} className="group relative my-px">
              <NavLink
                to={`/code/${s.id}`}
                className={({ isActive }) =>
                  `block rounded-lg px-2.5 py-2 pr-8 ${
                    isActive
                      ? 'bg-surface-hover font-medium text-text'
                      : 'text-muted hover:bg-surface-hover hover:text-text'
                  }`
                }
              >
                <div className="truncate">{s.title}</div>
                <div
                  className="truncate font-mono text-[11px] font-normal text-subtle"
                  title={s.workspace}
                >
                  {s.workspace}
                </div>
              </NavLink>
              <button
                type="button"
                onClick={() => void remove(s)}
                title={t('code.delete')}
                aria-label={t('code.delete')}
                className="absolute top-2 right-1.5 hidden h-6 w-6 place-items-center rounded text-muted group-hover:grid hover:bg-surface hover:text-text"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {session ? (
        <>
          <div className="flex w-[260px] shrink-0 flex-col border-r border-border">
            <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
              <span
                className="truncate font-semibold"
                title={session.workspace}
              >
                {session.title}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
              <FileTree
                sessionId={session.id}
                selected={file}
                onSelect={setFile}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            {file ? (
              <FileView
                sessionId={session.id}
                path={file}
                onClose={() => setFile(null)}
              />
            ) : (
              <>
                <PageHeader title={t('code.agent')} />
                <div className="mx-auto max-w-md space-y-3 px-6 pt-16 text-center text-muted">
                  <p>{t('code.agentSoon')}</p>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <PageHeader title={t('code.title')} />
          <div className="mx-auto max-w-md space-y-3 px-6 pt-16 text-center text-muted">
            <FolderCode size={28} className="mx-auto text-subtle" />
            <p>{t('code.intro')}</p>
            <p className="text-xs text-subtle">{t('code.introSafe')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
