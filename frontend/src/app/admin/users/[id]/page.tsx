'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShieldOff, ShieldCheck, Award } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Skeleton';

const BADGE_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'TOP_TRADER', label: 'Top Trader' },
  { value: 'MARKET_PROPHET', label: 'Market Prophet' },
  { value: 'COMMUNITY_LEAD', label: 'Community Lead' },
  { value: 'RISK_TAKER', label: 'Risk Taker' },
];

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { addToast } = useUIStore();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustReason, setAdjustReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [badgeType, setBadgeType] = useState('BEGINNER');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/users/admin/${userId}/detail`);
      setDetail(res.data);
    } catch (error) {
      console.error(error);
      addToast('Failed to load user', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, addToast]);

  useEffect(() => { void load(); }, [load]);

  const adjustWallet = async () => {
    if (!adjustAmount || adjustAmount <= 0 || !adjustReason.trim()) return addToast('Amount and reason are required', 'error');
    setSubmitting(true);
    try {
      await api.post(`/users/admin/${userId}/wallet-adjust`, { type: adjustType, amount: adjustAmount, reason: adjustReason });
      addToast('Wallet adjusted', 'success');
      setAdjustReason('');
      load();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to adjust wallet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSuspend = async () => {
    try {
      if (detail.isSuspended) {
        await api.post(`/users/admin/${userId}/reactivate`);
        addToast('User reactivated', 'success');
      } else {
        await api.post(`/users/admin/${userId}/suspend`, { reason: suspendReason || undefined });
        addToast('User suspended', 'success');
      }
      setSuspendReason('');
      load();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Action failed', 'error');
    }
  };

  const toggleAdmin = async () => {
    try {
      await api.post(`/users/admin/${userId}/admin-status`, { isAdmin: !detail.isAdmin });
      addToast('Admin status updated', 'success');
      load();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Action failed', 'error');
    }
  };

  const grantBadge = async () => {
    try {
      await api.post(`/users/admin/${userId}/badges`, { badgeType });
      addToast('Badge granted', 'success');
      load();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to grant badge', 'error');
    }
  };

  if (loading || !detail) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/admin/users')} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="w-4 h-4" /> Back to User Management
      </button>

      <div className="card p-5 border border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {detail.isAdmin && <Badge tone="primary">Admin</Badge>}
              <Badge tone={detail.isSuspended ? 'danger' : 'success'}>{detail.isSuspended ? 'Suspended' : 'Active'}</Badge>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{detail.username}</h1>
            <p className="text-sm text-text-secondary">{detail.email}</p>
            {detail.isSuspended && detail.suspendedReason && <p className="text-xs text-danger mt-1">Reason: {detail.suspendedReason}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={detail.isAdmin ? 'danger' : 'secondary'} onClick={toggleAdmin}>{detail.isAdmin ? 'Revoke Admin' : 'Grant Admin'}</Button>
            <Button size="sm" variant={detail.isSuspended ? 'primary' : 'danger'} onClick={toggleSuspend}>
              {detail.isSuspended ? <><ShieldCheck className="w-3.5 h-3.5" /> Reactivate</> : <><ShieldOff className="w-3.5 h-3.5" /> Suspend</>}
            </Button>
          </div>
        </div>

        {!detail.isSuspended && (
          <input
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Suspension reason (optional, shown to user)"
            className="mt-4 w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]"
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
          <div><p className="text-text-secondary text-xs uppercase">Balance</p><p className="font-mono font-semibold">${Number(detail.totalBalance).toLocaleString()}</p></div>
          <div><p className="text-text-secondary text-xs uppercase">Level</p><p className="font-semibold">{detail.level} ({detail.xpPoints} XP)</p></div>
          <div><p className="text-text-secondary text-xs uppercase">Trust Score</p><p className="font-semibold">{Number(detail.trustScore).toFixed(0)}</p></div>
          <div><p className="text-text-secondary text-xs uppercase">Accuracy</p><p className="font-semibold">{Number(detail.accuracyPercentage).toFixed(1)}%</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4">Wallet Adjustment</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'CREDIT' | 'DEBIT')} className="rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]">
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
              </select>
              <input type="number" min={1} value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
            </div>
            <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason (required, ledgered + audited)" className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
            <Button onClick={adjustWallet} loading={submitting} className="w-full">Apply Adjustment</Button>
          </div>
        </div>

        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4" /> Grant Badge</h3>
          <div className="flex gap-2">
            <select value={badgeType} onChange={(e) => setBadgeType(e.target.value)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]">
              {BADGE_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <Button onClick={grantBadge}>Grant</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {detail.badges.map((b: any) => <Badge key={b.id} tone="warning">🏆 {b.badge.displayName}</Badge>)}
            {detail.badges.length === 0 && <p className="text-sm text-text-secondary">No badges yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4">Recent Predictions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
            {detail.predictions.map((p: any) => (
              <div key={p.id} className="flex justify-between border-b border-border-light pb-2">
                <span>{p.market?.title} — {p.option?.optionText}</span>
                <Badge tone={p.status === 'WON' ? 'success' : p.status === 'LOST' ? 'danger' : 'neutral'}>{p.status}</Badge>
              </div>
            ))}
            {detail.predictions.length === 0 && <p className="text-text-secondary">No predictions yet.</p>}
          </div>
        </div>

        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4">Recent Wallet Ledger</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
            {detail.walletLedgers.map((e: any) => (
              <div key={e.id} className="flex justify-between border-b border-border-light pb-2">
                <span>{e.subType || e.type}</span>
                <span className={`font-mono ${e.type === 'CREDIT' ? 'text-success' : 'text-danger'}`}>{e.type === 'CREDIT' ? '+' : '-'}${Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
            {detail.walletLedgers.length === 0 && <p className="text-text-secondary">No ledger entries yet.</p>}
          </div>
        </div>
      </div>

      {detail.fraudFlags.length > 0 && (
        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4">Fraud Flags</h3>
          <div className="space-y-2 text-sm">
            {detail.fraudFlags.map((f: any) => (
              <div key={f.id} className="flex justify-between border-b border-border-light pb-2">
                <span>{f.type.replace('_', ' ')}</span>
                <Badge tone={f.status === 'CONFIRMED' ? 'danger' : f.status === 'DISMISSED' ? 'neutral' : 'warning'}>{f.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
