import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bot, User } from 'lucide-react';
import type { SearchResult } from '../../../shared/api';
import { splitHighlights } from '../../../shared/search';

/** Trefferliste anstelle der Chat-Liste, solange etwas im Suchfeld steht. */
export function SearchResults({ result }: { result: SearchResult }) {
  const { t } = useTranslation();
  const empty = result.chats.length === 0 && result.hits.length === 0;

  return (
    <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-2">
      {empty && (
        <p className="px-2 py-4 text-center text-xs text-muted">
          {t('search.noResults')}
        </p>
      )}

      {result.chats.length > 0 && (
        <section>
          <SectionTitle>{t('search.chats')}</SectionTitle>
          {result.chats.map((chat) => (
            <NavLink
              key={chat.id}
              to={`/chat/${chat.id}`}
              className="my-0.5 block truncate rounded px-2 py-1.5 hover:bg-surface-hover"
            >
              {chat.title}
            </NavLink>
          ))}
        </section>
      )}

      {result.hits.length > 0 && (
        <section>
          <SectionTitle>
            {t('search.messages', { count: result.hits.length })}
          </SectionTitle>
          {result.hits.map((hit) => {
            const RoleIcon = hit.role === 'user' ? User : Bot;
            return (
              <NavLink
                key={hit.messageId}
                // ?m= sagt der Chat-Seite, zu welcher Nachricht sie springen soll.
                to={`/chat/${hit.chatId}?m=${hit.messageId}`}
                className="my-0.5 block rounded px-2 py-1.5 hover:bg-surface-hover"
              >
                <div className="flex items-center gap-1 truncate text-[11px] text-muted">
                  <RoleIcon size={11} className="shrink-0" />
                  <span className="truncate">{hit.chatTitle}</span>
                </div>
                <p className="line-clamp-3 text-xs">
                  {splitHighlights(hit.snippet).map((part, i) =>
                    part.highlight ? (
                      <mark
                        key={i}
                        className="rounded-sm bg-accent-soft px-0.5 text-accent-text"
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </p>
              </NavLink>
            );
          })}
        </section>
      )}
    </nav>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
      {children}
    </h3>
  );
}
