'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Droplet } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PriceChart, { ChartPoint } from '@/components/ui/PriceChart';
import StatTile from '@/components/ui/StatTile';
import { PageSpinner } from '@/components/ui/Skeleton';

type Market = {
  id: string;
  title: string;
  category: string;
  totalVolume: string | number;
  options: { id: string; optionText: string }[];
};

type Analytics = {
  volume24h: number | string;
  volume7d: number | string;
  tradersCount: number;
  liquidity: number | string;
  priceMove24h: number;
};

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuthStore();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [range, setRange] = useState<'1h' | '24h' | '7d' | '30d'>('7d');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    api.get('/markets')
      .then((res) => {
        setMarkets(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedId) return;
    const market = markets.find((m) => m.id === selectedId);
    if (!market) return;

    api.get(`/markets/${selectedId}/price-history`, { params: { range } })
      .then((res) => {
        const firstOptionId = market.options?.[0]?.id;
        const series = firstOptionId && res.data[firstOptionId] ? res.data[firstOptionId].points : [];
        setChartData(series.map((p: any) => ({ label: new Date(p.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), value: Number(p.price) * 100 })));
      })
      .catch(() => setChartData([]));

    api.get(`/markets/${selectedId}/analytics`)
      .then((res) => setAnalytics(res.data))
      .catch(() => setAnalytics(null));
  }, [selectedId, range, markets]);

  const highlights = useMemo(() => {
    if (markets.length === 0) return null;
    const byCategory = new Map<string, number>();
    let topMarket = markets[0];
    for (const m of markets) {
      const vol = Number(m.totalVolume || 0);
      byCategory.set(m.category, (byCategory.get(m.category) || 0) + vol);
      if (vol > Number(topMarket.totalVolume || 0)) topMarket = m;
    }
    const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return { topMarket, topCategory: topCategory?.[0], marketCount: markets.length };
  }, [markets]);

  if (!isAuthenticated) {
    return <div className="text-center p-20 text-[var(--color-text-secondary)]">Please log in to view analytics.</div>;
  }
  if (loading) return <PageSpinner />;

  const selectedMarket = markets.find((m) => m.id === selectedId);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 xl:px-12 pt-8 pb-20">
      <div className="w-full">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Live volume, price history, and liquidity — pulled straight from the market you pick below.</p>
          </div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
          >
            {markets.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatTile label="24h Volume" value={`$${Number(analytics.volume24h).toLocaleString()}`} icon={TrendingUp} />
            <StatTile label="7d Volume" value={`$${Number(analytics.volume7d).toLocaleString()}`} icon={BarChart3} />
            <StatTile label="Traders" value={String(analytics.tradersCount)} icon={Users} />
            <StatTile label="Liquidity" value={Number(analytics.liquidity).toFixed(0)} icon={Droplet} />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold">{selectedMarket?.title || 'Price history'}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">YES-side probability over time.</p>
              </div>
              <div className="flex gap-2">
                {(['1h', '24h', '7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${range === r ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart data={chartData} color="var(--color-primary)" />
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Highlights</h3>
            <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
              <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)]">
                Highest-volume category: <strong className="text-[var(--color-text-primary)]">{highlights?.topCategory || '—'}</strong>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)]">
                Top market: <strong className="text-[var(--color-text-primary)]">{highlights?.topMarket?.title || '—'}</strong>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)]">
                24h price move: <strong className={Number(analytics?.priceMove24h || 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>{Number(analytics?.priceMove24h || 0).toFixed(1)}pp</strong>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)]">
                Markets tracked: <strong className="text-[var(--color-text-primary)]">{highlights?.marketCount ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
