'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from '@/components/Navbar';
import ToastContainer from '@/components/ToastContainer';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import socket, { joinUserRoom } from '@/lib/socket';

// Admins never see the customer-facing marketing/home screen — they land on the dashboard.
const CUSTOMER_ONLY_ROUTES = ['/'];

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const hydrateTheme = useUIStore((state) => state.hydrateTheme);
  const userId = useAuthStore((state) => state.user?.id);
  const isAdmin = useAuthStore((state) => state.user?.isAdmin);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
  }, [hydrateAuth, hydrateTheme]);

  useEffect(() => {
    if (!userId) return;
    if (socket.connected) joinUserRoom(userId);
    else socket.once('connect', () => joinUserRoom(userId));
  }, [userId]);

  useEffect(() => {
    if (isAdmin && pathname && CUSTOMER_ONLY_ROUTES.includes(pathname)) {
      router.replace('/admin');
    }
  }, [isAdmin, pathname, router]);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] w-full flex flex-col">
        <EmailVerificationBanner />
        <div className="flex-1 w-full">
          {children}
        </div>
      </main>
      <ToastContainer />
    </GoogleOAuthProvider>
  );
}
