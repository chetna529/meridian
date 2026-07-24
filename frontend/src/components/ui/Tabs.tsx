'use client';

import { cn } from '@/lib/cn';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] w-fit', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors',
            active === tab.key
              ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
