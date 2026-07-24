'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { PlusCircle, FileBarChart, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Market = {
  id: string;
  status?: string;
  totalVolume?: string | number;
  category?: string;
  resolutionDate?: string;
  title?: string;
};

export default function AdminOperationsDashboard() {
  const { addToast } = useUIStore();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [disputeCount, setDisputeCount] = useState(0);
  const [fraudCount, setFraudCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [trends, setTrends] = useState<{ volumeTrend: any[]; signupTrend: any[] }>({ volumeTrend: [], signupTrend: [] });

  const refreshAll = useCallback(async () => {
    try {
      const [marketsRes, usersRes, disputesRes, fraudRes, activityRes, trendsRes] = await Promise.all([
        api.get('/markets'),
        api.get('/users/admin/all'),
        api.get('/admin/disputes', { params: { status: 'OPEN' } }),
        api.get('/admin/fraud-flags', { params: { status: 'OPEN' } }),
        api.get('/admin/recent-activity'),
        api.get('/admin/overview-trends'),
      ]);
      setMarkets(marketsRes.data);
      setUserCount(usersRes.data.length);
      setDisputeCount(disputesRes.data.length);
      setFraudCount(fraudRes.data.length);
      setRecentActivity(activityRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error(error);
      addToast('Unable to load dashboard data', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    void refreshAll();
    const interval = setInterval(refreshAll, 20000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const activeMarkets = markets.filter((m) => m.status === 'LIVE').length;
  const completedMarkets = markets.filter((m) => m.status === 'RESOLVED').length;
  const pendingApprovalCount = markets.filter((m) => ['DRAFT', 'PENDING_APPROVAL'].includes(m.status ?? '')).length;
  const awaitingResolutionCount = markets.filter((m) => ['LOCKED', 'RESOLVING'].includes(m.status ?? '')).length;
  const totalVolume = markets.reduce((sum, m) => sum + Number(m.totalVolume || 0), 0);

  const weeklyVolume = trends.volumeTrend.reduce((sum, d) => sum + Number(d.volume || 0), 0);
  const weeklySignups = trends.signupTrend.reduce((sum, d) => sum + Number(d.count || 0), 0);
  const maxVolumeDay = Math.max(1, ...trends.volumeTrend.map((d) => Number(d.volume || 0)));
  const maxSignupDay = Math.max(1, ...trends.signupTrend.map((d) => Number(d.count || 0)));
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const volumeByDay = last7Days.map((day) => Number(trends.volumeTrend.find((d) => String(d.day).slice(0, 10) === day)?.volume || 0));
  const signupsByDay = last7Days.map((day) => Number(trends.signupTrend.find((d) => String(d.day).slice(0, 10) === day)?.count || 0));

  const chartDataVolume = last7Days.map((day) => ({
    label: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
    value: Number(trends.volumeTrend.find((d) => String(d.day).slice(0, 10) === day)?.volume || 0),
  }));

  const chartDataSignups = last7Days.map((day) => ({
    label: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
    value: Number(trends.signupTrend.find((d) => String(d.day).slice(0, 10) === day)?.count || 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Operations Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Everything happening on the platform, at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshAll} className="btn-secondary px-3 py-2">Refresh</button>
          <Link href="/admin/markets/create" className="btn-primary px-3 py-2 inline-flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> Create Market</Link>
          <Link href="/admin/reports" className="btn-secondary px-3 py-2 inline-flex items-center gap-1.5"><FileBarChart className="w-4 h-4" /> Reports</Link>
          <Link href="/admin/notifications" className="btn-secondary px-3 py-2 inline-flex items-center gap-1.5"><Bell className="w-4 h-4" /> Notify</Link>
        </div>
      </div>

      {/* Attention strip — the highest-priority "what needs me right now" view */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/admin/markets?status=PENDING_APPROVAL" className="card p-4 border border-border hover:border-primary transition-colors block">
          <p className="text-xs text-text-secondary uppercase tracking-[0.16em] mb-1">Pending Approval</p>
          <p className={`text-2xl font-bold ${pendingApprovalCount > 0 ? 'text-[var(--color-warning)]' : 'text-text-primary'}`}>{pendingApprovalCount}</p>
        </Link>
        <Link href="/admin/markets?status=LOCKED" className="card p-4 border border-border hover:border-primary transition-colors block">
          <p className="text-xs text-text-secondary uppercase tracking-[0.16em] mb-1">Awaiting Resolution</p>
          <p className={`text-2xl font-bold ${awaitingResolutionCount > 0 ? 'text-[var(--color-warning)]' : 'text-text-primary'}`}>{awaitingResolutionCount}</p>
        </Link>
        <Link href="/admin/disputes" className="card p-4 border border-border hover:border-primary transition-colors block">
          <p className="text-xs text-text-secondary uppercase tracking-[0.16em] mb-1">Open Disputes</p>
          <p className={`text-2xl font-bold ${disputeCount > 0 ? 'text-[var(--color-danger)]' : 'text-text-primary'}`}>{disputeCount}</p>
        </Link>
        <Link href="/admin/risk" className="card p-4 border border-border hover:border-primary transition-colors block">
          <p className="text-xs text-text-secondary uppercase tracking-[0.16em] mb-1">Open Fraud Flags</p>
          <p className={`text-2xl font-bold ${fraudCount > 0 ? 'text-[var(--color-danger)]' : 'text-text-primary'}`}>{fraudCount}</p>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-4 border border-border min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-1">Trading volume</p>
              <p className="text-lg font-semibold">${weeklyVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">7 days</span>
          </div>
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartDataVolume} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-muted)' }} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Volume']}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 border border-border min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-1">New signups</p>
              <p className="text-lg font-semibold">{weeklySignups}</p>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">7 days</span>
          </div>
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartDataSignups} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-muted)' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} Signups`, 'Signups']}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="card p-4 border border-border">
          <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Total Users</p>
          <p className="text-lg font-semibold">{userCount}</p>
        </div>
        <div className="card p-4 border border-border">
          <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Live Markets</p>
          <p className="text-lg font-semibold">{activeMarkets}</p>
        </div>
        <div className="card p-4 border border-border">
          <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Resolved Markets</p>
          <p className="text-lg font-semibold">{completedMarkets}</p>
        </div>
        <div className="card p-4 border border-border">
          <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">All-Time Volume</p>
          <p className="text-lg font-semibold">${totalVolume.toLocaleString()}</p>
        </div>
        <div className="card p-4 border border-border">
          <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Total Markets</p>
          <p className="text-lg font-semibold">{markets.length}</p>
        </div>
      </div>

      <div className="card p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Live activity</h3>
          <Link href="/admin/markets" className="text-xs font-semibold text-primary hover:underline">Manage markets →</Link>
        </div>
        <div className="space-y-3 text-sm text-text-secondary max-h-80 overflow-y-auto">
          {recentActivity.length === 0 && <p className="text-text-muted">No trades yet.</p>}
          {recentActivity.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-3 bg-[var(--color-bg-secondary)] flex items-center justify-between gap-2">
              <span><strong>{p.user?.username}</strong> staked ${Number(p.amountStaked).toLocaleString()} on <strong>{p.option?.optionText}</strong> — {p.market?.title}</span>
              <span className="text-xs text-text-muted flex-shrink-0">{new Date(p.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
