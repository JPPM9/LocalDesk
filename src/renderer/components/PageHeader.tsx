interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="flex h-12 items-center border-b border-border px-6">
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
}
