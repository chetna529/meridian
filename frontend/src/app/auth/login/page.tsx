'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import api from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const addToast = useUIStore(state => state.addToast);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      addToast('Logged in successfully!', 'success');
      router.push(res.data.user?.isAdmin ? '/admin' : '/');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Login failed', 'error');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await api.post('/auth/google', { credential: credentialResponse.credential });
      login(res.data.user, res.data.token);
      addToast('Logged in with Google!', 'success');
      router.push('/');
    } catch (err: any) {
      addToast('Google login failed', 'error');
    }
  };

  return (
    <div className="flex justify-center items-center h-full pt-20 pb-20">
      <div className="card w-full max-w-md shadow-xl border border-[var(--color-border)] bg-white rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-[var(--color-text-primary)]">Log In to Meridian</h2>
        
        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => addToast('Google Login Failed', 'error')}
          />
        </div>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[var(--color-border-light)]"></div>
          <span className="mx-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">OR</span>
          <div className="flex-grow border-t border-[var(--color-border-light)]"></div>
        </div>

        <form onSubmit={handleManualLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
              required 
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">Password</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-shadow"
              required 
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button type="submit" className="w-full btn-primary py-3 mt-4 text-sm font-bold shadow-md">Log In</button>
        </form>

        <p className="text-center text-sm mt-6 text-[var(--color-text-secondary)]">
          Don't have an account? <Link href="/auth/register" className="text-[var(--color-primary)] font-semibold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
