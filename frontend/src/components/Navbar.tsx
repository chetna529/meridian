'use client';

import Link from 'next/link';
import { UserCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const showAuthenticatedNav = isAuthenticated;

  return (
    <nav className="fixed top-0 left-0 w-full h-18 bg-white border-b border-border z-50 flex items-center px-8 lg:px-12 shadow-sm">
      <div className="w-full flex items-center justify-between">

        {/* Left Section */}
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="font-bold text-xl text-primary tracking-tight"
          >
            MERIDIAN
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
            {showAuthenticatedNav ? (
              <>
                <Link href="/markets" className="hover:text-text-primary transition-colors">
                  Markets
                </Link>
                {user?.isAdmin ? null : (
                  <Link href="/portfolio" className="hover:text-text-primary transition-colors">
                    Portfolio
                  </Link>
                )}
                <Link href="/wallet" className="hover:text-text-primary transition-colors">
                  Wallet
                </Link>
                <Link href="/analytics" className="hover:text-text-primary transition-colors">
                  Analytics
                </Link>
                <Link href="/account" className="hover:text-text-primary transition-colors">
                  Account
                </Link>
                <Link href="/leaderboard" className="hover:text-text-primary transition-colors">
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
        <div className="flex items-center gap-4">
          {showAuthenticatedNav ? (
            <div className="flex items-center gap-4">
              {user?.username && (
                <Link href={`/profile/${user.username}`} className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-slate-100 px-3 py-1 text-sm text-text-primary hover:bg-slate-200 transition-colors">
                  <UserCircle className="w-4 h-4" />
                  <span>{user.username}</span>
                </Link>
              )}

              <button
                onClick={logout}
                className="hidden sm:inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="hidden sm:block text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                Log In
              </Link>

              <Link
                href="/auth/register"
                className="py-2 px-4 text-sm bg-bg-primary border border-border text-black rounded-md hover:bg-gray-50 transition-colors"
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