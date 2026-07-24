'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Skeleton';

export default function NotificationCenterPage() {
  const { addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'ALL' | 'SPECIFIC_USER'>('ALL');
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/admin/notifications');
      setHistory(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (target !== 'SPECIFIC_USER' || !userQuery) {
      setUserOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      api.get('/users/admin/all', { params: { search: userQuery } }).then((res) => setUserOptions(res.data.slice(0, 8))).catch(() => setUserOptions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [userQuery, target]);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return addToast('Title and message are required', 'error');
    if (target === 'SPECIFIC_USER' && !targetUserId) return addToast('Select a target user', 'error');
    if (scheduleEnabled && !scheduledFor) return addToast('Choose a send time', 'error');

    setSubmitting(true);
    try {
      await api.post('/admin/notifications', {
        title,
        message,
        target,
        targetUserId: target === 'SPECIFIC_USER' ? targetUserId : undefined,
        scheduledFor: scheduleEnabled ? new Date(scheduledFor).toISOString() : undefined,
      });
      addToast(scheduleEnabled ? 'Notification scheduled' : 'Notification sent', 'success');
      setTitle('');
      setMessage('');
      setTargetUserId('');
      setUserQuery('');
      setScheduleEnabled(false);
      setScheduledFor('');
      fetchHistory();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to send notification', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBroadcast = async (id: string) => {
    try {
      await api.post(`/admin/notifications/${id}/cancel`);
      addToast('Broadcast cancelled', 'success');
      fetchHistory();
    } catch {
      addToast('Failed to cancel', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-text-primary">Notification Center</h1>
        <p className="text-sm text-text-secondary mt-1">Send targeted or platform-wide messages, immediately or on a schedule.</p>
      </div>

      <div className="card p-5 border border-border space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={3} className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />

        <div className="flex gap-2">
          <button onClick={() => setTarget('ALL')} className={`px-4 py-2 rounded-lg text-sm font-medium ${target === 'ALL' ? 'bg-primary text-white' : 'bg-[var(--color-bg-secondary)] text-text-secondary'}`}>All Users</button>
          <button onClick={() => setTarget('SPECIFIC_USER')} className={`px-4 py-2 rounded-lg text-sm font-medium ${target === 'SPECIFIC_USER' ? 'bg-primary text-white' : 'bg-[var(--color-bg-secondary)] text-text-secondary'}`}>Specific User</button>
        </div>

        {target === 'SPECIFIC_USER' && (
          <div className="relative">
            {targetUserId ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-bg-secondary)]">
                <span>Target: <strong>{userOptions.find((u) => u.id === targetUserId)?.username || targetUserId}</strong></span>
                <button onClick={() => { setTargetUserId(''); setUserQuery(''); }}><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search username..." className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]" />
                {userOptions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-[var(--color-surface)] shadow-lg max-h-48 overflow-y-auto">
                    {userOptions.map((u) => (
                      <button key={u.id} onClick={() => { setTargetUserId(u.id); setUserOptions([]); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)]">
                        {u.username} <span className="text-text-muted">({u.email})</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} />
          Schedule for later
        </label>
        {scheduleEnabled && (
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]"
          />
        )}

        <Button onClick={submit} loading={submitting}><Send className="w-4 h-4" /> {scheduleEnabled ? 'Schedule' : 'Send Now'}</Button>
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="p-4 border-b border-border">
          <h3 className="text-base font-semibold">Delivery history</h3>
        </div>
        {loading ? (
          <PageSpinner />
        ) : history.length === 0 ? (
          <EmptyState title="No notifications sent yet" />
        ) : (
          <div className="divide-y divide-border-light max-h-[32rem] overflow-y-auto">
            {history.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-text-secondary">{b.message}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {b.target === 'ALL' ? 'All users' : 'Specific user'} • {b.recipientCount} recipients • by {b.createdBy?.username}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge tone={b.status === 'SENT' ? 'success' : b.status === 'CANCELLED' ? 'neutral' : 'warning'}>{b.status}</Badge>
                  {b.status === 'SCHEDULED' && (
                    <Button size="sm" variant="danger" onClick={() => cancelBroadcast(b.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
