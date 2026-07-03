'use client';

import Link from 'next/link';
import { ShieldCheck, UserCircle, Bell, CreditCard } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AccountSettingsPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Log in to manage account settings.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Account Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">Update your profile, connected wallets, and notification preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--color-primary)] mb-4">
              <UserCircle className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div><span className="font-semibold text-[var(--color-text-primary)]">Username:</span> {user?.username}</div>
              <div><span className="font-semibold text-[var(--color-text-primary)]">Email:</span> {user?.email}</div>
              <div className="rounded-xl bg-slate-50 p-3">Profile editing controls go here.</div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--color-success)] mb-4">
              <CreditCard className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Connected Wallets</h2>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div>Wallet connection status and fund history.</div>
              <div className="rounded-xl bg-slate-50 p-3">Wallet connect/disconnect UI goes here.</div>
            </div>
          </div>

          <div className="card p-6 md:col-span-2">
            <div className="flex items-center gap-3 text-[var(--color-accent)] mb-4">
              <Bell className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div>Control alerts for trades, market updates, and resolution events.</div>
              <div className="rounded-xl bg-slate-50 p-3">Notification toggles and settings controls go here.</div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/account/security" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">Go to Security Settings</Link>
        </div>
      </div>
    </div>
  );
}
