import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  /** Der eine Satz: worum es hier geht oder was als Nächstes zu tun ist. */
  text: string;
  /** Optional ein kurzer Zusatz in kleiner Schrift. */
  hint?: string;
  /** Optional ein Knopf oder Link darunter. */
  action?: ReactNode;
}

/** Leere Seite – überall gleich aufgebaut: Symbol, ein Satz, kurzer Hinweis. */
export function EmptyState({
  icon: Icon,
  text,
  hint,
  action,
}: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-md space-y-3 px-6 pt-16 text-center text-muted">
      <Icon size={28} className="mx-auto text-subtle" aria-hidden />
      <p>{text}</p>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
