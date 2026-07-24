'use client';
import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import api from '@/lib/api';
import socket from '@/lib/socket';

export default function NotificationTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((state) => state.addToast);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchNotifications = () => {
      api.get('/notifications')
        .then(res => setNotifications(res.data))
        .catch(console.error);
    };

    fetchNotifications();

    // Real-time delivery via socket, with a slow poll as a fallback for missed events.
    const onNew = (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      addToast(notification.title, 'info');
    };
    socket.on('notification:new', onNew);

    const interval = setInterval(fetchNotifications, 60000);
    return () => {
      clearInterval(interval);
      socket.off('notification:new', onNew);
    };
  }, [isAuthenticated, addToast]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.post('/notifications/mark-read');
      setNotifications(notifications.map(n => ({ ...n, readAt: new Date().toISOString() })));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:bg-opacity-10 rounded-full transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-danger)] rounded-full border-2 border-[var(--color-bg-primary)]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-xl border border-[var(--color-border)] overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
            <h3 className="font-bold text-sm text-[var(--color-text-primary)]">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-[var(--color-border-light)]">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer ${!notification.readAt ? 'bg-[var(--color-primary)]/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!notification.readAt ? 'bg-[var(--color-primary)]' : 'bg-transparent'}`}></div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{notification.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-snug">{notification.message}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[var(--color-border-dark)] mx-auto mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)]">You're all caught up!</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-[var(--color-border-light)] text-center bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-[var(--color-primary)]">View All Notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
