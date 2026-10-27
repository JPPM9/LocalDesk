import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Optionale Knöpfe rechts in der Kopfzeile. */
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="flex h-12 items-center justify-between gap-4 overflow-hidden border-b border-border px-6">
      {/* Lange Titel einzeilig kürzen, der volle Titel steht im Tooltip. Der Titel
          füllt nur den übrigen Platz, bleibt aber mindestens 6rem breit – sonst
          verschwände er bei offenem Seitenbereich. */}
      <h1
        className="min-w-24 flex-1 basis-24 truncate text-base font-semibold"
        title={title}
      >
        {title}
      </h1>
      {actions && (
        <div className="flex min-w-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
