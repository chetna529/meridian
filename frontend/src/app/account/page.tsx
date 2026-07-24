'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, Bell, UserCircle, Settings, Wallet } from 'lucide-react';

export default function AccountPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Please log in to access your account details.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 xl:px-12 pt-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">My Account</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">Manage your profile, security settings, and notification preferences.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/settings" className="btn-secondary px-4 py-2">Account Settings</Link>
            <Link href="/account/security" className="btn-secondary px-4 py-2">Security Settings</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-primary)]">
              <UserCircle className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Your username, email, wallet status, and membership details.</p>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div><span className="font-semibold text-[var(--color-text-primary)]">Username:</span> {user?.username}</div>
              <div><span className="font-semibold text-[var(--color-text-primary)]">Email:</span> {user?.email}</div>
              <div><span className="font-semibold text-[var(--color-text-primary)]">Wallet balance:</span> ${Number(user?.totalBalance || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-success)]">
              <Wallet className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Wallet</h2>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Connect your wallet, deposit funds, withdraw, and view transaction history.</p>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center justify-between"><span>Connected wallet</span><span className="text-[var(--color-text-primary)]">Not connected</span></div>
              <div className="flex items-center justify-between"><span>Deposit available</span><span className="text-[var(--color-text-primary)]">Yes</span></div>
              <div className="flex items-center justify-between"><span>Withdrawal status</span><span className="text-[var(--color-text-primary)]">Open</span></div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent)]">
              <Bell className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Review your notification preferences and alerts.</p>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div><span className="font-semibold text-[var(--color-text-primary)]">Trade alerts:</span> Enabled</div>
              <div><span className="font-semibold text-[var(--color-text-primary)]">Market updates:</span> Enabled</div>
              <div><span className="font-semibold text-[var(--color-text-primary)]">Resolution notices:</span> Enabled</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Account settings</h3>
            <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <li>Profile management</li>
              <li>Connected wallets</li>
              <li>Notification preferences</li>
              <li>Security options</li>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Quick actions</h3>
            <div className="grid gap-3">
              <Link href="/wallet" className="block rounded-lg border border-border px-4 py-3 text-sm hover:bg-slate-50">Go to Wallet</Link>
              <Link href="/notifications" className="block rounded-lg border border-border px-4 py-3 text-sm hover:bg-slate-50">Notification Preferences</Link>
              <Link href="/analytics" className="block rounded-lg border border-border px-4 py-3 text-sm hover:bg-slate-50">View Analytics</Link>
            </div>
          </div>
        </div>
    </div>
  );
}
