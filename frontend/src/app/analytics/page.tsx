'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Droplet, Download, Search, Table, RefreshCw, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PriceChart, { ChartPoint } from '@/components/ui/PriceChart';
import StatTile from '@/components/ui/StatTile';
import { PageSpinner } from '@/components/ui/Skeleton';

type MarketOption = {
  id: string;
  optionText: string;
  totalStaked?: number | string;
  currentOdds?: number | string;
  predictionCount?: number;
};

type Market = {
  id: string;
  title: string;
  category: string;
  totalVolume: string | number;
  options: MarketOption[];
};

type Analytics = {
  volume24h: number | string;
  volume7d: number | string;
  tradersCount: number;
  liquidity: number | string;
  priceMove24h: number;
};

type RawPricePoint = {
  id: string;
  optionId: string;
  optionText: string;
  price: number;
  probabilityPercent: string;
  recordedAt: string;
};

type RawTrade = {
  id: string;
  username: string;
  avatarUrl: string | null;
  optionText: string;
  amountStaked: number;
  potentialReturn: number;
  status: string;
  createdAt: string;
};

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuthStore();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [range, setRange] = useState<'1h' | '24h' | '7d' | '30d'>('7d');
  const [chartMode, setChartMode] = useState<'probability' | 'volume'>('probability');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  
  // Raw Data Explorer State
  const [rawPriceHistory, setRawPriceHistory] = useState<RawPricePoint[]>([]);
  const [rawTrades, setRawTrades] = useState<RawTrade[]>([]);
  const [activeTab, setActiveTab] = useState<'trades' | 'price' | 'options'>('trades');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchMarkets();
  }, [isAuthenticated]);

  const fetchMarkets = () => {
    api.get('/markets')
      .then((res) => {
        setMarkets(res.data);
        if (res.data.length > 0 && !selectedId) {
          setSelectedId(res.data[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!selectedId) return;
    const market = markets.find((m) => m.id === selectedId);
    if (!market) return;

    // Set default option if not set or invalid for selected market
    if (!selectedOptionId || !market.options.some((o) => o.id === selectedOptionId)) {
      if (market.options.length > 0) {
        setSelectedOptionId(market.options[0].id);
      }
    }

    fetchMarketPriceHistory(selectedId, range, selectedOptionId || market.options[0]?.id);
    fetchRawData(selectedId);
  }, [selectedId, range, selectedOptionId, markets]);

  const fetchMarketPriceHistory = (mId: string, r: string, optId?: string) => {
    api.get(`/markets/${mId}/price-history`, { params: { range: r } })
      .then((res) => {
        const targetOptId = optId || Object.keys(res.data)[0];
        const series = targetOptId && res.data[targetOptId] ? res.data[targetOptId].points : [];
        setChartData(
          series.map((p: any) => ({
            label: new Date(p.recordedAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            value: Number(p.price) * 100,
          }))
        );
      })
      .catch(() => setChartData([]));
  };

  const fetchRawData = (mId: string) => {
    setRefreshing(true);
    api.get(`/markets/${mId}/raw-data`)
      .then((res) => {
        if (res.data.analytics) setAnalytics(res.data.analytics);
        if (res.data.priceHistory) setRawPriceHistory(res.data.priceHistory);
        if (res.data.recentTrades) setRawTrades(res.data.recentTrades);
      })
      .catch(() => {
        setAnalytics(null);
        setRawPriceHistory([]);
        setRawTrades([]);
      })
      .finally(() => setRefreshing(false));
  };

  const selectedMarket = markets.find((m) => m.id === selectedId);

  const filteredTrades = useMemo(() => {
    if (!searchTerm.trim()) return rawTrades;
    const term = searchTerm.toLowerCase();
    return rawTrades.filter(
      (t) => t.username.toLowerCase().includes(term) || t.optionText.toLowerCase().includes(term) || t.status.toLowerCase().includes(term)
    );
  }, [rawTrades, searchTerm]);

  const filteredPriceLogs = useMemo(() => {
    if (!searchTerm.trim()) return rawPriceHistory;
    const term = searchTerm.toLowerCase();
    return rawPriceHistory.filter(
      (p) => p.optionText.toLowerCase().includes(term) || p.probabilityPercent.toLowerCase().includes(term)
    );
  }, [rawPriceHistory, searchTerm]);

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

  const exportCSV = () => {
    if (!selectedMarket) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'trades') {
      csvContent += 'Trade ID,Username,Option,Amount Staked,Potential Return,Status,Date\n';
      rawTrades.forEach((t) => {
        csvContent += `"${t.id}","${t.username}","${t.optionText}",${t.amountStaked},${t.potentialReturn},"${t.status}","${t.createdAt}"\n`;
      });
    } else {
      csvContent += 'Record ID,Option,Probability,Price,Date\n';
      rawPriceHistory.forEach((p) => {
        csvContent += `"${p.id}","${p.optionText}","${p.probabilityPercent}",${p.price},"${p.recordedAt}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedMarket.title.replace(/[^a-zA-Z0-9]/g, '_')}_raw_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return <div className="text-center p-20 text-[var(--color-text-secondary)]">Please log in to view analytics.</div>;
  }
  if (loading) return <PageSpinner />;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 xl:px-12 pt-8 pb-20">
      <div className="w-full space-y-8">
        {/* Header & Market Selector */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Analytics & Data Engine</h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Activity className="w-3.5 h-3.5" /> Real-time
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Live trade volume, probability time series, and raw transactional analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedId && fetchRawData(selectedId)}
              className="p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm max-w-[340px] truncate"
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.category}] {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Top Metric Tiles */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="24h Volume" value={`$${Number(analytics.volume24h).toLocaleString()}`} icon={TrendingUp} />
            <StatTile label="7d Volume" value={`$${Number(analytics.volume7d).toLocaleString()}`} icon={BarChart3} />
            <StatTile label="Traders Active" value={String(analytics.tradersCount)} icon={Users} />
            <StatTile label="Liquidity Depth" value={`$${Number(analytics.liquidity).toLocaleString()}`} icon={Droplet} />
          </div>
        )}

        {/* Main Chart & Highlights Section */}
        <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-6">
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedMarket?.title || 'Price history'}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
                  <span>Category: <strong className="text-[var(--color-text-primary)]">{selectedMarket?.category}</strong></span>
                  <span>•</span>
                  <span>Total Market Volume: <strong className="text-[var(--color-text-primary)]">${Number(selectedMarket?.totalVolume || 0).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Option Selector */}
                {selectedMarket?.options && selectedMarket.options.length > 0 && (
                  <select
                    value={selectedOptionId}
                    onChange={(e) => setSelectedOptionId(e.target.value)}
                    className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  >
                    {selectedMarket.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.optionText}
                      </option>
                    ))}
                  </select>
                )}

                {/* Range Selector */}
                <div className="flex bg-[var(--color-bg-secondary)] p-1 rounded-lg border border-[var(--color-border)]">
                  {(['1h', '24h', '7d', '30d'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                        range === r ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="w-full min-h-[280px]">
              <PriceChart
                data={chartData}
                color="var(--color-primary)"
                valueSuffix="%"
                height={290}
                chartType={chartMode === 'probability' ? 'area' : 'bar'}
              />
            </div>
          </div>

          {/* Highlights Sidebar */}
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-4 text-[var(--color-text-primary)]">Platform Insights</h3>
              <div className="space-y-3.5 text-sm">
                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-secondary)] mb-1">Highest Volume Category</div>
                  <strong className="text-base text-[var(--color-text-primary)]">{highlights?.topCategory || '—'}</strong>
                </div>

                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-secondary)] mb-1">Top Volume Market</div>
                  <strong className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2">
                    {highlights?.topMarket?.title || '—'}
                  </strong>
                </div>

                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-4 border border-[var(--color-border)] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)] mb-0.5">24h Price Movement</div>
                    <strong className={`text-base font-bold flex items-center gap-1 ${Number(analytics?.priceMove24h || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {Number(analytics?.priceMove24h || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(Number(analytics?.priceMove24h || 0)).toFixed(1)} pp
                    </strong>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--color-text-secondary)] mb-0.5">Markets Tracked</div>
                    <strong className="text-base text-[var(--color-text-primary)]">{highlights?.marketCount ?? 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
              <span>Data Engine status: Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* RAW DATA EXPLORER SECTION */}
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Raw Data Explorer</h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Inspect raw order book predictions, timestamped price records, and underlying market mechanics.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter raw data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-[180px] sm:w-[220px]"
                />
              </div>

              {/* Export CSV Button */}
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[var(--color-border)] gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('trades')}
              className={`pb-3 transition relative ${
                activeTab === 'trades' ? 'text-[var(--color-primary)] font-semibold border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Recent Trade Log ({rawTrades.length})
            </button>

            <button
              onClick={() => setActiveTab('price')}
              className={`pb-3 transition relative ${
                activeTab === 'price' ? 'text-[var(--color-primary)] font-semibold border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Price Time-Series ({rawPriceHistory.length})
            </button>

            <button
              onClick={() => setActiveTab('options')}
              className={`pb-3 transition relative ${
                activeTab === 'options' ? 'text-[var(--color-primary)] font-semibold border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Option Distribution ({selectedMarket?.options.length || 0})
            </button>
          </div>

          {/* Tab 1: Trade Log */}
          {activeTab === 'trades' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)]/50">
                    <th className="py-3 px-4">Trader</th>
                    <th className="py-3 px-4">Selected Option</th>
                    <th className="py-3 px-4">Stake ($)</th>
                    <th className="py-3 px-4">Potential Return</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">
                        No trade logs found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-[var(--color-bg-secondary)]/30 transition">
                        <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-[10px]">
                            {trade.username[0]?.toUpperCase()}
                          </div>
                          {trade.username}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                          <span className="px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                            {trade.optionText}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">
                          ${trade.amountStaked.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">
                          ${trade.potentialReturn.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            trade.status === 'WON' ? 'bg-emerald-100 text-emerald-700' :
                            trade.status === 'LOST' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                          {new Date(trade.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Raw Price History */}
          {activeTab === 'price' && (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="py-3 px-4">Recorded Timestamp</th>
                    <th className="py-3 px-4">Option Label</th>
                    <th className="py-3 px-4">Probability (%)</th>
                    <th className="py-3 px-4">Decimal Price</th>
                    <th className="py-3 px-4">Entry ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredPriceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">
                        No raw price logs found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPriceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--color-bg-secondary)]/30 transition">
                        <td className="py-3 px-4 font-mono text-[var(--color-text-primary)]">
                          {new Date(log.recordedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">
                          {log.optionText}
                        </td>
                        <td className="py-3 px-4 font-bold text-[var(--color-primary)]">
                          {log.probabilityPercent}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--color-text-secondary)]">
                          {log.price.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                          {log.id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Option Breakdown */}
          {activeTab === 'options' && (
            <div className="space-y-4">
              {selectedMarket?.options.map((opt) => {
                const totalOptVolume = rawTrades
                  .filter((t) => t.optionText === opt.optionText)
                  .reduce((sum, t) => sum + t.amountStaked, 0);
                
                const oddsPercent = opt.currentOdds ? Number(opt.currentOdds).toFixed(1) : '50.0';

                return (
                  <div key={opt.id} className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-[var(--color-text-primary)]">{opt.optionText}</h4>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Total Staked: <strong className="text-[var(--color-text-primary)]">${totalOptVolume.toLocaleString()}</strong> | Current Probability: <strong className="text-[var(--color-primary)]">{oddsPercent}%</strong>
                      </p>
                    </div>

                    <div className="w-full md:w-[240px] space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Odds</span>
                        <span>{oddsPercent}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${oddsPercent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
