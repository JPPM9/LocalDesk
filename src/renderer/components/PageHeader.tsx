import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Optionale Knöpfe rechts in der Kopfzeile. */
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
