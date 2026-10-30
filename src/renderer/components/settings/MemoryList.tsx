import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { ChatFolder, MemoryView } from '../../../shared/api';

/**
 * Erinnerungen über dich: anzeigen, hinzufügen, öffnen, löschen. Gespeichert sind
 * sie als Notizen im Vault – Änderungen in Obsidian erscheinen hier nach „Neu laden“.
 */
export function MemoryList() {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [projects, setProjects] = useState<ChatFolder[]>([]);
  const [text, setText] = useState('');
  const [scope, setScope] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, folders] = await Promise.all([
      window.api.listMemories(),
      window.api.listFolders(),
    ]);
    if (list.ok) setMemories(list.value);
    setError(list.ok ? null : list.error);
    setProjects(folders);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const result = await window.api.addMemory(text, scope || null);
    if (!result.ok) return setError(result.error);
    setText('');
    await load();
  };

  const remove = async (memory: MemoryView) => {
    if (!window.confirm(t('memories.confirmDelete', { text: memory.text })))
      return;
    const result = await window.api.deleteMemory(memory.id);
    setError(result.ok ? null : result.error);
    await load();
  };

  const open = async (memory: MemoryView) => {
    const result = await window.api.openMemory(memory.id);
    setError(result.ok ? null : result.error);
  };

  // Erst die für alle Chats, dann je Projekt.
  const groups = [
    {
      key: '',
      title: t('memories.global'),
      items: memories.filter((m) => !m.projectId),
    },
    ...[
      ...new Set(memories.filter((m) => m.projectId).map((m) => m.projectId!)),
    ].map((id) => ({
      key: id,
      title: t('memories.project', {
        name: memories.find((m) => m.projectId === id)?.projectName ?? id,
      }),
      items: memories.filter((m) => m.projectId === id),
    })),
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">
          {t('memories.title', { count: memories.length })}
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-accent-text hover:underline"
        >
          {t('memories.reload')}
        </button>
      </div>
      <p className="text-xs text-muted">{t('memories.intro')}</p>

      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <section key={group.key} className="space-y-1">
            <h4 className="text-xs font-medium text-muted">{group.title}</h4>
            <ul className="space-y-1">
              {group.items.map((memory) => (
                <li
                  key={memory.id}
                  className="group flex items-start gap-2 rounded border border-border bg-bg px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 whitespace-pre-wrap">
                    {memory.text}
                  </span>
                  {memory.created && (
                    <span className="shrink-0 tabular-nums text-[11px] text-muted">
                      {memory.created}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void open(memory)}
                    title={t('memories.open')}
                    aria-label={t('memories.open')}
                    className="shrink-0 grid h-7 w-7 place-items-center rounded text-muted hover:text-text"
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(memory)}
                    title={t('memories.delete')}
                    aria-label={t('memories.delete')}
                    className="shrink-0 grid h-7 w-7 place-items-center rounded text-muted hover:text-error"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) void add();
          }}
          placeholder={t('memories.placeholder')}
          maxLength={500}
          className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          aria-label={t('memories.scope')}
          className="max-w-40 rounded border border-border bg-bg px-2 py-1.5 text-xs outline-none focus:border-accent"
        >
          <option value="">{t('memories.global')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void add()}
          disabled={!text.trim()}
          className="flex shrink-0 items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs text-white disabled:opacity-40"
        >
          <Plus size={13} />
          {t('memories.add')}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
