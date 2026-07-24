'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Skeleton';

export default function RiskPage() {
  const { addToast } = useUIStore();
  const [status, setStatus] = useState<'OPEN' | 'CONFIRMED' | 'DISMISSED'>('OPEN');
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/fraud-flags', { params: { status } });
      setFlags(res.data);
    } catch {
      addToast('Failed to load fraud flags', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, addToast]);

  useEffect(() => { void fetchFlags(); }, [fetchFlags]);

  const review = async (id: string, decision: 'CONFIRMED' | 'DISMISSED') => {
    try {
      await api.post(`/admin/fraud-flags/${id}/review`, { decision });
      addToast(`Flag ${decision.toLowerCase()}`, 'success');
      fetchFlags();
    } catch {
      addToast('Failed to review flag', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Risk & Fraud</h1>
          <p className="text-sm text-text-secondary mt-1">Rule-based detections: wash trading, rapid-fire bots, and volume spikes.</p>
        </div>
        <ShieldCheck className="w-5 h-5 text-primary" />
      </div>

      <Tabs tabs={[{ key: 'OPEN', label: 'Open' }, { key: 'CONFIRMED', label: 'Confirmed' }, { key: 'DISMISSED', label: 'Dismissed' }]} active={status} onChange={(k) => setStatus(k as any)} />

      <div className="card p-4 border border-border">
        {loading ? (
          <PageSpinner />
        ) : flags.length === 0 ? (
          <EmptyState title={`No ${status.toLowerCase()} fraud flags`} />
        ) : (
          <div className="space-y-3 text-sm">
            {flags.map((flag) => (
              <div key={flag.id} className="rounded-lg border border-border p-3 bg-[var(--color-bg-secondary)] flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{flag.type.replace('_', ' ')} — {flag.user?.username}</p>
                  <p className="text-xs text-text-secondary">{flag.market?.title || 'Platform-wide'} • severity {flag.severity} • {new Date(flag.createdAt).toLocaleString()}</p>
                  {flag.details && <p className="text-xs text-text-muted mt-1">{JSON.stringify(flag.details)}</p>}
                </div>
                {status === 'OPEN' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="danger" onClick={() => review(flag.id, 'CONFIRMED')}>Confirm</Button>
                    <Button size="sm" variant="secondary" onClick={() => review(flag.id, 'DISMISSED')}>Dismiss</Button>
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
