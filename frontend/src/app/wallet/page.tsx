'use client';

import Link from 'next/link';
import { useEffect, useState, FormEvent } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Skeleton';

type LedgerEntry = {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  subType?: string;
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  createdAt: string;
};

export default function WalletPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin adjust balance state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const handleAdjustSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount || !adjustReason) {
      addToast('Please fill all fields', 'error');
      return;
    }
    setAdjustLoading(true);
    try {
      await api.post(`/admin/users/${adjustUserId}/wallet`, {
        type: adjustType,
        amount: Number(adjustAmount),
        reason: adjustReason,
      });
      addToast('User wallet adjusted successfully', 'success');
      setAdjustModalOpen(false);
      setAdjustUserId('');
      setAdjustAmount('');
      setAdjustReason('');
      // optionally refresh own ledger if needed, but it's for another user
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to adjust wallet', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    api.get('/wallet/ledger')
      .then(res => setEntries(res.data.entries))
      .catch(err => {
        console.error(err);
        addToast('Unable to load wallet ledger', 'error');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, addToast]);

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Please log in to view wallet and funds.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  if (isAuthenticated && !user) {
    return (
      <div className="w-full pt-28 pb-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">User information is not available. Please refresh or log in again.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  return (
    <div className="w-full pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] uppercase tracking-[0.18em]">Wallet balance</p>
                <h2 className="text-3xl font-semibold text-[var(--color-text-primary)]">${Number(user?.totalBalance || 0).toLocaleString()}</h2>
              </div>
              <CreditCard className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Every point in your balance is traceable to a ledger entry below — no balance change happens without one.</p>
          </div>

          <div className="card p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">Quick actions</h3>
            <div className="grid gap-3 mt-auto">
              {user?.isAdmin ? (
                <>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">As an administrator, you can directly adjust user funds.</p>
                  <button onClick={() => { setAdjustType('CREDIT'); setAdjustModalOpen(true); }} className="btn-primary px-4 py-3 text-sm">Credit User Funds</button>
                  <button onClick={() => { setAdjustType('DEBIT'); setAdjustModalOpen(true); }} className="btn-secondary px-4 py-3 text-sm">Debit User Funds</button>
                </>
              ) : (
                <>
                  <button className="btn-secondary px-4 py-3 text-sm opacity-60 cursor-not-allowed" title="Coming soon">Deposit Funds</button>
                  <button className="btn-secondary px-4 py-3 text-sm opacity-60 cursor-not-allowed" title="Coming soon">Withdraw Funds</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden !p-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-xl font-semibold">Wallet Ledger</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">Every credit and debit, with the running balance before/after.</p>
            </div>
          </div>

          {loading ? (
            <PageSpinner />
          ) : entries.length === 0 ? (
            <EmptyState title="No ledger entries yet" description="Place a prediction or earn a bonus to see it recorded here." />
          ) : (
            <Table
              rowKey={(e) => e.id}
              data={entries}
              columns={[
                { header: 'Date', accessor: (e) => new Date(e.createdAt).toLocaleString() },
                {
                  header: 'Type',
                  accessor: (e) => (
                    <span className="inline-flex items-center gap-1.5">
                      {e.type === 'CREDIT' ? <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <ArrowDownRight className="w-3.5 h-3.5 text-[var(--color-danger)]" />}
                      <Badge tone={e.type === 'CREDIT' ? 'success' : 'danger'}>{e.subType || e.type}</Badge>
                    </span>
                  ),
                },
                {
                  header: 'Amount',
                  accessor: (e) => (
                    <span className={`font-mono font-semibold ${e.type === 'CREDIT' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {e.type === 'CREDIT' ? '+' : '-'}${Number(e.amount).toLocaleString()}
                    </span>
                  ),
                },
                { header: 'Balance before', accessor: (e) => <span className="font-mono text-[var(--color-text-muted)]">${Number(e.balanceBefore).toLocaleString()}</span> },
                { header: 'Balance after', accessor: (e) => <span className="font-mono">${Number(e.balanceAfter).toLocaleString()}</span> },
              ]}
            />
          )}
        </div>
      </div>

      {adjustModalOpen && user?.isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <h2 className="text-lg font-semibold mb-4">{adjustType === 'CREDIT' ? 'Credit User Funds' : 'Debit User Funds'}</h2>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">User ID</label>
                <input
                  type="text"
                  required
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Enter User ID to adjust"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Amount</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="e.g. Bonus, Correction, etc."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={adjustLoading}>
                  {adjustLoading ? 'Processing...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
