'use client';

import Link from 'next/link';
import { ShieldAlert, Key, Lock, Fingerprint } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function SecuritySettingsPage() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Log in to manage security settings.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Security Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">Manage passwords, two-factor authentication, and session security.</p>
        </div>

        <div className="grid gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--color-primary)] mb-4">
              <Lock className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Password</h2>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--color-text-secondary)]">Password reset and update controls go here.</div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--color-success)] mb-4">
              <Key className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Two-factor Authentication</h2>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--color-text-secondary)]">Enable or disable 2FA for your account.</div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--color-accent)] mb-4">
              <Fingerprint className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Active Sessions</h2>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--color-text-secondary)]">View and revoke active sessions from other devices.</div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/account/settings" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">Back to Account Settings</Link>
        </div>
      </div>
    </div>
  );
}
