import { useTranslation } from 'react-i18next';
import { Table2 } from 'lucide-react';
import type { MessageTable } from '../../../shared/tables';

/** Die Tabellen einer Nachricht als kleine Felder (die Daten selbst stehen nicht im Chat). */
export function MessageTables({ tables }: { tables: MessageTable[] }) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="flex flex-wrap justify-end gap-2">
      {tables.map((table) => (
        <li
          key={table.id}
          title={table.name}
          className="flex max-w-[280px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs"
        >
          <Table2 size={16} className="shrink-0 text-muted" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{table.name}</span>
            <span className="block text-subtle">
              {t('chat.tables.size', {
                rows: table.rows.toLocaleString(i18n.language),
                columns: table.columns,
              })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
