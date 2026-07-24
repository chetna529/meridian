'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import api from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Skeleton';

export default function AuditLogPage() {
  const { addToast } = useUIStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', { params: { action: actionFilter || undefined, cursor, take: 40 } });
      setLogs((prev) => (cursor ? [...prev, ...res.data.logs] : res.data.logs));
      setNextCursor(res.data.nextCursor);
    } catch {
      addToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, addToast]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Audit Log</h1>
          <p className="text-sm text-text-secondary mt-1">Every admin action, independent of application logs.</p>
        </div>
        <ScrollText className="w-5 h-5 text-primary" />
      </div>

      <div className="card p-4 border border-border">
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
          placeholder="Filter by action, e.g. RESOLVE_MARKET"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-[var(--color-surface)]"
        />
      </div>

      <div className="card p-4 border border-border">
        {loading && logs.length === 0 ? (
          <PageSpinner />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit log entries" />
        ) : (
          <>
            <div className="space-y-2 text-sm max-h-[36rem] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-text-secondary">{log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''} by {log.admin?.username || 'system'}</p>
                  </div>
                  <span className="text-xs text-text-secondary flex-shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {nextCursor && (
              <div className="pt-4 text-center">
                <Button variant="secondary" loading={loading} onClick={() => fetchLogs(nextCursor)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
