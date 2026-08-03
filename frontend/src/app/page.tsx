'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TrendingUp, Sparkles, Users, Award, Activity, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type PublicStats = {
  activeUsers: number;
  activeMarkets: number;
  totalPredictions: number;
  totalVolume: number;
};

function AnimatedCounter({ target, decimals = 0, prefix = '', suffix = '' }: { target: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);
  const observerRef = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let cur = 0;
    const step = target / 40;
    const interval = setInterval(() => {
      cur += step;
      if (cur >= target) {
        setValue(target);
        clearInterval(interval);
      } else {
        setValue(cur);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [hasStarted, target]);

  return <span ref={observerRef}>{prefix}{value.toFixed(decimals)}{suffix}</span>;
}

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<PublicStats>({
    activeUsers: 35,
    activeMarkets: 8,
    totalPredictions: 156,
    totalVolume: 15100000
  });
  const [markets, setMarkets] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // Fetch statistics
    api.get('/stats')
      .then(res => {
        if (res.data) {
          setStats({
            activeUsers: res.data.activeUsers || 35,
            activeMarkets: res.data.activeMarkets || 8,
            totalPredictions: res.data.totalPredictions || 156,
            totalVolume: res.data.totalVolume || 15100000
          });
        }
      })
      .catch(console.error);

    // Fetch live markets
    api.get('/markets')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setMarkets(res.data.slice(0, 4));
        }
      })
      .catch(console.error);

    // Fetch leaderboard
    api.get('/leaderboard?type=GLOBAL')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setLeaderboard(res.data.slice(0, 3));
        }
      })
      .catch(console.error);
  }, []);

  // Ticker items
  const tickerItems = [
    { name: 'FED-CUT-SEP', price: '71¢', dir: 'up', delta: '+3.1' },
    { name: 'IND-AUS-ODI', price: '54¢', dir: 'up', delta: '+0.8' },
    { name: 'GPT-NEXT-Q4', price: '83¢', dir: 'up', delta: '+5.4' },
    { name: 'BTC-120K-27', price: '62¢', dir: 'down', delta: '−1.4' },
    { name: 'WTC-FINAL-27', price: '74¢', dir: 'up', delta: '+4.2' },
    { name: 'ELXN-TURNOUT', price: '48¢', dir: 'down', delta: '−2.0' },
    { name: 'NBA-FINALS-W', price: '59¢', dir: 'up', delta: '+1.6' }
  ];

  // Helper to compute time left
  const getDaysLeft = (dateString?: string) => {
    if (!dateString) return 'Closes soon';
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Closes today';
    return `Closes in ${diffDays} days`;
  };

  return (
    <div className="w-full flex flex-col bg-[#FBF7F1] text-[#2A241D] selection:bg-[rgba(200,106,63,0.20)] selection:text-[#B75A31]">
      
      {/* Hero Section */}
      <div className="px-6 md:px-12 lg:px-20 pt-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Hero Left Column */}
          <div className="flex flex-col text-left">
            <div className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-[#B75A31] bg-[rgba(200,106,63,0.10)] border border-[rgba(200,106,63,0.20)] px-4 py-2 rounded-full self-start mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C86A3F] animate-ping"></span>
              LIVE · {stats.activeMarkets} MARKETS OPEN
            </div>

            <h1 className="font-display font-semibold text-5xl md:text-6xl lg:text-7xl leading-[1.08] tracking-tight text-[#2A241D]">
              Where forecasts<br />find their <em className="italic text-[#C86A3F] font-medium font-display">meridian.</em>
            </h1>

            <p className="text-[#79705F] text-base md:text-lg leading-relaxed max-w-md mt-6">
              Meridian is a prediction market for politics, sports, and tech — the point where a hunch either peaks into conviction or fades. Back your call with points, and watch the crowd decide.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/markets" className="bg-[#C86A3F] text-white font-semibold text-sm px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:bg-[#B75A31] transition-all transform hover:-translate-y-0.5">
                Explore Markets →
              </Link>
              {!isAuthenticated && (
                <Link href="/auth/register" className="bg-transparent border border-[#E7DCC7] text-[#2A241D] font-medium text-sm px-6 py-3.5 rounded-full hover:bg-white hover:border-[#A79C87] transition-all">
                  How it works
                </Link>
              )}
            </div>

            {/* Platform Stats Ledger */}
            <div className="flex gap-10 mt-12 pt-8 border-t border-[#E7DCC7]">
              <div>
                <div className="font-display text-3xl font-semibold text-[#2A241D]">
                  <AnimatedCounter target={stats.activeUsers} />
                </div>
                <div className="font-mono text-[10px] tracking-wider text-[#A79C87] uppercase mt-1">Traders</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold text-[#2A241D]">
                  <AnimatedCounter target={stats.totalVolume / 1000000} decimals={1} prefix="$" suffix="M" />
                </div>
                <div className="font-mono text-[10px] tracking-wider text-[#A79C87] uppercase mt-1">Volume Traded</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold text-[#C86A3F]">
                  <AnimatedCounter target={stats.activeMarkets} />
                </div>
                <div className="font-mono text-[10px] tracking-wider text-[#A79C87] uppercase mt-1">Live Markets</div>
              </div>
            </div>
          </div>

          {/* Hero Right Column (Meridian Arc Signature Graphic) */}
          <div className="relative">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs text-[#79705F]">Today's <b className="font-semibold text-[#2A241D]">meridian line</b></span>
              <span className="font-mono text-[10px] text-[#A79C87]">PROBABILITY 0—100</span>
            </div>
            
            <svg className="w-full h-auto block overflow-visible" viewBox="0 0 900 400">
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#C86A3F" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#C86A3F" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <line x1="120" y1="360" x2="780" y2="360" stroke="#E7DCC7" strokeWidth="1" />
              <path d="M120,360 L136,258 L183,166 L256,93 L348,46 L450,30 L552,46 L644,93 L717,166 L764,258 L780,360" fill="none" stroke="#E7DCC7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M120,360 L136,258 L183,166 L256,93 L348,46 L450,30 L552,46 L644,93 L676,119" fill="none" stroke="#4F8F63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              
              <g>
                <circle cx="248" cy="99" r="5" fill="#FBF7F1" stroke="#7C7A9E" strokeWidth="2"/>
                <text x="248" y="82" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#79705F">29%</text>

                <circle cx="491" cy="33" r="5" fill="#FBF7F1" stroke="#C86A3F" strokeWidth="2"/>
                <text x="491" y="18" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#79705F">54%</text>

                <circle cx="734" cy="192" r="5" fill="#FBF7F1" stroke="#4F8F63" strokeWidth="2"/>
                <text x="734" y="215" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#79705F">83%</text>
              </g>
              
              <circle cx="676" cy="119" r="34" fill="url(#sunGlow)"/>
              <circle cx="676" cy="119" r="9" fill="#C86A3F"/>
              <circle cx="676" cy="119" r="9" fill="none" stroke="#C86A3F" strokeWidth="1.4" opacity="0.5">
                <animate attributeName="r" values="9;16;9" dur="2.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite"/>
              </circle>

              <text x="120" y="382" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#A79C87">0%</text>
              <text x="780" y="382" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#A79C87">100%</text>
            </svg>

            <div className="text-center -mt-1">
              <span className="font-display text-base text-[#79705F]">India reaches the 2027 WTC final — <b className="text-2xl text-[#4F8F63] font-bold font-display ml-1">74¢</b> YES</span>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Ticker */}
      <div className="w-full mt-24 border-t border-b border-[#F0E8D9] overflow-hidden whitespace-nowrap py-3 bg-[rgba(244,237,225,0.4)]">
        <div className="ticker-track-anim">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((t, idx) => (
            <span key={idx} className="font-mono text-xs text-[#79705F] inline-flex items-center gap-2 px-6 border-r border-[#F0E8D9]">
              {t.name} <b className="text-[#2A241D] font-bold">{t.price}</b>
              <span className={t.dir === 'up' ? 'text-[#4F8F63]' : 'text-[#7C7A9E]'}>
                {t.dir === 'up' ? '▲' : '▼'} {t.delta}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Markets Section */}
      <section className="px-6 md:px-12 lg:px-20 py-24 max-w-7xl mx-auto w-full" id="markets">
        <div className="max-w-xl mb-12">
          <span className="font-mono text-xs tracking-widest text-[#B75A31] uppercase">Market Index</span>
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[#2A241D] mt-2">What's trading this week</h2>
          <p className="text-[#79705F] text-sm mt-3">Every open market, ranked by volume. Prices move with every prediction placed.</p>
        </div>

        <div className="border-t border-[#E7DCC7] w-full">
          {markets.length > 0 ? (
            markets.map((market) => (
              <Link href={`/markets`} key={market.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-6 border-b border-[#E7DCC7] hover:bg-[#F4EDE1] transition-all px-4 group">
                <div className="md:col-span-2 font-mono text-xs tracking-wider text-[#A79C87] uppercase">
                  {market.category || 'General'}
                </div>
                <div className="md:col-span-4 text-left">
                  <h3 className="font-display font-semibold text-[17px] text-[#2A241D] group-hover:text-[#C86A3F] transition-colors leading-snug">
                    {market.title}
                  </h3>
                  <span className="text-xs text-[#A79C87] mt-1.5 block">
                    {getDaysLeft(market.resolutionDate)}
                  </span>
                </div>
                <div className="md:col-span-2 hidden md:block">
                  <svg className="w-full max-w-[120px] h-8" viewBox="0 0 130 34" preserveAspectRatio="none">
                    <path 
                      d="M0,20 L20,18 L40,24 L60,14 L80,22 L100,10 L120,16 L130,8" 
                      fill="none" 
                      stroke={market.yesPercentage > 50 ? '#4F8F63' : '#7C7A9E'} 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <div className="flex-1 text-center py-2 rounded-full font-mono text-xs font-semibold text-[#4F8F63] bg-[rgba(79,143,99,0.1)]">
                    YES {(market.yesPercentage || 50).toFixed(0)}¢
                  </div>
                  <div className="flex-1 text-center py-2 rounded-full font-mono text-xs font-semibold text-[#7C7A9E] bg-[rgba(124,122,158,0.1)]">
                    NO {(market.noPercentage || 50).toFixed(0)}¢
                  </div>
                </div>
                <div className="md:col-span-1 text-right font-mono text-xs text-[#79705F]">
                  ${Number(market.totalVolume || 0).toLocaleString()}
                  <span className="block text-[10px] text-[#A79C87] uppercase mt-0.5 tracking-wider">Volume</span>
                </div>
              </Link>
            ))
          ) : (
            // Static fallback matching the exact layout and look of mock HTML if database is empty
            <>
              <Link href="/markets" className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-6 border-b border-[#E7DCC7] hover:bg-[#F4EDE1] transition-all px-4 group">
                <div className="md:col-span-2 font-mono text-xs tracking-wider text-[#A79C87] uppercase">Macro</div>
                <div className="md:col-span-4 text-left">
                  <h3 className="font-display font-semibold text-[17px] text-[#2A241D] group-hover:text-[#C86A3F] transition-colors leading-snug">Will the Fed cut rates at the September meeting?</h3>
                  <span className="text-xs text-[#A79C87] mt-1.5 block">Closes in 6 days</span>
                </div>
                <div className="md:col-span-2 hidden md:block">
                  <svg className="w-full max-w-[120px] h-8" viewBox="0 0 130 34" preserveAspectRatio="none">
                    <path d="M0,24 L16,21 L32,26 L48,17 L64,19 L80,11 L96,14 L112,6 L130,8" fill="none" stroke="#4F8F63" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <div className="flex-1 text-center py-2 rounded-full font-mono text-xs font-semibold text-[#4F8F63] bg-[rgba(79,143,99,0.1)]">YES 71¢</div>
                  <div className="flex-1 text-center py-2 rounded-full font-mono text-xs font-semibold text-[#7C7A9E] bg-[rgba(124,122,158,0.1)]">NO 29¢</div>
                </div>
                <div className="md:col-span-1 text-right font-mono text-xs text-[#79705F]">$482K<span className="block text-[10px] text-[#A79C87] uppercase mt-0.5 tracking-wider">Volume</span></div>
              </Link>

              <Link href="/markets" className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-6 border-b border-[#E7DCC7] hover:bg-[#F4EDE1] transition-all px-4 group">
                <div className="md:col-span-2 font-mono text-xs tracking-wider text-[#A79C87] uppercase">Sports</div>
                <div className="md:col-span-4 text-left">
                  <h3 className="font-display font-semibold text-[17px] text-[#2A241D] group-hover:text-[#C86A3F] transition-colors leading-snug">India vs Australia — who wins the ODI series?</h3>
                  <span className="text-xs text-[#A79C87] mt-1.5 block">Closes in 2 days</span>
                </div>
                <div className="md:col-span-2 hidden md:block">
                  <svg className="w-full max-w-[120px] h-8" viewBox="0 0 130 34" preserveAspectRatio="none">
                    <path d="M0,16 L16,19 L32,13 L48,22 L64,16 L80,20 L96,14 L112,17 L130,12" fill="none" stroke="#C86A3F" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <div className="flex-1 text-center py-2 rounded-full font-mono text-xs font-semibold text-[#4F8F63] bg-[rgba(79,143,99,0.1)]">YES 54¢</div>
                  <div className="flex-1 text-center py-2 rounded-full font-mono text-xs font-semibold text-[#7C7A9E] bg-[rgba(124,122,158,0.1)]">NO 46¢</div>
                </div>
                <div className="md:col-span-1 text-right font-mono text-xs text-[#79705F]">$156K<span className="block text-[10px] text-[#A79C87] uppercase mt-0.5 tracking-wider">Volume</span></div>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Benefits / editorial section */}
      <section className="bg-[#F4EDE1] py-24 px-6 md:px-12 lg:px-20 w-full" id="how">
        <div className="max-w-xl mx-auto text-center mb-16">
          <span className="font-mono text-xs tracking-widest text-[#B75A31] uppercase">What you get</span>
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[#2A241D] mt-2">Built for people who like being right</h2>
          <p className="text-[#79705F] text-sm mt-3">Every module below is live in the product — not a roadmap slide.</p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
          <div className="flex gap-5 py-6 border-t border-[#E7DCC7]">
            <div className="w-10 h-10 flex-shrink-0 bg-[rgba(200,106,63,0.1)] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#B75A31]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[17px] text-[#2A241D]">Real-time markets</h3>
              <p className="text-[#79705F] text-xs leading-relaxed mt-1">Prices move the instant a position lands — no delay between the crowd and the odds.</p>
            </div>
          </div>

          <div className="flex gap-5 py-6 border-t border-[#E7DCC7]">
            <div className="w-10 h-10 flex-shrink-0 bg-[rgba(200,106,63,0.1)] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#B75A31]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[17px] text-[#2A241D]">AI insights</h3>
              <p className="text-[#79705F] text-xs leading-relaxed mt-1">Sentiment reads, risk flags, and a confidence score on every market, from live order flow.</p>
            </div>
          </div>

          <div className="flex gap-5 py-6 border-t border-[#E7DCC7]">
            <div className="w-10 h-10 flex-shrink-0 bg-[rgba(200,106,63,0.1)] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#B75A31]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[17px] text-[#2A241D]">Community</h3>
              <p className="text-[#79705F] text-xs leading-relaxed mt-1">Follow sharp traders and see who's actually beating the market long-term.</p>
            </div>
          </div>

          <div className="flex gap-5 py-6 border-t border-[#E7DCC7]">
            <div className="w-10 h-10 flex-shrink-0 bg-[rgba(200,106,63,0.1)] rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-[#B75A31]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[17px] text-[#2A241D]">Gamification</h3>
              <p className="text-[#79705F] text-xs leading-relaxed mt-1">Streaks, badges, and season ranks reward consistency, not one lucky call.</p>
            </div>
          </div>

          <div className="flex gap-5 py-6 border-t border-[#E7DCC7]">
            <div className="w-10 h-10 flex-shrink-0 bg-[rgba(200,106,63,0.1)] rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#B75A31]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[17px] text-[#2A241D]">Advanced analytics</h3>
              <p className="text-[#79705F] text-xs leading-relaxed mt-1">Win rate, Brier score, category breakdowns — skill separated from luck.</p>
            </div>
          </div>

          <div className="flex gap-5 py-6 border-t border-[#E7DCC7]">
            <div className="w-10 h-10 flex-shrink-0 bg-[rgba(200,106,63,0.1)] rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#B75A31]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[17px] text-[#2A241D]">Virtual currency</h3>
              <p className="text-[#79705F] text-xs leading-relaxed mt-1">Start with 10,000 points. No money on the line — just the call itself.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="px-6 md:px-12 lg:px-20 py-24 max-w-7xl mx-auto w-full">
        <div className="max-w-xl mx-auto text-center mb-16">
          <span className="font-mono text-xs tracking-widest text-[#B75A31] uppercase">Season 1</span>
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[#2A241D] mt-2">Top of the leaderboard</h2>
          <p className="text-[#79705F] text-sm mt-3">Ranked by cumulative points across every settled market.</p>
        </div>

        <div className="max-w-2xl mx-auto border-t border-[#E7DCC7]">
          {leaderboard.length > 0 ? (
            leaderboard.map((rank, index) => (
              <div key={rank.id} className="flex items-center justify-between py-5 border-b border-[#E7DCC7]">
                <div className="flex items-center gap-5">
                  <span className={`font-display font-bold text-lg w-6 ${index === 0 ? 'text-[#C86A3F]' : 'text-[#A79C87]'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#F4EDE1] border border-[#E7DCC7] flex items-center justify-center font-display font-semibold text-[#79705F] uppercase text-sm">
                    {rank.user?.username?.slice(0, 2) || 'TR'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#2A241D]">{rank.user?.username}</div>
                    <div className="text-xs text-[#A79C87] mt-0.5">Trust Score: {rank.user?.trustScore}%</div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold text-[#4F8F63]">
                  +{Number(rank.score).toLocaleString()} pts
                </div>
              </div>
            ))
          ) : (
            // Static mock leaderboard fallback if database is empty
            <>
              <div className="flex items-center justify-between py-5 border-b border-[#E7DCC7]">
                <div className="flex items-center gap-5">
                  <span className="font-display font-bold text-lg w-6 text-[#C86A3F]">01</span>
                  <div className="w-9 h-9 rounded-full bg-[#F4EDE1] border border-[#E7DCC7] flex items-center justify-center font-display font-semibold text-[#79705F] text-sm">AV</div>
                  <div>
                    <div className="font-semibold text-sm text-[#2A241D]">Aviral_Sharma</div>
                    <div className="text-xs text-[#A79C87] mt-0.5">14-market win streak</div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold text-[#4F8F63]">+4,820 pts</div>
              </div>

              <div className="flex items-center justify-between py-5 border-b border-[#E7DCC7]">
                <div className="flex items-center gap-5">
                  <span className="font-display font-bold text-lg w-6 text-[#A79C87]">02</span>
                  <div className="w-9 h-9 rounded-full bg-[#F4EDE1] border border-[#E7DCC7] flex items-center justify-center font-display font-semibold text-[#79705F] text-sm">RK</div>
                  <div>
                    <div className="font-semibold text-sm text-[#2A241D]">rk_forecasts</div>
                    <div className="text-xs text-[#A79C87] mt-0.5">92% win rate, Macro</div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold text-[#4F8F63]">+3,910 pts</div>
              </div>

              <div className="flex items-center justify-between py-5 border-b border-[#E7DCC7]">
                <div className="flex items-center gap-5">
                  <span className="font-display font-bold text-lg w-6 text-[#A79C87]">03</span>
                  <div className="w-9 h-9 rounded-full bg-[#F4EDE1] border border-[#E7DCC7] flex items-center justify-center font-display font-semibold text-[#79705F] text-sm">NM</div>
                  <div>
                    <div className="font-semibold text-sm text-[#2A241D]">nimisha.codes</div>
                    <div className="text-xs text-[#A79C87] mt-0.5">Top 3 in Tech, 4 seasons</div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold text-[#4F8F63]">+3,405 pts</div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#F0E8D9] py-14 px-8 bg-[#F4EDE1] w-full">
        <div className="max-w-6xl mx-auto flex justify-between items-start flex-wrap gap-8">
          <div>
            <div className="logo font-semibold font-display text-xl flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none"><path d="M3 19L8 8L13 15L18 5L23 19" stroke="#C86A3F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>Meridian
            </div>
            <p className="text-[#A79C87] text-sm max-w-xs mt-3 leading-relaxed">A prediction market for practice, not money. Trade points, sharpen your judgment, climb the board.</p>
          </div>
          <div className="flex gap-16">
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-[#A79C87] mb-4">Product</h4>
              <Link href="/markets" className="block text-sm text-[#79705F] mb-3 hover:text-[#C86A3F]">Markets</Link>
              <Link href="/portfolio" className="block text-sm text-[#79705F] mb-3 hover:text-[#C86A3F]">Portfolio</Link>
              <Link href="/leaderboard" className="block text-sm text-[#79705F] mb-3 hover:text-[#C86A3F]">Leaderboard</Link>
            </div>
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-[#A79C87] mb-4">Company</h4>
              <span className="block text-sm text-[#79705F] mb-3 cursor-default">About</span>
              <span className="block text-sm text-[#79705F] mb-3 cursor-default">Rules</span>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[#E7DCC7] flex justify-between text-xs font-mono text-[#A79C87]">
          <span>© 2026 Meridian</span>
          <span>Navigate the future with precision</span>
        </div>
      </footer>

    </div>
  );
}
