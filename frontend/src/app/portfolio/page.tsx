'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import StatTile from '@/components/ui/StatTile';
import EmptyState from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Skeleton';
import PriceChart, { ChartPoint } from '@/components/ui/PriceChart';

type Position = {
  id: string;
  marketId: string;
  market: { title: string; status: string };
  option: { optionText: string };
  shares: number | string;
  entryPrice: number;
  currentPrice: number;
  costBasis: number | string;
  pnl: number;
  roiPercentage: number;
  status: 'OPEN' | 'CLOSED';
};

export default function PortfolioPage() {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [ledgerSeries, setLedgerSeries] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    api.get('/portfolio')
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        addToast('Failed to load portfolio', 'error');
      })
      .finally(() => setLoading(false));

    api.get('/wallet/ledger', { params: { take: 50 } })
      .then(res => {
        const points = [...res.data.entries].reverse().map((e: any) => ({
          label: new Date(e.createdAt).toLocaleDateString(),
          value: Number(e.balanceAfter),
        }));
        setLedgerSeries(points);
      })
      .catch(() => setLedgerSeries([]));
  }, [isAuthenticated, addToast]);

  if (!isAuthenticated) return <div className="text-center p-20"><p>Please <Link href="/auth/login" className="text-[var(--color-primary)] underline">log in</Link> to view your portfolio.</p></div>;
  if (loading || !data) return <PageSpinner />;

  const positions: Position[] = tab === 'open' ? data.positions.open : data.positions.closed;

  return (
    <div className="w-full px-4 md:px-8 xl:px-12 mt-6 pb-20">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8">Portfolio</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Total Balance" value={`$${Number(data.balance.total).toLocaleString()}`} icon={Wallet} />
        <StatTile
          label="Unrealized P&L"
          value={`$${Number(data.stats.unrealizedPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          icon={data.stats.unrealizedPnl >= 0 ? TrendingUp : TrendingDown}
          trend={{ value: `${data.stats.roi}%`, positive: Number(data.stats.roi) >= 0 }}
        />
        <StatTile label="Win Rate" value={`${data.stats.winRate}%`} icon={Activity} />
        <StatTile label="Predictions" value={String(data.stats.totalPredictions)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
              Balance Over Time
            </h3>
          </div>
          <PriceChart data={ledgerSeries} valuePrefix="$" color="var(--color-secondary)" />
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">Realized vs Unrealized</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Unrealized P&L</span><span className="font-mono">${Number(data.stats.unrealizedPnl).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Realized P&L</span><span className="font-mono">${Number(data.stats.realizedPnl).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-[var(--color-border-light)] pt-3"><span className="text-[var(--color-text-secondary)]">Won / Lost</span><span className="font-mono">{data.stats.wonPredictions} / {data.stats.lostPredictions}</span></div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-bold text-lg">Your Positions</h3>
          <Tabs
            tabs={[
              { key: 'open', label: 'Open', count: data.positions.open.length },
              { key: 'closed', label: 'Closed', count: data.positions.closed.length },
            ]}
            active={tab}
            onChange={(k) => setTab(k as 'open' | 'closed')}
          />
        </div>

        {positions.length === 0 ? (
          <EmptyState title={`No ${tab} positions`} description="Place a prediction on a live market to open a position." />
        ) : (
          <Table
            rowKey={(p) => p.id}
            data={positions}
            columns={[
              { header: 'Market', accessor: (p) => <Link href={`/markets/${p.marketId}`} className="hover:text-[var(--color-primary)] font-medium">{p.market.title}</Link> },
              { header: 'Side', accessor: (p) => <Badge tone="primary">{p.option.optionText}</Badge> },
              { header: 'Shares', accessor: (p) => <span className="font-mono">{Number(p.shares).toFixed(2)}</span> },
              { header: 'Entry Price', accessor: (p) => <span className="font-mono">{(Number(p.entryPrice) * 100).toFixed(1)}¢</span> },
              { header: 'Current Price', accessor: (p) => <span className="font-mono">{(Number(p.currentPrice) * 100).toFixed(1)}¢</span> },
              {
                header: 'P&L',
                accessor: (p) => (
                  <span className={`font-mono font-semibold ${Number(p.pnl) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {Number(p.pnl) >= 0 ? '+' : ''}${Number(p.pnl).toFixed(2)} ({Number(p.roiPercentage).toFixed(1)}%)
                  </span>
                ),
              },
              { header: 'Status', accessor: (p) => <Badge tone={p.status === 'OPEN' ? 'success' : 'neutral'}>{p.status}</Badge> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
