import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatTileProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatTile({ label, value, icon: Icon, trend, className }: StatTileProps) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</span>
        {trend && (
          <span className={cn('text-xs font-medium', trend.positive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
