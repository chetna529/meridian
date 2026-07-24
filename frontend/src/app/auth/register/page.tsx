'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import api from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import Link from 'next/link';

function RegisterPageContent() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore(state => state.login);
  const addToast = useUIStore(state => state.addToast);

  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { email, username, password, referralCode: referralCode || undefined });
      login(res.data.user, res.data.token);
      addToast('Registered successfully! Welcome!', 'success');
      router.push(res.data.user?.isAdmin ? '/admin' : '/');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Registration failed', 'error');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await api.post('/auth/google', { credential: credentialResponse.credential });
      login(res.data.user, res.data.token);
      addToast('Registered with Google! Welcome!', 'success');
      router.push(res.data.user?.isAdmin ? '/admin' : '/');
    } catch (err: any) {
      addToast('Google registration failed', 'error');
    }
  };

  return (
    <div className="flex justify-center items-center h-full pt-20 pb-20">
      <div className="card w-full max-w-md shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-[var(--color-text-primary)]">Create an Account</h2>

        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => addToast('Google Login Failed', 'error')}
            text="signup_with"
          />
        </div>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[var(--color-border-light)]"></div>
          <span className="mx-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">OR</span>
          <div className="flex-grow border-t border-[var(--color-border-light)]"></div>
        </div>

        <form onSubmit={handleManualRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">Referral code <span className="text-[var(--color-text-muted)]">(optional)</span></label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. 4F82A1C9"
              className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] font-mono uppercase focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
            />
          </div>
          <button type="submit" className="w-full btn-primary py-3 mt-4 text-sm font-bold shadow-md">Register</button>
        </form>

        <p className="text-center text-sm mt-6 text-[var(--color-text-secondary)]">
          Already have an account? <Link href="/auth/login" className="text-[var(--color-primary)] font-semibold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
