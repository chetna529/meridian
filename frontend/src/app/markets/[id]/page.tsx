'use client';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, TrendingUp, Users, Sparkles, ShieldAlert, FileCheck, Gavel } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import socket, { joinMarketRoom, leaveMarketRoom } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Badge, { marketStatusTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PriceChart, { ChartPoint } from '@/components/ui/PriceChart';
import Modal from '@/components/ui/Modal';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params?.id as string | undefined;
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | ''>(100);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const { isAuthenticated, user, updateBalance } = useAuthStore();
  const { addToast } = useUIStore();
  const [aiTab, setAiTab] = useState<'insights' | 'chat'>('insights');

  useEffect(() => {
    if (!isAuthenticated || !marketId) {
      setLoading(false);
      return;
    }

    api.get(`/markets/${marketId}`)
      .then(res => {
        setMarket(res.data);
        if (res.data.options && res.data.options.length > 0) {
          setSelectedOption(res.data.options[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    joinMarketRoom(marketId);

    const onOddsUpdated = (data: any) => {
      if (data.marketId !== marketId) return;
      setMarket((prev: any) => {
        if (!prev) return prev;
        const options = prev.options.map((opt: any) => ({
          ...opt,
          percentage: data.prices?.[opt.id] != null ? data.prices[opt.id] * 100 : opt.percentage,
        }));
        return { ...prev, options, totalVolume: data.totalVolume ?? prev.totalVolume };
      });
    };
    const onResolved = () => api.get(`/markets/${marketId}`).then(res => setMarket(res.data)).catch(() => {});
    const onDisputed = () => api.get(`/markets/${marketId}`).then(res => setMarket(res.data)).catch(() => {});

    socket.on('odds-updated', onOddsUpdated);
    socket.on('market-resolved', onResolved);
    socket.on('market-disputed', onDisputed);
    socket.on('market-locked', onResolved);

    return () => {
      leaveMarketRoom(marketId);
      socket.off('odds-updated', onOddsUpdated);
      socket.off('market-resolved', onResolved);
      socket.off('market-disputed', onDisputed);
      socket.off('market-locked', onResolved);
    };
  }, [isAuthenticated, marketId]);

  const estimatedShares = useMemo(() => {
    if (!selectedOption || !amount) return 0;
    const price = Math.max(Number(selectedOption.percentage || 50) / 100, 0.01);
    return Number(amount) / price;
  }, [selectedOption, amount]);

  const handleSubmitPrediction = async () => {
    if (!isAuthenticated) return addToast('Please login first', 'error');
    if (user && !user.isEmailVerified) {
      return addToast('Please verify your email address to place predictions.', 'error');
    }
    if (!selectedOption || !amount || amount <= 0) return addToast('Select an option and amount', 'error');

    try {
      const res = await api.post('/predictions', {
        marketId: market.id,
        optionId: selectedOption.id,
        amount: Number(amount)
      });
      addToast('Prediction submitted successfully!', 'success');
      updateBalance(res.data.userBalance);
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to submit prediction', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Please log in or sign up to view market details.</p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
          <Link href="/auth/register" className="btn-secondary py-3 px-6">Sign Up</Link>
        </div>
      </div>
    );
  }

  if (!marketId) return <div className="text-center p-20">Invalid market ID.</div>;
  if (loading) return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!market) return <div className="text-center p-20">Market not found.</div>;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 xl:px-12 pt-8 pb-20">
      <div className="flex items-center justify-start mb-10 w-full">
        <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Market Info */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                {market.category}
              </span>
              <Badge tone={marketStatusTone(market.status)}>{market.status}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-4 leading-tight">{market.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /><span>${Number(market.totalVolume).toLocaleString()} Vol</span></div>
              <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /><span>{market.totalPredictions} Predictions</span></div>
              {market.resolutionDate && (
                <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>Resolves {new Date(market.resolutionDate).toLocaleDateString()}</span></div>
              )}
            </div>
          </div>

          {market.resolution && (
            <div className="card p-6 border-l-4 border-l-[var(--color-info)]">
              <h3 className="text-base font-bold mb-3 flex items-center gap-2"><FileCheck className="w-4 h-4 text-[var(--color-info)]" /> Resolution</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">{market.resolution.notes}</p>
              <a href={market.resolution.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-primary)] hover:underline break-all">
                {market.resolution.sourceUrl}
              </a>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">Resolved by {market.resolution.resolvedBy?.username} on {new Date(market.resolution.resolvedAt).toLocaleString()}</p>
              {market.status === 'RESOLVED' && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setDisputeOpen(true)}>
                  <Gavel className="w-3.5 h-3.5" /> Raise a dispute
                </Button>
              )}
            </div>
          )}

          {/* AI Features Section */}
          <div className="card p-6">
            <div className="flex gap-4 border-b border-[var(--color-border)] mb-4">
              <button onClick={() => setAiTab('insights')} className={`pb-2 font-bold text-sm ${aiTab === 'insights' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                <Sparkles className="w-4 h-4 inline mr-1" /> AI Insights
              </button>
              <button onClick={() => setAiTab('chat')} className={`pb-2 font-bold text-sm ${aiTab === 'chat' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                AI Assistant
              </button>
            </div>
            {aiTab === 'insights' ? <AIInsights marketId={market.id} /> : <AIChatbot marketId={market.id} />}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Price History</h3>
            <MarketPriceChart marketId={market.id} options={market.options} />
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-[var(--color-border-light)] pb-2">About this Market</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">{market.description}</p>
            <h3 className="text-lg font-bold mb-4 border-b border-[var(--color-border-light)] pb-2">Resolution Criteria</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{market.resolutionCriteria || 'Not specified.'}</p>
          </div>

          {/* Comments Section */}
          <MarketComments marketId={market.id} />
        </div>

        {/* Right Column: Prediction Slip */}
        <div className="lg:col-span-4">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6 text-center">Place Prediction</h2>

            <div className="flex items-center justify-between mb-8 gap-4">
              {market.options?.map((opt: any) => (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOption(opt)}
                  className={`text-center p-4 rounded-[var(--radius-md)] border flex-1 cursor-pointer transition-colors ${
                    selectedOption?.id === opt.id
                      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                >
                  <div className="font-bold text-xl mb-1">{opt.optionText}</div>
                  <div className="text-xs font-semibold text-[var(--color-text-muted)]">{Number(opt.percentage ?? 50).toFixed(1)}% · ${Number(opt.totalStaked).toLocaleString()} Pool</div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Amount (Points)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-mono">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-4 py-3 border border-[var(--color-border)] rounded-[var(--radius-sm)] text-lg font-mono bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)] p-4 rounded-[var(--radius-md)] mb-6 border border-[var(--color-border-light)]">
              <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                <span>Est. shares</span>
                <span className="font-mono">{estimatedShares.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-[var(--color-border-light)]">
                <span>Max payout if correct</span>
                <span className="text-[var(--color-success)] font-mono">${estimatedShares.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitPrediction}
              disabled={market.status !== 'LIVE'}
              className={`w-full font-bold py-4 rounded-[var(--radius-md)] shadow-sm transition-colors active:scale-95 ${
                market.status === 'LIVE'
                  ? (user && !user.isEmailVerified)
                    ? 'bg-[var(--color-warning)] text-white hover:bg-[color-mix(in_srgb,var(--color-warning)_90%,black)]'
                    : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
              }`}
            >
              {market.status === 'LIVE'
                ? (user && !user.isEmailVerified)
                  ? 'Verify Email to Predict'
                  : 'Submit Prediction'
                : `Market ${market.status.replace('_', ' ')}`}
            </button>
          </div>
        </div>

      </div>

      <DisputeModal open={disputeOpen} onClose={() => setDisputeOpen(false)} marketId={market.id} />
    </div>
  );
}

function MarketPriceChart({ marketId, options }: { marketId: string; options: any[] }) {
  const [range, setRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    api.get(`/markets/${marketId}/price-history`, { params: { range } })
      .then(res => {
        const byOption = res.data;
        const firstOptionId = options?.[0]?.id;
        const series = firstOptionId && byOption[firstOptionId] ? byOption[firstOptionId].points : [];
        setData(series.map((p: any) => ({ label: new Date(p.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: Number(p.price) * 100 })));
      })
      .catch(() => setData([]));
  }, [marketId, range, options]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
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
      <PriceChart data={data} valuePrefix="" color="var(--color-primary)" />
    </div>
  );
}

function DisputeModal({ open, onClose, marketId }: { open: boolean; onClose: () => void; marketId: string }) {
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useUIStore();

  const submit = async () => {
    if (!reason.trim()) return addToast('A reason is required', 'error');
    setSubmitting(true);
    try {
      await api.post(`/markets/${marketId}/disputes`, { reason, evidenceUrl: evidenceUrl || undefined });
      addToast('Dispute filed for review', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to file dispute', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Raise a dispute">
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Reason</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Evidence URL (optional)</span>
          <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface)]" />
        </label>
        <Button onClick={submit} loading={submitting} className="w-full">Submit Dispute</Button>
      </div>
    </Modal>
  );
}

function MarketComments({ marketId }: { marketId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const fetchComments = () => {
    api.get(`/markets/${marketId}/comments`)
      .then(res => setComments(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchComments();
  }, [marketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return addToast('Please login to comment', 'error');
    if (!newComment.trim()) return;

    try {
      await api.post(`/markets/${marketId}/comments`, { text: newComment });
      setNewComment('');
      fetchComments();
    } catch (err) {
      addToast('Failed to post comment', 'error');
    }
  };

  return (
    <div className="card p-6 mt-6">
      <h3 className="text-lg font-bold mb-6 border-b border-[var(--color-border-light)] pb-2">Discussion ({comments.length})</h3>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your insights..."
            className="w-full p-3 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow mb-3"
            rows={3}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary py-2 px-6 text-sm">Post Comment</button>
          </div>
        </form>
      ) : (
        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-[var(--radius-md)] text-center mb-8 border border-[var(--color-border-light)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Join the conversation to share your insights.</p>
          <Link href="/auth/login" className="text-sm font-bold text-[var(--color-primary)] hover:underline">Log In to Comment</Link>
        </div>
      )}

      <div className="space-y-6">
        {comments.map(c => (
          <div key={c.id} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex-shrink-0 flex items-center justify-center font-bold">
              {c.user.username.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[var(--color-text-primary)] text-sm">{c.user.username}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{c.text}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No comments yet. Be the first!</p>}
      </div>
    </div>
  );
}

function AIInsights({ marketId }: { marketId: string }) {
  const [data, setData] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/ai/summarize-market/${marketId}`).catch(() => null),
      api.get(`/ai/risk-analysis/${marketId}`).catch(() => null),
    ]).then(([summaryRes, riskRes]) => {
      setData(summaryRes?.data || null);
      setRisk(riskRes?.data || null);
      setLoading(false);
    });
  }, [marketId]);

  if (loading) return <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">Generating AI Insights...</div>;
  if (!data) return <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">Failed to load AI Insights.</div>;

  return (
    <div className="bg-[var(--color-primary)]/5 p-6 rounded-[var(--radius-md)] border border-[var(--color-primary)]/15">
      <p className="text-[var(--color-text-secondary)] text-sm mb-6 leading-relaxed whitespace-pre-wrap">{data.summary}</p>

      {risk?.overallRisk && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
          <ShieldAlert className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)]"><span className="font-bold text-[var(--color-warning)]">{risk.overallRisk} risk:</span> {risk.recommendation}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] p-3 rounded border border-[var(--color-border-light)] text-center">
          <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">YES Probability</div>
          <div className="font-bold text-lg text-[var(--color-success)]">{data.sentiment?.yesPercentage?.toFixed(1) || 50}%</div>
        </div>
        <div className="bg-[var(--color-surface)] p-3 rounded border border-[var(--color-border-light)] text-center">
          <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">Volume</div>
          <div className="font-bold text-lg text-[var(--color-primary)]">${Number(data.sentiment?.totalVolume || 0).toLocaleString()}</div>
        </div>
        <div className="bg-[var(--color-surface)] p-3 rounded border border-[var(--color-border-light)] text-center">
          <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">Trend</div>
          <div className="font-bold text-lg text-[var(--color-secondary)]">{data.sentiment?.trend || 'NEUTRAL'}</div>
        </div>
      </div>
    </div>
  );
}

function AIChatbot({ marketId }: { marketId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(`/ai/chat/${marketId}`, {
        userMessage: userMsg,
        conversationHistory: messages
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-80 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--color-text-muted)] mt-4">Ask me anything about this market!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-[var(--color-primary)] text-white rounded-br-none'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-none shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] p-3 rounded-lg rounded-bl-none text-xs flex gap-1">
              <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-[var(--color-border-light)] p-3 bg-[var(--color-surface)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask the AI Assistant..."
          className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
        />
        <button onClick={handleSend} disabled={loading} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded text-sm font-bold transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}
