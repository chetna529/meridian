'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';

type PublishMode = 'now' | 'draft' | 'scheduled';

export default function CreateMarketPage() {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [category, setCategory] = useState('TECH');
  const [resolutionDate, setResolutionDate] = useState('');
  const [options, setOptions] = useState(['YES', 'NO']);
  const [liquidityParam, setLiquidityParam] = useState(100);
  const [publishMode, setPublishMode] = useState<PublishMode>('now');
  const [publishAt, setPublishAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };
  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (index: number) => setOptions((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return setError('Provide at least two distinct options');
    if (new Set(cleanOptions.map((o) => o.toUpperCase())).size !== cleanOptions.length) return setError('Option labels must be unique');
    if (publishMode === 'scheduled' && !publishAt) return setError('Choose a publish date/time');

    setLoading(true);
    try {
      const res = await api.post('/markets', {
        title,
        description,
        category,
        resolutionDate,
        resolutionCriteria,
        liquidityParam,
        options: cleanOptions.map((optionText) => ({ optionText })),
      });

      if (publishMode === 'now') {
        await api.post(`/markets/${res.data.id}/approve`);
        addToast('Market created and published', 'success');
      } else if (publishMode === 'scheduled') {
        await api.post(`/markets/${res.data.id}/schedule-publish`, { publishAt: new Date(publishAt).toISOString() });
        addToast(`Market created — will publish at ${new Date(publishAt).toLocaleString()}`, 'success');
      } else {
        addToast('Market saved as draft', 'success');
      }

      router.push('/admin/markets');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create market. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Create New Market</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">Trading rules, resolution criteria, and scheduling — set it up once, get it right.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
        {error && <div className="rounded-[var(--radius-md)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 p-4 text-sm text-[var(--color-danger)]">{error}</div>}

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Market Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Example: Will AI write 50% of exam essays by 2027?"
            minLength={8}
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the event context and what's being predicted."
            minLength={20}
            className="mt-2 w-full min-h-[100px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Resolution Criteria</span>
          <textarea
            value={resolutionCriteria}
            onChange={(e) => setResolutionCriteria(e.target.value)}
            placeholder="Exactly how and from what source will this market be resolved? Be unambiguous."
            minLength={10}
            className="mt-2 w-full min-h-[80px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            required
          />
        </label>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]">
              <option value="POLITICS">Politics</option>
              <option value="CRYPTO">Crypto</option>
              <option value="SPORTS">Sports</option>
              <option value="TECH">Tech</option>
              <option value="WEATHER">Weather</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Resolution Date</span>
            <input
              type="date"
              value={resolutionDate}
              onChange={(e) => setResolutionDate(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
              required
            />
          </label>
        </div>

        <div className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Options</span>
          <div className="mt-2 space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                  required
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="p-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add option
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Liquidity parameter (trading depth)</span>
          <input
            type="number"
            min={1}
            value={liquidityParam}
            onChange={(e) => setLiquidityParam(Number(e.target.value))}
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Higher = deeper market, prices move less per trade. Lower = more volatile, moves faster with less volume. 100 is a reasonable default.</p>
        </label>

        <div className="space-y-3">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Publishing</span>
          <div className="grid gap-2">
            {([
              { value: 'now', label: 'Publish immediately', hint: 'Market goes LIVE and is tradeable right away.' },
              { value: 'scheduled', label: 'Schedule publish', hint: 'Save now, automatically go LIVE at a chosen time.' },
              { value: 'draft', label: 'Save as draft', hint: 'Stays in review until an admin approves it manually.' },
            ] as const).map((mode) => (
              <label key={mode.value} className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-4 cursor-pointer transition-colors ${publishMode === mode.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'}`}>
                <input type="radio" name="publishMode" checked={publishMode === mode.value} onChange={() => setPublishMode(mode.value)} className="mt-1" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{mode.label}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{mode.hint}</p>
                </div>
              </label>
            ))}
          </div>
          {publishMode === 'scheduled' && (
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
              required
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={loading}>
            {publishMode === 'now' ? 'Create & Publish' : publishMode === 'scheduled' ? 'Create & Schedule' : 'Save as Draft'}
          </Button>
          <button type="button" onClick={() => router.push('/admin/markets')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
