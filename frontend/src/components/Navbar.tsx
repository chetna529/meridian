'use client';

import Link from 'next/link';
import { UserCircle, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import NotificationTab from './NotificationTab';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const showAuthenticatedNav = isAuthenticated;

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm border-b border-[var(--color-border)] z-50 flex items-center px-6 lg:px-10">
      <div className="w-full flex items-center justify-between">

        {/* Left Section */}
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="font-bold text-lg text-[var(--color-primary)] tracking-tight"
          >
            MERIDIAN
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-text-secondary)]">
            {showAuthenticatedNav ? (
              <>
                <Link href="/markets" className="hover:text-[var(--color-text-primary)] transition-colors">
                  Markets
                </Link>
                {user?.isAdmin ? null : (
                  <Link href="/portfolio" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Portfolio
                  </Link>
                )}
                <Link href="/wallet" className="hover:text-[var(--color-text-primary)] transition-colors">
                  Wallet
                </Link>
                <Link href="/analytics" className="hover:text-[var(--color-text-primary)] transition-colors">
                  Analytics
                </Link>
                <Link href="/account" className="hover:text-[var(--color-text-primary)] transition-colors">
                  Account
                </Link>
                <Link href="/leaderboard" className="hover:text-[var(--color-text-primary)] transition-colors">
                  Leaderboard
                </Link>
              </>
            ) : (
              <>
                <span title="Sign up or log in to access Markets" className="cursor-not-allowed opacity-40">
                  Markets
                </span>
                <span title="Sign up or log in to access Portfolio" className="cursor-not-allowed opacity-40">
                  Portfolio
                </span>
                <span title="Sign up or log in to access Leaderboard" className="cursor-not-allowed opacity-40">
                  Leaderboard
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {showAuthenticatedNav ? (
            <div className="flex items-center gap-2">
              <NotificationTab />

              {user?.username && (
                <Link href={`/profile/${user.username}`} className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                  <UserCircle className="w-4 h-4" />
                  <span>{user.username}</span>
                </Link>
              )}

              <button
                onClick={logout}
                className="hidden sm:inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-primary)] hover:opacity-85 transition-opacity"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="hidden sm:block text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Log In
              </Link>

              <Link
                href="/auth/register"
                className="py-2 px-4 text-sm bg-[var(--color-primary)] text-white rounded-[var(--radius-sm)] hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
