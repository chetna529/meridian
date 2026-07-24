'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, TrendingUp, ScrollText, MessageSquare, Pin, Trash2, Lock, Play, Gavel, CheckCircle2, XCircle, Archive } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge, { marketStatusTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StatTile from '@/components/ui/StatTile';
import PriceChart, { ChartPoint } from '@/components/ui/PriceChart';
import { PageSpinner } from '@/components/ui/Skeleton';
import ResolveMarketModal from '@/components/admin/ResolveMarketModal';

export default function AdminMarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params?.id as string;
  const { addToast } = useUIStore();
  const [market, setMarket] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [marketRes, analyticsRes, timelineRes, participantsRes, priceRes] = await Promise.all([
        api.get(`/markets/${marketId}`),
        api.get(`/markets/${marketId}/analytics`),
        api.get(`/admin/markets/${marketId}/timeline`),
        api.get(`/admin/markets/${marketId}/participants`),
        api.get(`/markets/${marketId}/price-history`, { params: { range: '7d' } }),
      ]);
      setMarket(marketRes.data);
      setAnalytics(analyticsRes.data);
      setTimeline(timelineRes.data);
      setParticipants(participantsRes.data);
      const firstOptionId = marketRes.data.options?.[0]?.id;
      const series = firstOptionId && priceRes.data[firstOptionId] ? priceRes.data[firstOptionId].points : [];
      setChartData(series.map((p: any) => ({ label: new Date(p.recordedAt).toLocaleDateString(), value: Number(p.price) * 100 })));
    } catch (error) {
      console.error(error);
      addToast('Failed to load market details', 'error');
    } finally {
      setLoading(false);
    }
  }, [marketId, addToast]);

  useEffect(() => { void load(); }, [load]);

  const runLifecycleAction = async (action: string) => {
    try {
      await api.post(`/markets/${marketId}/${action}`);
      addToast(`Market ${action.replace('-', ' ')}d`, 'success');
      load();
    } catch (error: any) {
      addToast(error.response?.data?.error || `Failed to ${action} market`, 'error');
    }
  };

  const handleDeleteMarket = async () => {
    if (!window.confirm('Are you sure you want to delete this market? This will delete all associated predictions, comments, positions, transactions, and cannot be undone.')) return;
    try {
      await api.delete(`/markets/${marketId}`);
      addToast('Market deleted successfully', 'success');
      router.push('/admin/markets');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to delete market', 'error');
    }
  };

  const togglePin = async (commentId: string) => {
    try {
      await api.post(`/admin/comments/${commentId}/pin`);
      load();
    } catch {
      addToast('Failed to update comment', 'error');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/admin/comments/${commentId}`);
      addToast('Comment deleted', 'success');
      load();
    } catch {
      addToast('Failed to delete comment', 'error');
    }
  };

  if (loading || !market) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <Link href="/admin/markets" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="w-4 h-4" /> Back to Market Management
      </Link>

      <div className="card p-5 border border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge tone={marketStatusTone(market.status)}>{market.status}</Badge>
              <span className="text-xs text-text-secondary">{market.category}</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{market.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {['DRAFT', 'PENDING_APPROVAL'].includes(market.status) && (
              <Button size="sm" variant="primary" onClick={() => runLifecycleAction('approve')}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
            )}
            {market.status === 'LIVE' && (
              <Button size="sm" variant="secondary" onClick={() => runLifecycleAction('lock')}><Lock className="w-3.5 h-3.5" /> Lock</Button>
            )}
            {market.status === 'LOCKED' && (
              <Button size="sm" variant="secondary" onClick={() => runLifecycleAction('start-resolving')}><Play className="w-3.5 h-3.5" /> Start Resolving</Button>
            )}
            {['LOCKED', 'RESOLVING'].includes(market.status) && (
              <Button size="sm" variant="primary" onClick={() => setResolveTarget(market)}><Gavel className="w-3.5 h-3.5" /> Resolve</Button>
            )}
            {['DRAFT', 'PENDING_APPROVAL', 'LIVE'].includes(market.status) && (
              <Button size="sm" variant="danger" onClick={() => runLifecycleAction('cancel')}><XCircle className="w-3.5 h-3.5" /> Cancel</Button>
            )}
            {market.status === 'RESOLVED' && (
              <Button size="sm" variant="secondary" onClick={() => runLifecycleAction('archive')}><Archive className="w-3.5 h-3.5" /> Archive</Button>
            )}
            <Button size="sm" variant="danger" onClick={handleDeleteMarket}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
          </div>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="24h Volume" value={`$${Number(analytics.volume24h).toLocaleString()}`} />
          <StatTile label="7d Volume" value={`$${Number(analytics.volume7d).toLocaleString()}`} icon={TrendingUp} />
          <StatTile label="Traders" value={String(analytics.tradersCount)} icon={Users} />
          <StatTile label="Liquidity" value={Number(analytics.liquidity).toFixed(0)} />
        </div>
      )}

      <div className="card p-5 border border-border">
        <h3 className="text-base font-semibold mb-4">Price history (7d)</h3>
        <PriceChart data={chartData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Participants ({participants.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto text-sm">
            {participants.length === 0 && <p className="text-text-secondary">No positions yet.</p>}
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border-light pb-2">
                <span><strong>{p.user?.username}</strong> — {p.option?.optionText}</span>
                <span className="font-mono text-text-secondary">${Number(p.costBasis).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><ScrollText className="w-4 h-4" /> Timeline</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto text-sm">
            {timeline.length === 0 && <p className="text-text-secondary">No events recorded yet.</p>}
            {timeline.map((event, i) => (
              <div key={i} className="border-l-2 border-border pl-3">
                <p className="font-medium">{event.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-text-secondary">{event.actor ? `by ${event.actor}` : ''} • {new Date(event.at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5 border border-border">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments ({market.comments?.length ?? 0})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(market.comments || []).map((c: any) => (
            <div key={c.id} className="flex items-start justify-between gap-3 border-b border-border-light pb-3 text-sm">
              <div>
                <p><strong>{c.user?.username}</strong> {c.pinned && <Badge tone="warning" className="ml-1">Pinned</Badge>}</p>
                <p className="text-text-secondary">{c.text}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => togglePin(c.id)} className="p-1.5 text-text-muted hover:text-primary"><Pin className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteComment(c.id)} className="p-1.5 text-text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {(!market.comments || market.comments.length === 0) && <p className="text-sm text-text-secondary">No comments yet.</p>}
        </div>
      </div>

      <ResolveMarketModal market={resolveTarget} onClose={() => setResolveTarget(null)} onResolved={() => { setResolveTarget(null); load(); }} />
    </div>
  );
}
