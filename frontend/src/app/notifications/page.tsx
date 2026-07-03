'use client';

import { Bell, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    api.get('/notifications')
      .then(res => setNotifications(res.data))
      .catch(err => {
        console.error(err);
        addToast('Unable to load notifications', 'error');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, addToast]);

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Please log in to view notifications.</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-[var(--color-primary)]" />
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Notifications</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Manage alert settings and see recent platform notifications.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="card p-5 border border-border">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-[var(--color-primary)]">
                    {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{notification.title}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{notification.message}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
