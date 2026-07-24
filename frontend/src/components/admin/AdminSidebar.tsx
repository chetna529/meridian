'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { BarChart3, FileText, UserPlus, Wallet, Bell, FileBarChart, ShieldCheck, Gavel, ScrollText, Trophy } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: BarChart3 },
  { href: '/admin/markets', label: 'Markets', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: UserPlus },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/admin/wallet', label: 'Wallet & Ledger', icon: Wallet },
  { href: '/admin/risk', label: 'Risk', icon: ShieldCheck, countKey: 'fraudFlags' },
  { href: '/admin/disputes', label: 'Disputes', icon: Gavel, countKey: 'disputes' },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
];

export default function AdminSidebar() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ fraudFlags: number; disputes: number }>({ fraudFlags: 0, disputes: 0 });

  const fetchCounts = useCallback(async () => {
    if (!user?.isAdmin) return;
    try {
      const [flags, disputes] = await Promise.all([
        api.get('/admin/fraud-flags', { params: { status: 'OPEN' } }),
        api.get('/admin/disputes', { params: { status: 'OPEN' } }),
      ]);
      setCounts({ fraudFlags: flags.data.length, disputes: disputes.data.length });
    } catch {
      // non-critical badge counts — fail silently
    }
  }, [user?.isAdmin]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  if (!user?.isAdmin) return null;

  return (
    <aside className="hidden xl:flex xl:flex-col min-w-[240px] h-full flex-shrink-0">
      <div className="h-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 rounded-[20px] shadow-sm flex flex-col justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="mb-4 px-1">
            <h2 className="text-base font-semibold">Admin Console</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 truncate">{user.username}</p>
          </div>
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, countKey }) => {
              const active = href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href);
              const count = countKey ? counts[countKey as keyof typeof counts] : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                  {count > 0 && <span className="ml-auto text-xs bg-[var(--color-danger)]/15 text-[var(--color-danger)] rounded-full px-1.5">{count}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
