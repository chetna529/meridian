'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function WalletPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    api.get('/transactions')
      .then(res => {
        setTransactions(res.data);
      })
      .catch(err => {
        console.error(err);
        addToast('Unable to load transactions', 'error');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, addToast]);

  if (!isAuthenticated) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Please log in to view wallet and funds.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  if (isAuthenticated && !user) {
    return (
      <div className="w-full pt-28 pb-20 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">User information is not available. Please refresh or log in again.</p>
        <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
      </div>
    );
  }

  return (
    <div className="w-full pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] uppercase tracking-[0.18em]">Wallet balance</p>
                <h2 className="text-3xl font-semibold text-[var(--color-text-primary)]">${Number(user?.totalBalance || 0).toLocaleString()}</h2>
              </div>
              <CreditCard className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <div className="grid gap-3 text-sm text-[var(--color-text-secondary)]">
              <div className="flex justify-between"><span>Available balance</span><span>${Number(user?.totalBalance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Connected wallet</span><span>Not connected</span></div>
              <div className="flex justify-between"><span>Last deposit</span><span>--</span></div>
              <div className="flex justify-between"><span>Last withdrawal</span><span>--</span></div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Quick actions</h3>
            <div className="grid gap-3">
              <button className="btn-primary px-4 py-3 text-sm">Connect Wallet</button>
              <button className="btn-secondary px-4 py-3 text-sm">Deposit Funds</button>
              <button className="btn-secondary px-4 py-3 text-sm">Withdraw Funds</button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">Recent deposits, withdrawals, and trading fund movements.</p>
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">Showing latest 10 transactions</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] uppercase text-xs tracking-[0.16em]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">No transaction history available yet.</td>
                    </tr>
                  )}
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-4 py-3">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{transaction.type}</td>
                      <td className="px-4 py-3 font-semibold">${Number(transaction.amount).toLocaleString()}</td>
                      <td className="px-4 py-3">{transaction.status || 'Completed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
