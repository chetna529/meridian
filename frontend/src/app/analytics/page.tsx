'use client';

import { useState } from 'react';
import { BarChart3, Sparkles, TrendingUp, Activity } from 'lucide-react';

const analyticsData = {
  price: [48, 56, 63, 72, 68, 74, 80],
  volume: [32, 45, 52, 60, 58, 64, 71],
  users: [22, 30, 36, 42, 38, 47, 53]
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'price' | 'volume' | 'users'>('price');

  return (
    <div className="w-full pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">View market trends, volume, and user activity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('price')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'price' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>Price</button>
            <button onClick={() => setActiveTab('volume')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'volume' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>Volume</button>
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'users' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>Users</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold">{activeTab === 'price' ? 'Price Chart' : activeTab === 'volume' ? 'Volume Chart' : 'User Activity'}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Analyze the latest trends for your selected metric.</p>
              </div>
              <div className="text-[var(--color-primary)]">
                {activeTab === 'price' ? <TrendingUp className="w-6 h-6" /> : activeTab === 'volume' ? <BarChart3 className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
              </div>
            </div>
            <div className="h-72 rounded-3xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 overflow-hidden">
              <div className="h-full flex items-end gap-3">
                {analyticsData[activeTab].map((value, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs text-[var(--color-text-secondary)]">{value}%</span>
                    <div className="w-full rounded-full bg-[var(--color-primary)]" style={{ height: `${Math.max(value, 10)}%` }} />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Analytics Highlights</h3>
            <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
              <div className="rounded-2xl bg-white p-4 border border-[var(--color-border)]">Top market movement this week: Crypto</div>
              <div className="rounded-2xl bg-white p-4 border border-[var(--color-border)]">Highest volume: Finance</div>
              <div className="rounded-2xl bg-white p-4 border border-[var(--color-border)]">Most active traders: 184</div>
              <div className="rounded-2xl bg-white p-4 border border-[var(--color-border)]">Trending category: Sports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
