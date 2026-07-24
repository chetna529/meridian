'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import api from '@/lib/api';
import { AlertTriangle, Mail, X } from 'lucide-react';

export default function EmailVerificationBanner() {
  const { isAuthenticated, user, verifyUserEmail } = useAuthStore();
  const addToast = useUIStore(state => state.addToast);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // If not authenticated or already verified, don't show the banner
  if (!isAuthenticated || !user || user.isEmailVerified) {
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      return addToast('Please enter a valid 6-digit code.', 'error');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-email', { code });
      verifyUserEmail();
      addToast(res.data.message || 'Email verified successfully!', 'success');
      setShowModal(false);
      setCode('');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Verification failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const res = await api.post('/auth/resend-verification');
      addToast(res.data.message || 'Verification code resent successfully!', 'success');
      setCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to resend code.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      {/* Banner */}
      <div className="w-full bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] border-b border-[color-mix(in_srgb,var(--color-warning)_20%,transparent)] px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm z-40 transition-colors">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
          <span className="text-[var(--color-text-secondary)] font-medium">
            Your email is unverified. Please verify your email <strong className="text-[var(--color-text-primary)] font-semibold">({user.email})</strong> to start predicting.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="py-1.5 px-4 bg-[var(--color-warning)] text-white font-semibold text-xs rounded-[var(--radius-sm)] hover:bg-[color-mix(in_srgb,var(--color-warning)_90%,black)] transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            Verify Now
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl w-full max-w-md p-8 relative animate-scale-up">
            <button
              onClick={() => {
                setShowModal(false);
                setCode('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)] flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Verify Your Email</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs">
                We sent a 6-digit verification code to <strong className="text-[var(--color-text-primary)] font-semibold">{user.email}</strong>.
              </p>

              <form onSubmit={handleVerify} className="w-full space-y-5">
                <div>
                  <input
                    type="text"
                    pattern="\d*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center px-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] font-mono text-2xl tracking-[0.75rem] font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-text-muted)] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setCode('');
                    }}
                    className="flex-1 btn-secondary py-3 text-sm font-semibold rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3 text-sm font-bold rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white shadow-md flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-xs text-[var(--color-text-secondary)]">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="text-[var(--color-primary)] font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
