import Link from 'next/link';
import { TrendingUp, Sparkles, Users, Award, Activity, DollarSign } from 'lucide-react';

export default function Home() {
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
        <div className="flex items-center gap-4 mb-16">
          <Link href="/markets" className="btn-primary border border-transparent shadow-sm">
            Explore Markets
          </Link>
          <Link href="/auth/register" className="btn-secondary bg-white">
            Start Predicting
          </Link>
        </div>

        {/* Hero Visual / Banner */}
        <div className="w-full max-w-5xl h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: "linear-gradient(rgba(8, 30, 78, 0.35), rgba(10, 56, 141, 0.35)), url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80')",
            }}
          ></div>
        </div>
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

      {/* Stats Section */}
      <section className="w-full py-20 border-t border-[var(--color-border-light)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <StatCard value="50K+" label="Active Users" />
          <StatCard value="$2M+" label="Volume Traded" />
          <StatCard value="500+" label="Active Markets" />
          <StatCard value="99.5%" label="Uptime" />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="w-full py-24 text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Ready to predict?</h2>
        <p className="text-[var(--color-text-secondary)] mb-8">Join thousands of forecasters making smarter bets</p>
        <Link href="/auth/register" className="btn-secondary bg-white">
          Create Free Account
        </Link>
      </section>
      
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
      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)] mb-4 shadow-sm flex items-center justify-center">
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
