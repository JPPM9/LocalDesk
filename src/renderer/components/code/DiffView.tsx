/**
 * Vorher/Nachher einer Datei als farbige Zeilen: entfernt rot, neu grün.
 * Bekommt einen Unified Diff (aus jsdiff) – reiner Text, nichts wird ausgeführt.
 */
export function DiffView({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-bg py-1.5 font-mono text-[12px] leading-[1.5]">
      {lines.map((line, i) => (
        <div key={i} className={`px-3 whitespace-pre ${lineClass(line)}`}>
          {line || ' '}
        </div>
      ))}
    </pre>
  );
}

function lineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) {
    return 'font-semibold text-muted';
  }
  if (line.startsWith('@@')) return 'text-accent-text';
  if (line.startsWith('+')) return 'bg-ok/15 text-text';
  if (line.startsWith('-')) return 'bg-error/15 text-text';
  if (line.startsWith('[…')) return 'text-subtle';
  return 'text-muted';
}
