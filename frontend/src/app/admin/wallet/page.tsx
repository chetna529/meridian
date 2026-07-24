'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import { downloadAuthenticated } from '@/lib/download';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Skeleton';

const SUBTYPES = ['PREDICTION_STAKE', 'PAYOUT', 'LEVEL_UP_BONUS', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT'];

export default function WalletManagementPage() {
  const { addToast } = useUIStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [type, setType] = useState('');
  const [subType, setSubType] = useState('');

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
      addToast('Wallet adjusted successfully', 'success');
      setAdjustModalOpen(false);
      setAdjustUserId('');
      setAdjustAmount('');
      setAdjustReason('');
      fetchLedger();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to adjust wallet', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  const fetchLedger = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/wallet-ledger', {
        params: { username: username || undefined, type: type || undefined, subType: subType || undefined, cursor, take: 30 },
      });
      setEntries((prev) => (cursor ? [...prev, ...res.data.entries] : res.data.entries));
      setNextCursor(res.data.nextCursor);
    } catch (error) {
      console.error(error);
      addToast('Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [username, type, subType, addToast]);

  useEffect(() => { void fetchLedger(); }, [fetchLedger]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Wallet & Transaction Management</h1>
          <p className="text-sm text-text-secondary mt-1">Every credit and debit on the platform, filterable and exportable.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setAdjustModalOpen(true)}>
            Adjust Balance
          </Button>
          <Button variant="secondary" onClick={() => downloadAuthenticated('/admin/reports/export/ledger', 'wallet-ledger.csv')}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="card p-4 border border-border flex flex-col md:flex-row gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLedger()}
          placeholder="Filter by username..."
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-[var(--color-surface)]"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-[var(--color-surface)]">
          <option value="">All types</option>
          <option value="CREDIT">Credit</option>
          <option value="DEBIT">Debit</option>
        </select>
        <select value={subType} onChange={(e) => setSubType(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-[var(--color-surface)]">
          <option value="">All subtypes</option>
          {SUBTYPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <Button onClick={() => fetchLedger()} variant="secondary">Filter</Button>
      </div>

      <div className="card overflow-hidden !p-0">
        {loading && entries.length === 0 ? (
          <PageSpinner />
        ) : entries.length === 0 ? (
          <EmptyState title="No ledger entries match your filters" />
        ) : (
          <>
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              <Table
                rowKey={(e) => e.id}
                data={entries}
                columns={[
                  { header: 'Date', accessor: (e) => new Date(e.createdAt).toLocaleString() },
                  { header: 'User', accessor: (e) => <Link href={`/admin/users/${e.userId}`} className="hover:text-primary font-medium">{e.user?.username}</Link> },
                  { header: 'Type', accessor: (e) => <Badge tone={e.type === 'CREDIT' ? 'success' : 'danger'}>{e.subType || e.type}</Badge> },
                  { header: 'Amount', accessor: (e) => <span className={`font-mono font-semibold ${e.type === 'CREDIT' ? 'text-success' : 'text-danger'}`}>{e.type === 'CREDIT' ? '+' : '-'}${Number(e.amount).toLocaleString()}</span> },
                  { header: 'Balance After', accessor: (e) => <span className="font-mono">${Number(e.balanceAfter).toLocaleString()}</span> },
                ]}
              />
            </div>
            {nextCursor && (
              <div className="p-4 text-center border-t border-border">
                <Button variant="secondary" loading={loading} onClick={() => fetchLedger(nextCursor)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </div>

      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <h2 className="text-lg font-semibold mb-4">Adjust User Wallet</h2>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">User ID</label>
                <input
                  type="text"
                  required
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Enter User ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="CREDIT">Credit (Add Funds)</option>
                  <option value="DEBIT">Debit (Remove Funds)</option>
                </select>
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
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Reason for adjustment"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setAdjustModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={adjustLoading}>
                  Submit Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
