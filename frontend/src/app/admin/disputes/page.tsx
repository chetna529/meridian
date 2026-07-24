'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gavel } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Skeleton';

export default function DisputesPage() {
  const { addToast } = useUIStore();
  const [status, setStatus] = useState<'OPEN' | 'UPHELD' | 'REJECTED'>('OPEN');
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/disputes', { params: { status } });
      setDisputes(res.data);
    } catch {
      addToast('Failed to load disputes', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, addToast]);

  useEffect(() => { void fetchDisputes(); }, [fetchDisputes]);

  const review = async (id: string, decision: 'UPHELD' | 'REJECTED') => {
    try {
      await api.post(`/admin/disputes/${id}/review`, { decision });
      addToast(`Dispute ${decision.toLowerCase()}`, 'success');
      fetchDisputes();
    } catch {
      addToast('Failed to review dispute', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Disputes</h1>
          <p className="text-sm text-text-secondary mt-1">Review disputes raised on resolved markets.</p>
        </div>
        <Gavel className="w-5 h-5 text-primary" />
      </div>

      <Tabs tabs={[{ key: 'OPEN', label: 'Open' }, { key: 'UPHELD', label: 'Upheld' }, { key: 'REJECTED', label: 'Rejected' }]} active={status} onChange={(k) => setStatus(k as any)} />

      <div className="card p-4 border border-border">
        {loading ? (
          <PageSpinner />
        ) : disputes.length === 0 ? (
          <EmptyState title={`No ${status.toLowerCase()} disputes`} />
        ) : (
          <div className="space-y-3 text-sm">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-lg border border-border p-3 bg-[var(--color-bg-secondary)]">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/admin/markets/${dispute.market?.id}`} className="font-semibold hover:text-primary">{dispute.market?.title}</Link>
                  <span className="text-xs text-text-secondary">by {dispute.raisedBy?.username}</span>
                </div>
                <p className="text-xs text-text-secondary mb-3">{dispute.reason}</p>
                {dispute.evidenceUrl && <a href={dispute.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">{dispute.evidenceUrl}</a>}
                {status === 'OPEN' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="primary" onClick={() => review(dispute.id, 'UPHELD')}>Uphold (re-resolve)</Button>
                    <Button size="sm" variant="secondary" onClick={() => review(dispute.id, 'REJECTED')}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
