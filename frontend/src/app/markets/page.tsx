'use client';
import Link from 'next/link';
import { Search, TrendingUp, MoreHorizontal } from 'lucide-react';
import { useEffect, useState, useRef, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

type MarketOption = {
  id: string;
  optionText: string;
  percentage?: number;
  totalStaked?: number | string;
};

type Market = {
  id: string;
  status?: string;
  title: string;
  description?: string;
  category?: string;
  resolutionDate?: string;
  totalVolume?: number | string;
  yesPercentage?: number;
  noPercentage?: number;
  options?: MarketOption[];
};

export default function MarketsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Custom modal state and toast support
  const [votedMarketData, setVotedMarketData] = useState<{ marketTitle: string; choiceText: string } | null>(null);
  const [userPredictions, setUserPredictions] = useState<any[]>([]);
  const addToast = useUIStore(state => state.addToast);

  const fetchUserPredictions = () => {
    if (!isAuthenticated) return;
    api.get('/predictions/my-predictions')
      .then(res => {
        setUserPredictions(res.data);
      })
      .catch(console.error);
  };

  const fetchMarkets = () => {
    api.get('/markets')
      .then(res => {
        setMarkets(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchMarkets();
    fetchUserPredictions();
    const interval = setInterval(() => {
      fetchMarkets();
      fetchUserPredictions();
    }, 10000); // Auto refresh every 10 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const categories = ['ALL', 'POLITICS', 'CRYPTO', 'SPORTS', 'TECH', 'WEATHER'];

  const filteredMarkets = markets.filter(market => {
    const searchText = searchQuery.toLowerCase();
    const matchesSearch = market.title.toLowerCase().includes(searchText) || 
      market.description?.toLowerCase().includes(searchText);
    const matchesCategory = selectedCategory === 'ALL' || market.category?.toUpperCase() === selectedCategory;
    return Boolean(matchesSearch) && Boolean(matchesCategory);
  });

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">You must sign up or log in to explore markets.</p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
          <Link href="/auth/register" className="btn-secondary py-3 px-6 bg-white">Sign Up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 md:px-6 lg:px-8 pt-8">
      <div className="w-full">
        {/* Header and Controls container */}
        <div className="flex flex-col mb-8 w-full">
          <div className="mb-4 text-left">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Markets</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Browse live and upcoming markets or manage your admin controls.</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-[var(--color-primary)] text-white' 
                      : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-light)]'
                  }`}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 w-full md:w-auto">
              {user?.isAdmin && (
                <Link href="/admin/markets/create" className="inline-flex items-center rounded-lg bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200 transition-colors">
                  Create Market
                </Link>
              )}
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search markets..." 
                  className="pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm w-full focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {filteredMarkets.map(market => (
            <MarketCard 
              key={market.id}
              id={market.id} 
              title={market.title} 
              description={market.description}
              category={market.category || 'General'}
              status={market.status}
              resolutionDate={market.resolutionDate}
              yes={market.yesPercentage || 50}
              no={market.noPercentage || 50}
              volume={Number(market.totalVolume).toLocaleString()} 
              options={market.options}
              isAdmin={Boolean(user?.isAdmin)}
              hasVoted={userPredictions.some(p => p.marketId === market.id)}
              onDelete={() => {
                api.delete(`/markets/${market.id}`)
                  .then(() => setMarkets((current) => current.filter((item) => item.id !== market.id)))
                  .catch((error) => console.error(error));
              }}
              onVoteSuccess={(marketTitle, choiceText) => {
                setVotedMarketData({ marketTitle, choiceText });
                fetchMarkets(); // Refresh odds immediately on vote
                fetchUserPredictions(); // Refresh user predictions immediately
              }}
              onVoteError={(errorMsg) => {
                addToast(errorMsg, 'error');
              }}
            />
          ))}
          {filteredMarkets.length === 0 && <p className="text-[var(--color-text-muted)] col-span-full py-4 text-center">No markets match your criteria.</p>}
        </div>
      )}

      {/* Center Success Modal Popup */}
      {votedMarketData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-backdrop-animate">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl relative transform transition-all duration-300 scale-100 modal-card-animate">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-[var(--color-primary)] rounded-t-2xl"></div>
            
            <div className="mx-auto w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-900/50">
              <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">Vote Submitted Successfully!</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Your prediction has been recorded. The market odds and order book have updated in real time.
            </p>

            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 mb-8 text-left">
              <div className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-2">Market Details</div>
              <div className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                {votedMarketData.marketTitle}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-4">
                <span className="text-sm text-[var(--color-text-secondary)]">Your Staged Vote</span>
                <span className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider text-white ${
                  votedMarketData.choiceText === 'YES' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'
                }`}>
                  {votedMarketData.choiceText}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVotedMarketData(null)}
              className="w-full bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketCard({ 
  id, 
  title, 
  description, 
  category, 
  status, 
  resolutionDate, 
  yes, 
  no, 
  volume, 
  options, 
  isAdmin, 
  onDelete, 
  onVoteSuccess, 
  onVoteError,
  hasVoted
}: { 
  id: string; 
  title: string; 
  description?: string; 
  category: string; 
  status?: string; 
  resolutionDate?: string; 
  yes: number; 
  no: number; 
  volume: string; 
  options?: MarketOption[]; 
  isAdmin?: boolean; 
  onDelete?: () => void; 
  onVoteSuccess?: (marketTitle: string, choiceText: string) => void; 
  onVoteError?: (errorMsg: string) => void; 
  hasVoted?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClose = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, [menuOpen]);

  const yesOption = options?.find(opt => opt.optionText.toUpperCase().includes('YES'));
  const noOption = options?.find(opt => opt.optionText.toUpperCase().includes('NO'));

  const handleVote = async (optionId: string) => {
    const payload = { marketId: id, optionId, amount: 10 };
    console.debug('Submitting prediction:', payload);
    try {
      const res = await api.post('/predictions', payload);
      console.debug('Prediction response:', res.data);
      const choiceText = optionId === yesOption?.id ? 'YES' : 'NO';
      onVoteSuccess?.(title, choiceText);
    } catch (err: any) {
      console.error('Prediction error:', err.response?.data || err);
      const msg = err.response?.data?.error || err.message || 'Unable to submit vote.';
      onVoteError?.(msg);
    }
  };

  return (
    <div className="card relative overflow-hidden p-4 group hover:-translate-y-1 transition-transform duration-200 min-h-[340px] flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
            {category}
          </span>
          {status && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {status}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {isAdmin && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                aria-label="Market actions"
                className="rounded-md p-1 -mr-1 text-[var(--color-text-secondary)] hover:bg-slate-100"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 w-44 rounded-2xl border border-border bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      router.push(`/markets/${id}`);
                    }}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-slate-100"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      if (!window.confirm('Delete this market? This action cannot be undone.')) {
                        return;
                      }
                      onDelete?.();
                    }}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete market
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <TrendingUp className="w-4 h-4" />
            ${volume}
          </div>
        </div>
      </div>

      <Link href={`/markets/${id}`} className="group flex h-full flex-col justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors">
            {title}
          </h3>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)] line-clamp-3">
            {description || 'No additional details available yet.'}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {resolutionDate && (
            <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">
              Resolution: {new Date(resolutionDate).toLocaleDateString()}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Volume</span>
            <span>${volume}</span>
          </div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-sm font-medium text-[var(--color-success)]">Yes {yes.toFixed(1)}%</span>
            <span className="text-sm font-medium text-[var(--color-danger)]">No {no.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden flex">
            <div className="h-full bg-[var(--color-success)]" style={{ width: `${yes}%` }}></div>
            <div className="h-full bg-[var(--color-danger)]" style={{ width: `${no}%` }}></div>
          </div>

          {hasVoted ? (
            <div className="w-full text-center py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] mt-4">
              🔒 Prediction Locked (Voted)
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                disabled={!yesOption || status !== 'LIVE'}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); yesOption && handleVote(yesOption.id); }}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vote Yes
              </button>
              <button
                type="button"
                disabled={!noOption || status !== 'LIVE'}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); noOption && handleVote(noOption.id); }}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vote No
              </button>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
