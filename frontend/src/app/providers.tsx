'use client';

import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from '@/components/Navbar';
import ToastContainer from '@/components/ToastContainer';
import { useAuthStore } from '@/store/authStore';

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] w-full">
        {children}
      </main>
      <ToastContainer />
    </GoogleOAuthProvider>
  );
}
