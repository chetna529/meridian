'use client';

import { useCallback, useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, PlusCircle, CheckCircle2, XCircle, Lock, Archive, Gavel, Play, Trash2, MoreVertical } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge, { marketStatusTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Skeleton';
import ResolveMarketModal from '@/components/admin/ResolveMarketModal';

const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'LIVE', 'LOCKED', 'RESOLVING', 'RESOLVED', 'DISPUTED', 'CANCELLED', 'ARCHIVED'];

function MarketActionsDropdown({
  market,
  runLifecycleAction,
  setResolveTarget,
  handleDeleteMarket,
}: {
  market: any;
  runLifecycleAction: (id: string, action: string) => Promise<void>;
  setResolveTarget: (market: any) => void;
  handleDeleteMarket: (id: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasLifecycleActions =
    ['DRAFT', 'PENDING_APPROVAL', 'LIVE', 'LOCKED', 'RESOLVING'].includes(market.status);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-full hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none border border-[var(--color-border)]"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-50 py-1 overflow-hidden">
          {['DRAFT', 'PENDING_APPROVAL'].includes(market.status) && (
            <button
              onClick={() => {
                setIsOpen(false);
                void runLifecycleAction(market.id, 'approve');
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Approve</span>
            </button>
          )}

          {market.status === 'LIVE' && (
            <button
              onClick={() => {
                setIsOpen(false);
                void runLifecycleAction(market.id, 'lock');
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <span>Stop / Lock</span>
            </button>
          )}

          {market.status === 'LOCKED' && (
            <button
              onClick={() => {
                setIsOpen(false);
                void runLifecycleAction(market.id, 'start-resolving');
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-success" />
              <span>Resume / Start</span>
            </button>
          )}

          {['LOCKED', 'RESOLVING'].includes(market.status) && (
            <button
              onClick={() => {
                setIsOpen(false);
                setResolveTarget(market);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors flex items-center gap-2"
            >
              <Gavel className="w-3.5 h-3.5 text-primary" />
              <span>Resolve Market</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsOpen(false);
              void handleDeleteMarket(market.id);
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors flex items-center gap-2 border-t border-[var(--color-border-light)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Market</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MarketManagementContent() {
  const searchParams = useSearchParams();
  const { addToast } = useUIStore();
  const [markets, setMarkets] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams?.get('status') || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resolveTarget, setResolveTarget] = useState<any>(null);

  const fetchMarkets = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/markets', { params: { search: search || undefined, status: status || undefined, cursor, take: 20 } });
      setMarkets((prev) => (cursor ? [...prev, ...res.data.markets] : res.data.markets));
      setNextCursor(res.data.nextCursor);
    } catch (error) {
      console.error(error);
      addToast('Failed to load markets', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, status, addToast]);

  useEffect(() => {
    void fetchMarkets();
    setSelected(new Set());
  }, [fetchMarkets]);

  const runLifecycleAction = async (marketId: string, action: string) => {
    try {
      await api.post(`/markets/${marketId}/${action}`);
      addToast(`Market ${action.replace('-', ' ')}d`, 'success');
      fetchMarkets();
    } catch (error: any) {
      addToast(error.response?.data?.error || `Failed to ${action} market`, 'error');
    }
  };

  const handleDeleteMarket = async (marketId: string) => {
    if (!window.confirm('Are you sure you want to delete this market? This will delete all associated predictions, comments, positions, transactions, and cannot be undone.')) return;
    try {
      await api.delete(`/markets/${marketId}`);
      addToast('Market deleted successfully', 'success');
      fetchMarkets();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to delete market', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: string) => {
    if (selected.size === 0) return;
    try {
      const res = await api.post('/admin/markets/bulk', { marketIds: [...selected], action });
      const failed = res.data.results.filter((r: any) => !r.ok);
      addToast(failed.length ? `${res.data.results.length - failed.length} succeeded, ${failed.length} failed` : `Bulk ${action} applied to ${res.data.results.length} markets`, failed.length ? 'error' : 'success');
      setSelected(new Set());
      fetchMarkets();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Bulk action failed', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Market Management</h1>
          <p className="text-sm text-text-secondary mt-1">Search, filter, and manage every market on the platform.</p>
        </div>
        <Link href="/admin/markets/create" className="btn-primary px-3 py-2 inline-flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> Create Market</Link>
      </div>

      <div className="card p-4 border border-border flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMarkets()}
            placeholder="Search by title..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-[var(--color-surface)]"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-[var(--color-surface)]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => fetchMarkets()} variant="secondary">Search</Button>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 border border-border flex items-center gap-3 bg-[var(--color-primary)]/5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button size="sm" variant="primary" onClick={() => runBulk('approve')}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
            <Button size="sm" variant="secondary" onClick={() => runBulk('lock')}><Lock className="w-3.5 h-3.5" /> Lock</Button>
            <Button size="sm" variant="danger" onClick={() => runBulk('cancel')}><XCircle className="w-3.5 h-3.5" /> Cancel</Button>
            <Button size="sm" variant="secondary" onClick={() => runBulk('archive')}><Archive className="w-3.5 h-3.5" /> Archive</Button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden !p-0">
        {loading && markets.length === 0 ? (
          <PageSpinner />
        ) : markets.length === 0 ? (
          <EmptyState title="No markets match your filters" />
        ) : (
          <>
            <Table
              rowKey={(m) => m.id}
              data={markets}
              columns={[
                {
                  header: '',
                  accessor: (m) => <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} />,
                  className: 'w-8',
                },
                {
                  header: 'Market',
                  accessor: (m) => (
                    <Link href={`/admin/markets/${m.id}`} className="font-medium hover:text-primary">
                      {m.title}
                    </Link>
                  ),
                },
                { header: 'Category', accessor: (m) => m.category },
                { header: 'Status', accessor: (m) => <Badge tone={marketStatusTone(m.status)}>{m.status}</Badge> },
                { header: 'Volume', accessor: (m) => `$${Number(m.totalVolume).toLocaleString()}` },
                { header: 'Predictions', accessor: (m) => m._count?.predictions ?? 0 },
                {
                  header: 'Actions',
                  accessor: (m) => (
                    <MarketActionsDropdown
                      market={m}
                      runLifecycleAction={runLifecycleAction}
                      setResolveTarget={setResolveTarget}
                      handleDeleteMarket={handleDeleteMarket}
                    />
                  ),
                },
              ]}
            />
            {nextCursor && (
              <div className="p-4 text-center border-t border-border">
                <Button variant="secondary" loading={loading} onClick={() => fetchMarkets(nextCursor)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </div>

      <ResolveMarketModal market={resolveTarget} onClose={() => setResolveTarget(null)} onResolved={() => { setResolveTarget(null); fetchMarkets(); }} />
    </div>
  );
}

export default function MarketManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-8">
        <PageSpinner />
      </div>
    }>
      <MarketManagementContent />
    </Suspense>
  );
}
