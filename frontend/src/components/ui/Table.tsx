import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  className?: string;
}

export default function Table<T>({ columns, data, rowKey, className }: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] relative', className)}>
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)] shadow-[0_1px_0_rgba(0,0,0,0.1)]">
          <tr className="text-left">
            {columns.map((col) => (
              <th key={col.header} className="sticky top-0 z-10 bg-[var(--color-bg-secondary)] px-4 py-3 font-medium text-[var(--color-text-secondary)] text-xs uppercase tracking-wide border-b border-[var(--color-border)]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-light)]">
          {data.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-[var(--color-bg-secondary)]/60 transition-colors">
              {columns.map((col) => (
                <td key={col.header} className={cn('px-4 py-3 text-[var(--color-text-primary)]', col.className)}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
