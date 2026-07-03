'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, TrendingUp, Users, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import socket from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params?.id as string | undefined;
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | ''>(100);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const { isAuthenticated, updateBalance } = useAuthStore();
  const { addToast } = useUIStore();
  const [aiTab, setAiTab] = useState<'insights' | 'chat'>('insights');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (!marketId) {
      setLoading(false);
      return;
    }

    api.get(`/markets/${marketId}`)
      .then(res => {
        setMarket(res.data);
        if (res.data.options && res.data.options.length > 0) {
          setSelectedOption(res.data.options[0]); // Default to first available option
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Real-time updates!
    socket.on('MARKET_UPDATED', (data) => {
      if (data.marketId === marketId) {
        setMarket((prev: any) => ({
          ...prev,
          yesPercentage: data.yesPercentage,
          noPercentage: data.noPercentage,
          totalVolume: data.totalVolume
        }));
      }
    });

    return () => {
      socket.off('MARKET_UPDATED');
    };
  }, [isAuthenticated, marketId]);

  const handleSubmitPrediction = async () => {
    if (!isAuthenticated) return addToast('Please login first', 'error');
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
          <Link href="/auth/register" className="btn-secondary py-3 px-6 bg-white">Sign Up</Link>
        </div>
      </div>
    );
  }

  if (!marketId) return <div className="text-center p-20">Invalid market ID.</div>;
  if (loading) return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!market) return <div className="text-center p-20">Market not found.</div>;

  return (
    <div className="w-full pb-20">
      <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Market Info */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                {market.category}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${market.status === 'LIVE' ? 'text-[var(--color-success)] bg-emerald-50' : 'text-[var(--color-text-muted)] bg-gray-100'}`}>
                {market.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-4 leading-tight">{market.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /><span>${Number(market.totalVolume).toLocaleString()} Vol</span></div>
              <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /><span>{market.totalPredictions} Predictions</span></div>
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>Resolves {new Date(market.resolutionDate).toLocaleDateString()}</span></div>
            </div>
          </div>

          {/* AI Features Section */}
          <div className="bg-white p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
            <div className="flex gap-4 border-b border-[var(--color-border)] mb-4">
              <button onClick={() => setAiTab('insights')} className={`pb-2 font-bold text-sm ${aiTab === 'insights' ? 'border-b-2 border-violet-500 text-violet-600' : 'text-gray-500'}`}>
                <Sparkles className="w-4 h-4 inline mr-1" /> AI Insights
              </button>
              <button onClick={() => setAiTab('chat')} className={`pb-2 font-bold text-sm ${aiTab === 'chat' ? 'border-b-2 border-violet-500 text-violet-600' : 'text-gray-500'}`}>
                AI Assistant
              </button>
            </div>
            {aiTab === 'insights' ? <AIInsights marketId={market.id} /> : <AIChatbot marketId={market.id} />}
          </div>

          <div className="bg-white p-6 rounded-xl border border-[var(--color-border)] shadow-sm h-96 flex flex-col items-center justify-center text-[var(--color-text-muted)] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
            <p>Interactive Recharts Candlestick Chart goes here</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
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
          <div className="bg-white p-6 rounded-xl border border-[var(--color-border)] shadow-md sticky top-24">
            <h2 className="text-xl font-bold mb-6 text-center">Place Prediction</h2>
            
            <div className="flex items-center justify-between mb-8 gap-4">
              {market.options?.map((opt: any) => (
                <div 
                  key={opt.id}
                  onClick={() => setSelectedOption(opt)}
                  className={`text-center p-4 rounded-lg border flex-1 cursor-pointer transition-colors ${
                    selectedOption?.id === opt.id 
                      ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                      : 'border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-xl mb-1">{opt.optionText}</div>
                  <div className="text-xs font-semibold text-[var(--color-text-muted)]">${Number(opt.totalStaked).toLocaleString()} Pool</div>
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
                  className="w-full pl-7 pr-4 py-3 border border-[var(--color-border)] rounded-lg text-lg font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg mb-6 border border-[var(--color-border-light)]">
              <div className="flex justify-between font-semibold mt-2 pt-2">
                <span>Potential Return (Est.)</span>
                <span className="text-[var(--color-success)] font-mono">${(Number(amount) * 2).toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handleSubmitPrediction}
              disabled={market.status !== 'LIVE'}
              className={`w-full font-bold py-4 rounded-xl shadow-sm transition-colors active:scale-95 ${
                market.status === 'LIVE' ? 'bg-[var(--color-primary)] text-white hover:bg-indigo-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {market.status === 'LIVE' ? 'Submit Prediction' : 'Market Closed'}
            </button>
          </div>
        </div>

      </div>
    </div>
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
    <div className="bg-white p-6 rounded-xl border border-[var(--color-border)] shadow-sm mt-6">
      <h3 className="text-lg font-bold mb-6 border-b border-[var(--color-border-light)] pb-2">Discussion ({comments.length})</h3>
      
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your insights..."
            className="w-full p-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow mb-3"
            rows={3}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary py-2 px-6 text-sm">Post Comment</button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg text-center mb-8 border border-[var(--color-border-light)]">
          <p className="text-sm text-gray-600 mb-2">Join the conversation to share your insights.</p>
          <Link href="/auth/login" className="text-sm font-bold text-[var(--color-primary)] hover:underline">Log In to Comment</Link>
        </div>
      )}

      <div className="space-y-6">
        {comments.map(c => (
          <div key={c.id} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] flex-shrink-0 flex items-center justify-center font-bold">
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
        {comments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first!</p>}
      </div>
    </div>
  );
}

function AIInsights({ marketId }: { marketId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/ai/summarize-market/${marketId}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [marketId]);

  if (loading) return <div className="p-4 text-center text-sm text-gray-500">Generating AI Insights...</div>;
  if (!data) return <div className="p-4 text-center text-sm text-gray-500">Failed to load AI Insights.</div>;

  return (
    <div className="bg-gradient-to-r from-violet-900/10 to-indigo-900/10 p-6 rounded-lg border border-violet-500/20">
      <p className="text-[var(--color-text-secondary)] text-sm mb-6 leading-relaxed whitespace-pre-wrap">{data.summary}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-3 rounded border border-[var(--color-border-light)] text-center">
          <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">YES Probability</div>
          <div className="font-bold text-lg text-emerald-600">{data.sentiment?.yesPercentage?.toFixed(1) || 50}%</div>
        </div>
        <div className="bg-white p-3 rounded border border-[var(--color-border-light)] text-center">
          <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">Volume</div>
          <div className="font-bold text-lg text-[var(--color-primary)]">${Number(data.sentiment?.totalVolume || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white p-3 rounded border border-[var(--color-border-light)] text-center">
          <div className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">Trend</div>
          <div className="font-bold text-lg text-violet-600">{data.sentiment?.trend || 'NEUTRAL'}</div>
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
    <div className="flex flex-col h-80 border border-violet-500/20 rounded-lg bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-500 mt-4">Ask me anything about this market!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
              msg.role === 'user' 
                ? 'bg-violet-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-500 p-3 rounded-lg rounded-bl-none text-xs flex gap-1">
              <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-[var(--color-border-light)] p-3 bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask the AI Assistant..."
          className="flex-1 bg-gray-50 border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        />
        <button onClick={handleSend} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}
