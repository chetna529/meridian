import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export default function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)]', className)}
      {...props}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );
}
