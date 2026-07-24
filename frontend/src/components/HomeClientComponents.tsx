'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export function HeroButtons() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="flex items-center gap-4 mb-16">
      <Link href="/markets" className="btn-primary border border-transparent shadow-sm px-6 py-3 rounded-xl text-sm font-bold transition-all">
        Explore Markets
      </Link>
      {!isAuthenticated && (
        <Link href="/auth/register" className="btn-secondary px-6 py-3 rounded-xl text-sm font-bold transition-all">
          Start Predicting
        </Link>
      )}
    </div>
  );
}

export function BottomCTA() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return null;
  }

  return (
    <section className="w-full py-24 text-center">
      <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Ready to predict?</h2>
      <p className="text-[var(--color-text-secondary)] mb-8">Join thousands of forecasters making smarter bets</p>
      <Link href="/auth/register" className="btn-secondary px-6 py-3 rounded-xl text-sm font-bold transition-all">
        Create Free Account
      </Link>
    </section>
  );
}
