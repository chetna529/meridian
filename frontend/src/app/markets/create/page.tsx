'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function CreateMarketPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('TECH');
  const [resolutionDate, setResolutionDate] = useState('');
  const [fee, setFee] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user?.isAdmin) {
    return (
      <div className="w-full py-20 text-center">
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="text-sm text-text-secondary mt-3">Only administrators can create new markets.</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/markets', {
        title,
        description,
        category,
        resolutionDate,
        resolutionCriteria: description,
        options: [
          { optionText: 'YES' },
          { optionText: 'NO' }
        ]
      });
      router.push('/admin');
    } catch (err) {
      console.error(err);
      setError('Failed to create market. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Create New Market</h1>
        <p className="text-sm text-text-secondary mt-2">Fill in the market details below to launch a new prediction market.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-border bg-white p-8 shadow-sm">
        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
        <div className="grid gap-6">
          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Market Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Will AI write 50% of exam essays by 2027?"
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event and how the market will resolve."
              className="mt-2 w-full min-h-[140px] rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </label>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="POLITICS">Politics</option>
                <option value="CRYPTO">Crypto</option>
                <option value="SPORTS">Sports</option>
                <option value="TECH">Tech</option>
                <option value="WEATHER">Weather</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">Resolution Date</span>
              <input
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                required
              />
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-slate-50 p-4">
              <p className="text-sm font-semibold text-text-secondary">Creation fee</p>
              <p className="mt-2 text-lg font-semibold">${fee}</p>
              <p className="text-xs text-text-secondary mt-1">A fee is charged when submitting a new market.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Creating...' : 'Create Market'}
          </button>
          <button type="button" onClick={() => router.push('/admin')} className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-text-secondary hover:bg-slate-50">
            Back to Admin
          </button>
        </div>
      </form>
    </div>
  );
}
