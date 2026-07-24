'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import StatTile from '@/components/ui/StatTile';
import { PageSpinner } from '@/components/ui/Skeleton';
import { Users as UsersIcon, ShieldCheck, ShieldOff, Wallet } from 'lucide-react';

export default function UserManagementPage() {
  const { addToast } = useUIStore();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/users/admin/all', { params: { search: q || undefined } });
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const suspendedCount = users.filter((u) => u.isSuspended).length;
  const adminCount = users.filter((u) => u.isAdmin).length;
  const avgBalance = users.length ? users.reduce((sum, u) => sum + Number(u.totalBalance || 0), 0) / users.length : 0;

  return (
    <div className="h-full flex flex-col min-h-0 space-y-5">
      <div className="flex-shrink-0">
        <h1 className="text-base font-semibold text-text-primary">User Management</h1>
        <p className="text-sm text-text-secondary mt-1">Search accounts, review history, and manage access.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <StatTile label="Total Users" value={String(users.length)} icon={UsersIcon} />
        <StatTile label="Admins" value={String(adminCount)} icon={ShieldCheck} />
        <StatTile label="Suspended" value={String(suspendedCount)} icon={ShieldOff} />
        <StatTile label="Avg Balance" value={`$${avgBalance.toFixed(0)}`} icon={Wallet} />
      </div>

      <div className="card p-4 border border-border flex gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(search)}
            placeholder="Search by username or email..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-[var(--color-surface)]"
          />
        </div>
      </div>

      <div className="card flex-1 min-h-0 overflow-hidden border border-border !p-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <PageSpinner />
          </div>
        ) : (
          <Table
            className="flex-1 overflow-y-auto border-none rounded-none"
            rowKey={(u) => u.id}
            data={users}
            columns={[
              {
                header: 'User',
                accessor: (u) => (
                  <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-primary">
                    {u.username}
                  </Link>
                ),
              },
              { header: 'Email', accessor: (u) => u.email },
              { header: 'Balance', accessor: (u) => `$${Number(u.totalBalance).toLocaleString()}` },
              { header: 'Trust Score', accessor: (u) => Number(u.trustScore).toFixed(0) },
              { header: 'Predictions', accessor: (u) => u.predictionCount },
              {
                header: 'Status',
                accessor: (u) => (
                  <div className="flex gap-1">
                    {u.isAdmin && <Badge tone="primary">Admin</Badge>}
                    {u.isSuspended ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
