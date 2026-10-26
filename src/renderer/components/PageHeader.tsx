import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Optionale Knöpfe rechts in der Kopfzeile. */
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b border-border px-6">
      {/* Lange Titel einzeilig kürzen, der volle Titel steht im Tooltip. */}
      <h1 className="min-w-0 truncate text-base font-semibold" title={title}>
        {title}
      </h1>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
