'use client';

import { useEffect, useState } from 'react';
import { Eye, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type MarketOption = { id: string; optionText: string };
type Market = { id: string; title?: string };

type Preview = {
  winnerCount: number;
  loserCount: number;
  totalPayout: number;
  totalStakeReturned: number;
  totalLostStake: number;
  netPlatformImpact: number;
};

export default function ResolveMarketModal({ market, onClose, onResolved }: { market: Market | null; onClose: () => void; onResolved: () => void }) {
  const { addToast } = useUIStore();
  const [options, setOptions] = useState<MarketOption[]>([]);
  const [winningOptionId, setWinningOptionId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  useEffect(() => {
    if (!market) return;
    setWinningOptionId('');
    setSourceUrl('');
    setEvidenceUrl('');
    setNotes('');
    setPreview(null);
    setStep('form');
    api.get(`/markets/${market.id}`).then((res) => setOptions(res.data.options || [])).catch(() => setOptions([]));
  }, [market]);

  if (!market) return null;

  const runPreview = async () => {
    if (!winningOptionId) return addToast('Select a winning option first', 'error');
    setPreviewLoading(true);
    try {
      const res = await api.post(`/admin/markets/${market.id}/resolve/preview`, { winningOptionId });
      setPreview(res.data);
      setStep('confirm');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to preview resolution', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const submit = async () => {
    if (!winningOptionId || !sourceUrl || !notes) {
      addToast('Winning option, source, and notes are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/markets/${market.id}/resolve`, { winningOptionId, sourceUrl, evidenceUrl: evidenceUrl || undefined, notes });
      addToast('Market resolved', 'success');
      onResolved();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to resolve market', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={Boolean(market)} onClose={onClose} title={`Resolve: ${market.title}`}>
      {step === 'form' ? (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Winning option</span>
            <select value={winningOptionId} onChange={(e) => setWinningOptionId(e.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]">
              <option value="">Select…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.optionText}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Source URL</span>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Evidence URL (optional)</span>
            <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Resolution notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
          </label>
          <Button onClick={runPreview} loading={previewLoading} disabled={!sourceUrl || !notes} className="w-full">
            <Eye className="w-4 h-4" /> Preview Settlement
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <ShieldAlert className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">Review the settlement below carefully — this cannot be undone without a dispute.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-text-secondary uppercase">Winners</p>
              <p className="text-lg font-bold text-[var(--color-success)]">{preview?.winnerCount}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-text-secondary uppercase">Losers</p>
              <p className="text-lg font-bold text-[var(--color-danger)]">{preview?.loserCount}</p>
            </div>
            <div className="rounded-lg border border-border p-3 col-span-2">
              <p className="text-xs text-text-secondary uppercase">Total payout to winners</p>
              <p className="text-lg font-bold">${preview?.totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-lg border border-border p-3 col-span-2">
              <p className="text-xs text-text-secondary uppercase">Stake retained from losers</p>
              <p className="text-lg font-bold">${preview?.totalLostStake.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('form')} className="flex-1">Back</Button>
            <Button onClick={submit} loading={submitting} className="flex-1">Confirm & Resolve</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
