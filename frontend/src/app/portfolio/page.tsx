'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Activity } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function PortfolioPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    api.get('/predictions/my-predictions')
      .then(res => {
        setPredictions(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        addToast('Failed to load portfolio', 'error');
        setLoading(false);
      });
  }, [isAuthenticated, addToast]);

  if (!isAuthenticated) return <div className="text-center p-20"><p>Please <Link href="/auth/login" className="text-indigo-600 underline">log in</Link> to view your portfolio.</p></div>;
  if (loading) return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>;

  const totalInvested = predictions.reduce((acc, p) => acc + Number(p.amountStaked), 0);
  const winRate = 'N/A (MVP)'; // In a real app we'd calculate this from resolved predictions

  return (
    <div className="w-full pb-20">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8">Portfolio</h1>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card border-l-4 border-l-[var(--color-primary)]">
          <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Total Balance
          </div>
          <div className="text-3xl font-bold text-[var(--color-text-primary)] font-mono">${Number(user?.totalBalance || 0).toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide mb-2">Total Invested</div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] font-mono">${totalInvested.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide mb-2 flex items-center justify-between">
            <span>Win Rate</span>
          </div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] font-mono">{winRate}</div>
        </div>
        <div className="card">
          <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide mb-2">Predictions</div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] font-mono">{predictions.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
              Portfolio Growth
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded bg-gray-50 text-[var(--color-text-muted)]">
            Chart coming soon
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-[var(--color-primary)]" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {predictions.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-4">
                <div>
                  <div className="text-sm font-medium">Predicted {p.option.optionText}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] line-clamp-1">{p.market.title}</div>
                </div>
                <div className="text-sm font-mono text-right text-red-500">
                  -${Number(p.amountStaked).toLocaleString()}
                </div>
              </div>
            ))}
            {predictions.length === 0 && <p className="text-sm text-gray-500">No recent activity.</p>}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="card overflow-hidden !p-0">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg">Your Positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 border-b border-[var(--color-border)]">Market</th>
                <th className="px-6 py-4 border-b border-[var(--color-border)] text-center">Prediction</th>
                <th className="px-6 py-4 border-b border-[var(--color-border)] text-right">Invested</th>
                <th className="px-6 py-4 border-b border-[var(--color-border)] text-right">Potential Return</th>
                <th className="px-6 py-4 border-b border-[var(--color-border)] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {predictions.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--color-text-primary)]">
                    <Link href={`/markets/${p.marketId}`} className="hover:text-[var(--color-primary)]">{p.market.title}</Link>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded text-xs font-bold uppercase">{p.option.optionText}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">${Number(p.amountStaked).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-[var(--color-success)]">${Number(p.potentialReturn).toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs uppercase font-bold text-gray-500">{p.status}</span>
                  </td>
                </tr>
              ))}
              {predictions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">You haven't placed any predictions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
