'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user?.isAdmin) {
      router.push('/auth/login');
    }
  }, [user?.isAdmin, router]);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="w-full h-[calc(100vh-64px)] text-sm overflow-hidden flex flex-col">
      <div className="w-full mx-auto px-4 sm:px-5 lg:px-6 py-4 flex-1 min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4 h-full">
          <AdminSidebar />
          <main className="h-full overflow-y-auto pr-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

