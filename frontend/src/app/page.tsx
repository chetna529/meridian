import Link from 'next/link';
import { TrendingUp, Sparkles, Users, Award, Activity, DollarSign } from 'lucide-react';
import { HeroButtons, BottomCTA } from '@/components/HomeClientComponents';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

type PublicStats = {
  activeUsers: number;
  activeMarkets: number;
  totalPredictions: number;
  totalVolume: number;
};

async function getStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${API_BASE}/stats`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 lg:py-32 w-full">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] tracking-tight mb-6">
          Navigate the Future
        </h1>
        <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mb-10">
          Real-time prediction markets with AI-powered insights. Trade on outcomes across politics, sports, tech, and more.
        </p>
        <HeroButtons />

        {/* Hero Visual */}
        <HeroIllustration />
      </section>

      {/* Features Section */}
      <section className="w-full py-20 border-t border-[var(--color-border-light)]">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Why Choose Meridian</h2>
          <p className="text-[var(--color-text-secondary)]">Everything you need to predict with confidence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="Real-time Markets"
            description="Live odds updates as predictions pour in. Watch markets move in real-time."
            icon={TrendingUp}
          />
          <FeatureCard
            title="AI Insights"
            description="Get AI-powered market analysis, risk assessments, and expert recommendations."
            icon={Sparkles}
          />
          <FeatureCard
            title="Community"
            description="Discuss predictions, follow experts, and compete on global leaderboards."
            icon={Users}
          />
          <FeatureCard
            title="Gamification"
            description="Earn badges, climb levels, and unlock achievements as you predict."
            icon={Award}
          />
          <FeatureCard
            title="Advanced Analytics"
            description="Track your performance with detailed charts, trends, and success metrics."
            icon={Activity}
          />
          <FeatureCard
            title="Virtual Currency"
            description="Start with 10,000 points. No money, just prediction bragging rights."
            icon={DollarSign}
          />
        </div>
      </section>

      {/* Stats Section — real platform numbers, refreshed every 30s */}
      <section className="w-full py-20 border-t border-[var(--color-border-light)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <StatCard value={stats ? formatCompact(stats.activeUsers) : '—'} label="Traders" />
          <StatCard value={stats ? `$${formatCompact(stats.totalVolume)}` : '—'} label="Volume Traded" />
          <StatCard value={stats ? formatCompact(stats.activeMarkets) : '—'} label="Live Markets" />
          <StatCard value={stats ? formatCompact(stats.totalPredictions) : '—'} label="Predictions Placed" />
        </div>
      </section>

      {/* Bottom CTA */}
      <BottomCTA />

      {/* Footer */}
      <footer className="w-full py-8 text-center border-t border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        &copy; 2026 Meridian. Navigate the future with precision.
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon: Icon }: { title: string, description: string, icon: typeof TrendingUp }) {
  return (
    <div className="card text-left">
      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-primary)] mb-4 shadow-sm flex items-center justify-center">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
      <p className="text-[var(--color-text-secondary)] text-sm">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string, label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold text-[var(--color-primary)] mb-2">{value}</div>
      <div className="text-[var(--color-text-secondary)] text-sm uppercase tracking-wide font-medium">{label}</div>
    </div>
  );
}

// Self-contained SVG so the hero never depends on an external image host.
function HeroIllustration() {
  return (
    <div className="w-full max-w-5xl h-64 md:h-96 rounded-[var(--radius-lg)] overflow-hidden shadow-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] relative flex items-center justify-center">
      <svg viewBox="0 0 1200 500" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="heroBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-bg-secondary)" />
            <stop offset="100%" stopColor="var(--color-bg-tertiary)" />
          </linearGradient>
          <linearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="gridFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="15%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="85%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.1" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <rect width="1200" height="500" fill="url(#heroBg)" />

        {/* Grid lines */}
        <g stroke="var(--color-border)" strokeWidth="1" mask="url(#gridFade)" opacity="0.4">
          <line x1="0" y1="80" x2="1200" y2="80" />
          <line x1="0" y1="160" x2="1200" y2="160" strokeDasharray="5,5" />
          <line x1="0" y1="240" x2="1200" y2="240" />
          <line x1="0" y1="320" x2="1200" y2="320" strokeDasharray="5,5" />
          <line x1="0" y1="400" x2="1200" y2="400" />
          
          <line x1="150" y1="0" x2="150" y2="500" />
          <line x1="350" y1="0" x2="350" y2="500" strokeDasharray="5,5" />
          <line x1="550" y1="0" x2="550" y2="500" />
          <line x1="750" y1="0" x2="750" y2="500" strokeDasharray="5,5" />
          <line x1="950" y1="0" x2="950" y2="500" />
          <line x1="1150" y1="0" x2="1150" y2="500" />
        </g>

        {/* Area 2 */}
        <path d="M 150 450 L 150 320 Q 300 350, 450 280 T 750 200 T 1050 120 L 1050 450 Z" fill="url(#areaGrad2)" />

        {/* Area 1 */}
        <path d="M 150 450 L 150 280 Q 250 210, 400 320 T 700 180 T 1050 90 L 1050 450 Z" fill="url(#areaGrad1)" />

        {/* Line 2: AI Consensus */}
        <path d="M 150 320 Q 300 350, 450 280 T 750 200 T 1050 120" fill="none" stroke="url(#lineGrad2)" strokeWidth="3" strokeDasharray="6,4" opacity="0.8" />

        {/* Line 1: Main Trend */}
        <path d="M 150 280 Q 250 210, 400 320 T 700 180 T 1050 90" fill="none" stroke="url(#lineGrad1)" strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />

        {/* Interactive Markers */}
        <g transform="translate(400, 320)">
          <circle r="12" fill="#a855f7" opacity="0.2">
            <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="6" fill="#a855f7" stroke="var(--color-surface)" strokeWidth="2" />
        </g>

        <g transform="translate(700, 180)">
          <circle r="12" fill="#f43f5e" opacity="0.2">
            <animate attributeName="r" values="8;16;8" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle r="6" fill="#f43f5e" stroke="var(--color-surface)" strokeWidth="2" />
        </g>
        
        <g transform="translate(1050, 90)">
          <circle r="16" fill="#e11d48" opacity="0.25">
            <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="8" fill="#e11d48" stroke="var(--color-surface)" strokeWidth="3" />
        </g>

        {/* Tooltips */}
        <g transform="translate(800, 180)">
          <rect width="210" height="70" rx="16" fill="var(--color-surface)" fillOpacity="0.85" stroke="var(--color-border)" strokeWidth="1" />
          <circle cx="34" cy="35" r="10" fill="#f43f5e" />
          <text x="58" y="32" fontSize="15" fontWeight="800" fill="var(--color-text-primary)" fontFamily="sans-serif">YES Option: 74%</text>
          <text x="58" y="52" fontSize="12" fill="var(--color-text-secondary)" fontFamily="sans-serif">Volume: $248,500</text>
        </g>

        <g transform="translate(200, 120)">
          <rect width="220" height="70" rx="16" fill="var(--color-surface)" fillOpacity="0.85" stroke="var(--color-border)" strokeWidth="1" />
          <circle cx="34" cy="35" r="10" fill="#10b981" />
          <text x="58" y="32" fontSize="15" fontWeight="800" fill="var(--color-text-primary)" fontFamily="sans-serif">AI Sentiment: Bullish</text>
          <text x="58" y="52" fontSize="12" fill="var(--color-text-secondary)" fontFamily="sans-serif">Confidence score: 87%</text>
        </g>

        <g transform="translate(480, 360)">
          <rect width="230" height="60" rx="14" fill="var(--color-surface)" fillOpacity="0.85" stroke="var(--color-border)" strokeWidth="1" />
          <circle cx="28" cy="30" r="6" fill="#6366f1" />
          <text x="48" y="28" fontSize="13" fontWeight="700" fill="var(--color-text-primary)" fontFamily="sans-serif">Market Pivot Event</text>
          <text x="48" y="46" fontSize="11" fill="var(--color-text-secondary)" fontFamily="sans-serif">Odds adjusted dynamically</text>
        </g>
      </svg>
    </div>
  );
}
