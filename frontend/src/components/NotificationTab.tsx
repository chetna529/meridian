'use client';
import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function NotificationTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch notifications
    const fetchNotifications = () => {
      api.get('/notifications')
        .then(res => setNotifications(res.data))
        .catch(console.error);
    };

    fetchNotifications();
    
    // Simple polling for MVP (could use sockets here too)
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[var(--color-border)] overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-light)] bg-gray-50">
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
                  <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.readAt ? 'bg-indigo-50/30' : ''}`}>
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
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)]">You're all caught up!</p>
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-[var(--color-border-light)] text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-[var(--color-primary)]">View All Notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
