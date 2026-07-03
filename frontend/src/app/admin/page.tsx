'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { ShieldAlert, Award, BarChart3, FileText, Activity, DollarSign, ShieldCheck, Bell, Settings, UserPlus, Sparkles } from 'lucide-react';

type Market = {
  id: string;
  status?: string;
  totalVotes?: number;
  totalVolume?: string | number;
  category?: string;
  resolutionDate?: string;
  title?: string;
};

type User = {
  id: string;
  isActive?: boolean;
  totalBalance?: number;
  isVerified?: boolean;
  isBlocked?: boolean;
  predictionCount?: number;
  username?: string;
  badgesEarned?: string[];
};

const riskSummary = {
  failedOrders: 7,
  cancelledTrades: 2,
  suspiciousVolumeAlerts: 1,
};

const badgeOptions = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'TOP_TRADER', label: 'Top Trader' },
  { value: 'MARKET_PROPHET', label: 'Market Prophet' },
  { value: 'COMMUNITY_LEAD', label: 'Community Lead' },
  { value: 'RISK_TAKER', label: 'Risk Taker' }
];

export default function AdminPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [selectedBadgeUser, setSelectedBadgeUser] = useState('');
  const [selectedBadgeType, setSelectedBadgeType] = useState('BEGINNER');

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await api.get('/markets');
      setMarkets(res.data);
    } catch (error) {
      console.error(error);
      addToast('Unable to load markets', 'error');
    }
  }, [addToast]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/admin/all');
      setUsers(res.data);
      if (res.data.length) {
        setSelectedBadgeUser(res.data[0].id);
      }
    } catch (error) {
      console.error(error);
      addToast('Unable to load users', 'error');
    } finally {
      setUserLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const loadData = async () => {
      await fetchMarkets();
      await fetchUsers();
    };

    void loadData();
  }, [fetchMarkets, fetchUsers]);


  const handleGrantBadge = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBadgeUser) {
      addToast('Please choose a user for the badge.', 'error');
      return;
    }

    try {
      await api.post(`/users/admin/${selectedBadgeUser}/badges`, { badgeType: selectedBadgeType });
      addToast('Badge granted successfully.', 'success');
      fetchUsers();
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string } } };
      addToast(apiError.response?.data?.error || 'Failed to grant badge', 'error');
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-gray-500 mt-2">You must be logged in as an administrator to view this page.</p>
      </div>
    );
  }

  const activeMarkets = markets.filter((market) => market.status === 'LIVE' || market.status === 'ACTIVE').length;
  const completedMarkets = markets.filter((market) => market.status === 'RESOLVED' || market.status === 'CANCELLED').length;
  const pendingActions = markets.filter((market) => ['PENDING_APPROVAL','DISPUTED','RESOLVING'].includes(market.status ?? '')).length;
  const totalVolume = markets.reduce((sum, market) => sum + Number(market.totalVolume || 0), 0);
  const volumeTrend = [46, 58, 65, 72, 69, 78, 84];
  const userGrowth = [18, 20, 23, 24, 28, 29, 31];

  return (
    <div className="w-full pb-12 pt-16 text-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-5 lg:px-6">
        <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4">
          <aside className="space-y-3 sticky top-16 self-start">
            <div className="rounded-[20px] border border-border bg-white p-3 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold">Admin Menu</h2>
                <p className="text-sm text-text-secondary mt-1">Navigate core admin areas quickly.</p>
              </div>
              <nav className="space-y-2">
                <a href="#overview" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-primary bg-slate-50 shadow-sm"><BarChart3 className="w-4 h-4" /> Overview</a>
                <a href="#users" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><UserPlus className="w-4 h-4" /> Users</a>
                <a href="#markets" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><FileText className="w-4 h-4" /> Markets</a>
                <a href="#trading" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><Activity className="w-4 h-4" /> Trading</a>
                <a href="#finance" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><DollarSign className="w-4 h-4" /> Finance</a>
                <a href="#risk" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><ShieldCheck className="w-4 h-4" /> Risk</a>
                <a href="#notifications" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><Bell className="w-4 h-4" /> Notifications</a>
                <a href="#settings" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"><Settings className="w-4 h-4" /> Settings</a>
              </nav>
            </div>
          </aside>

          <main className="space-y-6">
            <section id="overview" className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-base font-semibold text-text-primary">Admin Dashboard</h1>
                  <p className="text-sm text-text-secondary mt-1">Overview of users, markets, trading, finance, and platform performance.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { fetchMarkets(); fetchUsers(); }} className="btn-secondary px-3 py-2">Refresh Data</button>
                  <button className="btn-primary px-3 py-2">Export Report</button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
                <div className="card p-4 border border-border">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-1">Weekly trading volume</p>
                      <p className="text-lg font-semibold">$1.2M</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">7 days</span>
                  </div>
                  <div className="flex items-end gap-2 h-28">
                    {volumeTrend.map((value, index) => (
                      <div key={index} className="flex-1 rounded-full bg-primary/15" style={{ height: `${value}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] uppercase text-text-secondary">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label) => (
                      <span key={label} className="text-center">{label}</span>
                    ))}
                  </div>
                </div>

                <div className="card p-4 border border-border">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-1">User growth</p>
                      <p className="text-lg font-semibold">+26%</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">relative</span>
                  </div>
                  <div className="flex items-end gap-2 h-28">
                    {userGrowth.map((value, index) => (
                      <div key={index} className="flex-1 rounded-full bg-primary/15" style={{ height: `${value}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] uppercase text-text-secondary">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label) => (
                      <span key={label} className="text-center">{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Total Users</p>
                  <p className="text-lg font-semibold">{users.length}</p>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Active Markets</p>
                  <p className="text-lg font-semibold">{activeMarkets}</p>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Completed Markets</p>
                  <p className="text-lg font-semibold">{completedMarkets}</p>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Trading Volume</p>
                  <p className="text-lg font-semibold">${totalVolume.toLocaleString()}</p>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-2">Pending Actions</p>
                  <p className="text-lg font-semibold">{pendingActions}</p>
                </div>
              </div>
            </section>

            <section id="markets" className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Market Management</h2>
                  <p className="text-sm text-text-secondary">Approve, review, and manage market lifecycle events.</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{markets.length} markets</span>
              </div>

              <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
                <div className="card p-4 border border-border">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-semibold">Market Status Summary</h3>
                      <p className="text-sm text-text-secondary">At-a-glance status for your live markets.</p>
                    </div>
                    <div>
                      <Link href="/markets/create" className="inline-flex items-center rounded-lg bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200 transition-colors">
                        Create Market
                      </Link>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm text-text-secondary">
                    <div className="flex justify-between"><span>Total markets</span><span>{markets.length}</span></div>
                    <div className="flex justify-between"><span>Active</span><span>{activeMarkets}</span></div>
                    <div className="flex justify-between"><span>Completed</span><span>{completedMarkets}</span></div>
                    <div className="flex justify-between"><span>Pending approval</span><span>{markets.filter((m) => m.status === 'PENDING_APPROVAL').length}</span></div>
                    <div className="flex justify-between"><span>Disputed / resolving</span><span>{markets.filter((m) => ['DISPUTED','RESOLVING'].includes(m.status ?? '')).length}</span></div>
                  </div>
                </div>

                <div className="card p-4 border border-border">
                  <h3 className="text-base font-semibold mb-3">Top Pending Reviews</h3>
                  {pendingActions === 0 ? (
                    <p className="text-sm text-text-secondary">No outstanding review actions.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {markets.filter((market) => ['PENDING_APPROVAL','DISPUTED','RESOLVING'].includes(market.status ?? '')).slice(0, 4).map((market) => (
                        <div key={market.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold truncate max-w-[34ch]">{market.title}</p>
                            <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{market.status}</span>
                          </div>
                          <p className="text-xs text-text-secondary">{market.category} • {market.resolutionDate ? new Date(market.resolutionDate).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold">Recent Markets</h3>
                    <p className="text-sm text-text-secondary">Quick access to recently created and active markets.</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{markets.length} total</span>
                </div>
                <div className="space-y-3">
                  {markets.slice(0, 4).map((market) => (
                    <div key={market.id} className="rounded-2xl border border-border bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary truncate">{market.title}</p>
                          <p className="text-xs text-text-secondary mt-1">{market.category} • {market.resolutionDate ? new Date(market.resolutionDate).toLocaleDateString() : 'No date'}</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{market.status || 'Unknown'}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-border bg-white px-2 py-1 text-text-secondary">Volume: ${Number(market.totalVolume || 0).toLocaleString()}</span>
                        <span className="rounded-full border border-border bg-white px-2 py-1 text-text-secondary">Votes: {market.totalVotes ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                  {markets.length === 0 && <p className="text-sm text-text-secondary">No markets available yet.</p>}
                </div>
              </div>
            </section>

            <section id="trading" className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Trading Overview</h2>
                  <p className="text-sm text-text-secondary">Monitor volume, orders, and suspicious activity.</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">Live feed</span>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <div className="card p-4 border border-border">
                  <h3 className="text-base font-semibold mb-3">Live trade summary</h3>
                  <p className="text-sm text-text-secondary">Example feed of recent buy/sell activity.</p>
                  <div className="mt-4 space-y-3 text-sm text-text-secondary">
                    <div className="rounded-lg border border-border p-3 bg-slate-50">User A bought YES 100 shares — Price $0.72</div>
                    <div className="rounded-lg border border-border p-3 bg-slate-50">User B sold NO 50 shares — Price $0.39</div>
                    <div className="rounded-lg border border-border p-3 bg-slate-50">User C placed order for YES at limit $0.68</div>
                  </div>
                </div>

                <div className="card p-4 border border-border">
                  <h3 className="text-base font-semibold mb-3">Order & transaction risk</h3>
                  <div className="space-y-3 text-sm text-text-secondary">
                    <div className="flex justify-between"><span>Failed orders</span><span>{riskSummary.failedOrders}</span></div>
                    <div className="flex justify-between"><span>Cancelled trades</span><span>{riskSummary.cancelledTrades}</span></div>
                    <div className="flex justify-between"><span>Suspicious volume alerts</span><span>{riskSummary.suspiciousVolumeAlerts}</span></div>
                  </div>
                </div>
              </div>
            </section>

            <section id="finance" className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Finance & Wallets</h2>
                  <p className="text-sm text-text-secondary">Track deposits, withdrawals, fees, and revenue.</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">Revenue</span>
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-3">Platform revenue</p>
                  <p className="text-lg font-semibold">$120K</p>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-3">Total deposits</p>
                  <p className="text-lg font-semibold">$3.2M</p>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-3">Total withdrawals</p>
                  <p className="text-lg font-semibold">$1.1M</p>
                </div>
              </div>
            </section>

            <section id="risk" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Risk & Fraud</h2>
                  <p className="text-sm text-text-secondary">Alerts and unusual behavior detection.</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">Alerts</span>
              </div>

              <div className="card p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Suspicious activity</h3>
                    <p className="text-sm text-text-secondary">User risk, account anomalies, and concentration warnings.</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="rounded-lg border border-border p-3 bg-slate-50">Alert: Single user controls 45% of YES shares on high-volume crypto market.</div>
                  <div className="rounded-lg border border-border p-3 bg-slate-50">Alert: Multiple accounts trading from same IP address.</div>
                </div>
              </div>
            </section>

            <section id="notifications" className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Notifications</h2>
                  <p className="text-sm text-text-secondary">Send announcements and platform alerts.</p>
                </div>
                <Bell className="w-5 h-5 text-primary" />
              </div>

              <div className="card p-4 border border-border">
                <p className="text-sm text-text-secondary mb-4">Example messages</p>
                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="rounded-lg border border-border p-3 bg-slate-50">New election market available.</div>
                  <div className="rounded-lg border border-border p-3 bg-slate-50">Market closes in 24 hours.</div>
                </div>
              </div>
            </section>

            <section id="settings" className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Platform Settings</h2>
                  <p className="text-sm text-text-secondary">Manage fees, limits, and maintenance mode.</p>
                </div>
                <Settings className="w-5 h-5 text-primary" />
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-3">Fee settings</p>
                  <div className="space-y-3 text-sm text-text-secondary">
                    <div className="flex justify-between"><span>Trading fee</span><span>2.5%</span></div>
                    <div className="flex justify-between"><span>Withdrawal fee</span><span>0.5%</span></div>
                    <div className="flex justify-between"><span>Market creation fee</span><span>$12</span></div>
                  </div>
                </div>
                <div className="card p-4 border border-border">
                  <p className="text-sm text-text-secondary uppercase tracking-[0.16em] mb-3">Maintenance</p>
                  <div className="space-y-3 text-sm text-text-secondary">
                    <div className="flex justify-between"><span>Trading limits</span><span>Enabled</span></div>
                    <div className="flex justify-between"><span>Minimum deposit</span><span>$50</span></div>
                    <div className="flex justify-between"><span>Maintenance mode</span><span className="text-emerald-700">Off</span></div>
                  </div>
                </div>
              </div>
            </section>

            <section id="users" className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">User Management</h2>
                  <p className="text-sm text-text-secondary">Search, review, and manage user accounts.</p>
                </div>
                <UserPlus className="w-5 h-5 text-primary" />
              </div>

              <div className="card p-4 border border-border">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Active users</p>
                    <p className="mt-2 text-lg font-semibold">{users.filter((u) => u.isActive !== false).length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Average balance</p>
                    <p className="mt-2 text-lg font-semibold">${users.length ? (users.reduce((sum, u) => sum + Number(u.totalBalance || 0), 0) / users.length).toFixed(2) : '0.00'}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Verified accounts</p>
                    <p className="mt-2 text-lg font-semibold">{users.filter((u) => u.isVerified).length || 0}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Blocked users</p>
                    <p className="mt-2 text-lg font-semibold">{users.filter((u) => u.isBlocked).length || 0}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="card p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">User Analytics & Badges</h2>
                    <p className="text-sm text-text-secondary">Award badges and review top accounts.</p>
                  </div>
                  <Award className="w-6 h-6 text-primary" />
                </div>

                {userLoading ? (
                  <p>Loading users...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-text-secondary">Total users</p>
                        <p className="mt-2 text-lg font-semibold">{users.length}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-text-secondary">Most active</p>
                        <p className="mt-2 text-lg font-semibold">{users.reduce((acc, u) => Math.max(acc, u.predictionCount || 0), 0)}</p>
                      </div>
                    </div>

                    <form onSubmit={handleGrantBadge} className="space-y-4 border border-border rounded-lg p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="block text-sm font-medium text-text-secondary">Select User</span>
                          <select value={selectedBadgeUser} onChange={(e) => setSelectedBadgeUser(e.target.value)} className="w-full p-2 border border-border rounded">
                            {users.map((userItem) => (
                              <option key={userItem.id} value={userItem.id}>{userItem.username}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="block text-sm font-medium text-text-secondary">Badge Type</span>
                          <select value={selectedBadgeType} onChange={(e) => setSelectedBadgeType(e.target.value)} className="w-full p-2 border border-border rounded">
                            {badgeOptions.map((badge) => (
                              <option key={badge.value} value={badge.value}>{badge.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button type="submit" className="btn-primary py-2 px-4">Grant Badge</button>
                    </form>

                    <div className="space-y-3">
                      {users.slice(0, 6).map((userItem) => (
                        <div key={userItem.id} className="rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div>
                              <p className="font-semibold truncate max-w-[30ch]">{userItem.username}</p>
                              <p className="text-xs text-text-secondary">Balance: ${Number(userItem.totalBalance || 0).toFixed(2)}</p>
                            </div>
                            <span className="text-xs text-text-secondary">{userItem.predictionCount} predictions</span>
                          </div>
                          <div className="text-sm text-text-secondary">
                            Badges: {userItem.badgesEarned?.length ? userItem.badgesEarned.join(', ') : 'None'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
