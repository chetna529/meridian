import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
  info: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
  primary: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export default function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export function marketStatusTone(status: string): Tone {
  switch (status) {
    case 'LIVE':
      return 'success';
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'neutral';
    case 'LOCKED':
    case 'RESOLVING':
      return 'warning';
    case 'RESOLVED':
      return 'info';
    case 'DISPUTED':
      return 'danger';
    case 'CANCELLED':
    case 'ARCHIVED':
      return 'neutral';
    default:
      return 'neutral';
  }
}
