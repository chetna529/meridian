'use client';
import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Star, User } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function LeaderboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const filteredLeaders = leaders.filter((leader) => !leader.user?.isAdmin);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    api.get('/leaderboard')
      .then(res => {
        setLeaders(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen pb-20 bg-[var(--color-bg-primary)] pt-24 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Log in or sign up to view the leaderboard.</p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
          <Link href="/auth/register" className="btn-secondary py-3 px-6 bg-white">Sign Up</Link>
        </div>
      </div>
    );
  }

  const leaderboardContent = (
    <div className="max-w-5xl mx-auto">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg p-12 mb-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Trophy className="w-24 h-24 text-yellow-500 mb-8" />
          <h1 className="text-5xl md:text-6xl font-bold text-[var(--color-text-primary)] mb-6">Top Traders</h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
            The sharpest minds on Meridian. Climb the ranks by making accurate predictions and building your portfolio balance.
          </p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && filteredLeaders.length >= 3 && (
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg p-12 mb-8">
          <div className="flex justify-center items-end gap-4 sm:gap-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="relative mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--color-bg-secondary)] border-4 border-[var(--color-border)] flex items-center justify-center font-bold text-[var(--color-text-muted)]">
                  <User size={32} />
                </div>
                <Medal className="w-8 h-8 text-[var(--color-text-muted)] absolute -bottom-3 -right-2 drop-shadow-md" />
              </div>
              <div className="font-bold text-center truncate w-full text-[var(--color-text-primary)] text-lg">{filteredLeaders[1]?.user?.username || 'Unknown'}</div>
              <div className="text-base font-mono text-[var(--color-text-secondary)]">${Number(filteredLeaders[1]?.user?.totalBalance || 0).toLocaleString()}</div>
              <div className="w-full h-24 bg-gradient-to-t from-[var(--color-bg-secondary)] to-[var(--color-surface)] border border-[var(--color-border)] border-b-0 rounded-t-lg mt-4 flex justify-center pt-4 font-bold text-[var(--color-text-muted)] text-2xl">2</div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center flex-1 max-w-[180px] -translate-y-8">
              <div className="relative mb-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-yellow-500/10 border-4 border-yellow-500/30 flex items-center justify-center font-bold text-yellow-500 shadow-xl">
                  <User size={40} />
                </div>
                <Trophy className="w-10 h-10 text-yellow-500 absolute -bottom-3 -right-2 drop-shadow-md" />
              </div>
              <div className="font-bold text-xl text-center truncate w-full text-[var(--color-text-primary)]">{filteredLeaders[0]?.user?.username || 'Unknown'}</div>
              <div className="text-lg font-mono font-bold text-yellow-500">${Number(filteredLeaders[0]?.user?.totalBalance || 0).toLocaleString()}</div>
              <div className="w-full h-32 bg-gradient-to-t from-yellow-500/10 to-[var(--color-surface)] border border-yellow-500/20 border-b-0 rounded-t-lg mt-4 flex justify-center pt-4 font-bold text-yellow-500 text-3xl shadow-[0_-4px_20px_rgba(234,179,8,0.15)]">1</div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="relative mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-500/10 border-4 border-orange-500/30 flex items-center justify-center font-bold text-orange-400">
                  <User size={32} />
                </div>
                <Award className="w-8 h-8 text-orange-400 absolute -bottom-3 -right-2 drop-shadow-md" />
              </div>
              <div className="font-bold text-center truncate w-full text-[var(--color-text-primary)] text-lg">{filteredLeaders[2]?.user?.username || 'Unknown'}</div>
              <div className="text-base font-mono text-[var(--color-text-secondary)]">${Number(filteredLeaders[2]?.user?.totalBalance || 0).toLocaleString()}</div>
              <div className="w-full h-20 bg-gradient-to-t from-orange-500/10 to-[var(--color-surface)] border border-orange-500/20 border-b-0 rounded-t-lg mt-4 flex justify-center pt-4 font-bold text-orange-400 text-2xl">3</div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg p-20 flex justify-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && filteredLeaders.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg overflow-hidden border border-[var(--color-border)]">
          <table className="w-full text-base text-left">
            <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] uppercase text-sm font-semibold">
              <tr>
                <th className="px-8 py-5 text-center">Rank</th>
                <th className="px-8 py-5">Trader</th>
                <th className="px-8 py-5 text-right">Portfolio Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredLeaders.slice(3).map((leader, index) => (
                <tr key={leader.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-8 py-5 text-center font-bold text-[var(--color-text-muted)]">
                    {index + 4}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-lg">
                        <User size={20} />
                      </div>
                      <span className="font-semibold text-[var(--color-text-primary)]">{leader.user?.username || 'Unknown'}</span>
                      {leader.user?.isAdmin && <span className="ml-2 px-3 py-1 bg-red-100 text-red-600 text-xs uppercase font-bold rounded">Admin</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-medium text-[var(--color-text-primary)]">
                    ${Number(leader.user?.totalBalance || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredLeaders.length === 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg p-20 flex flex-col items-center justify-center text-center border border-[var(--color-border)]">
          <Trophy className="w-24 h-24 text-[var(--color-text-muted)] mb-6 opacity-50" />
          <h2 className="text-2xl font-bold text-[var(--color-text-muted)] mb-2">No Traders Yet</h2>
          <p className="text-[var(--color-text-secondary)]">Be the first to join the leaderboard!</p>
        </div>
      )}
    </div>
  );

  if (user?.isAdmin) {
    return (
      <div className="w-full pb-12 pt-16 text-sm">
        <div className="w-full mx-auto px-4 sm:px-5 lg:px-6">
          <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4">
            <AdminSidebar />
            <main className="space-y-6 min-w-0">{leaderboardContent}</main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto min-h-screen pb-20 pt-8 px-4 md:px-8 xl:px-12">
      {leaderboardContent}
    </div>
  );
}
