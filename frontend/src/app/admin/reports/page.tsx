'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { downloadAuthenticated } from '@/lib/download';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import StatTile from '@/components/ui/StatTile';
import PriceChart, { ChartPoint } from '@/components/ui/PriceChart';
import { PageSpinner } from '@/components/ui/Skeleton';

export default function ReportsPage() {
  const { addToast } = useUIStore();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/reports/summary')
      .then((res) => setSummary(res.data))
      .catch(() => addToast('Failed to load reports', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const exportFile = async (path: string, filename: string) => {
    try {
      await downloadAuthenticated(path, filename);
    } catch {
      addToast('Export failed', 'error');
    }
  };

  if (loading || !summary) return <PageSpinner />;

  const signupSeries: ChartPoint[] = summary.growth.signupsLast30d.map((d: any) => ({ label: new Date(d.day).toLocaleDateString(), value: d.count }));
  const volumeSeries: ChartPoint[] = summary.revenue.volumeLast30d.map((d: any) => ({ label: new Date(d.day).toLocaleDateString(), value: d.volume }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Analytics & Reports</h1>
          <p className="text-sm text-text-secondary mt-1">Growth, revenue-equivalent ledger flow, and market performance — 30-day view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportFile('/admin/reports/export/markets', 'markets.csv')}><Download className="w-4 h-4" /> Markets CSV</Button>
          <Button variant="secondary" onClick={() => exportFile('/admin/reports/export/users', 'users.csv')}><Download className="w-4 h-4" /> Users CSV</Button>
          <Button variant="secondary" onClick={() => exportFile('/admin/reports/export/ledger', 'wallet-ledger.csv')}><Download className="w-4 h-4" /> Ledger CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total Stakes" value={`$${summary.revenue.totalStakes.toLocaleString()}`} icon={TrendingUp} />
        <StatTile label="Total Payouts" value={`$${summary.revenue.totalPayouts.toLocaleString()}`} icon={TrendingUp} />
        <StatTile label="Resolved Markets" value={String(summary.marketPerformance.resolvedCount)} icon={Users} />
        <StatTile label="Dispute Rate" value={`${summary.marketPerformance.disputeRate.toFixed(1)}%`} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4">Growth — new signups (30d)</h3>
          <PriceChart data={signupSeries} color="var(--color-secondary)" valuePrefix="" />
        </div>
        <div className="card p-5 border border-border">
          <h3 className="text-base font-semibold mb-4">Volume traded (30d)</h3>
          <PriceChart data={volumeSeries} color="var(--color-primary)" valuePrefix="$" />
        </div>
      </div>

      <div className="card p-5 border border-border">
        <h3 className="text-base font-semibold mb-4">Top markets by volume</h3>
        <div className="space-y-2 text-sm">
          {summary.marketPerformance.topMarkets.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between border-b border-border-light pb-2">
              <Link href={`/admin/markets/${m.id}`} className="hover:text-primary font-medium">{m.title}</Link>
              <span className="font-mono text-text-secondary">${Number(m.totalVolume).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
