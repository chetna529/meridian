'use client';
import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Star } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { isAuthenticated } = useAuthStore();
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
      <div className="w-full min-h-screen pb-20 bg-gray-50 pt-24 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">Log in or sign up to view the leaderboard.</p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/login" className="btn-primary py-3 px-6">Log In</Link>
          <Link href="/auth/register" className="btn-secondary py-3 px-6 bg-white">Sign Up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-20 bg-gray-50 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-12 mb-8">
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
        <div className="bg-white rounded-2xl shadow-lg p-12 mb-8">
          <div className="flex justify-center items-end gap-4 sm:gap-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="relative mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 border-4 border-gray-300 flex items-center justify-center text-2xl font-bold text-gray-400">
                  {filteredLeaders[1]?.user?.username ? filteredLeaders[1].user.username.substring(0, 1).toUpperCase() : '?'}
                </div>
                <Medal className="w-8 h-8 text-gray-400 absolute -bottom-3 -right-2 drop-shadow-md" />
              </div>
              <div className="font-bold text-center truncate w-full text-[var(--color-text-primary)] text-lg">{filteredLeaders[1]?.user?.username || 'Unknown'}</div>
              <div className="text-base font-mono text-[var(--color-text-secondary)]">${Number(filteredLeaders[1]?.user?.totalBalance || 0).toLocaleString()}</div>
              <div className="w-full h-24 bg-gradient-to-t from-gray-100 to-gray-50 border border-gray-200 border-b-0 rounded-t-lg mt-4 flex justify-center pt-4 font-bold text-gray-400 text-2xl">2</div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center flex-1 max-w-[180px] -translate-y-8">
              <div className="relative mb-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-yellow-100 border-4 border-yellow-400 flex items-center justify-center text-3xl font-bold text-yellow-600 shadow-xl">
                  {filteredLeaders[0]?.user?.username ? filteredLeaders[0].user.username.substring(0, 1).toUpperCase() : '?'}
                </div>
                <Trophy className="w-10 h-10 text-yellow-500 absolute -bottom-3 -right-2 drop-shadow-md" />
              </div>
              <div className="font-bold text-xl text-center truncate w-full text-[var(--color-text-primary)]">{filteredLeaders[0]?.user?.username || 'Unknown'}</div>
              <div className="text-lg font-mono font-bold text-yellow-600">${Number(filteredLeaders[0]?.user?.totalBalance || 0).toLocaleString()}</div>
              <div className="w-full h-32 bg-gradient-to-t from-yellow-50 to-white border border-yellow-200 border-b-0 rounded-t-lg mt-4 flex justify-center pt-4 font-bold text-yellow-500 text-3xl shadow-[0_-4px_20px_rgba(234,179,8,0.15)]">1</div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="relative mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-50 border-4 border-orange-300 flex items-center justify-center text-2xl font-bold text-orange-400">
                  {filteredLeaders[2]?.user?.username ? filteredLeaders[2].user.username.substring(0, 1).toUpperCase() : '?'}
                </div>
                <Award className="w-8 h-8 text-orange-400 absolute -bottom-3 -right-2 drop-shadow-md" />
              </div>
              <div className="font-bold text-center truncate w-full text-[var(--color-text-primary)] text-lg">{filteredLeaders[2]?.user?.username || 'Unknown'}</div>
              <div className="text-base font-mono text-[var(--color-text-secondary)]">${Number(filteredLeaders[2]?.user?.totalBalance || 0).toLocaleString()}</div>
              <div className="w-full h-20 bg-gradient-to-t from-orange-50 to-white border border-orange-200 border-b-0 rounded-t-lg mt-4 flex justify-center pt-4 font-bold text-orange-400 text-2xl">3</div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-20 flex justify-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && filteredLeaders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full text-base text-left">
            <thead className="bg-gray-100 text-[var(--color-text-secondary)] uppercase text-sm font-semibold">
              <tr>
                <th className="px-8 py-5 text-center">Rank</th>
                <th className="px-8 py-5">Trader</th>
                <th className="px-8 py-5 text-right">Portfolio Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeaders.slice(3).map((leader, index) => (
                <tr key={leader.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5 text-center font-bold text-[var(--color-text-muted)]">
                    {index + 4}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] flex items-center justify-center font-bold text-lg">
                        {leader.user?.username ? leader.user.username.substring(0, 1).toUpperCase() : '?'}
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
        <div className="bg-white rounded-2xl shadow-lg p-20 flex flex-col items-center justify-center text-center">
          <Trophy className="w-24 h-24 text-gray-300 mb-6" />
          <h2 className="text-2xl font-bold text-gray-400 mb-2">No Traders Yet</h2>
          <p className="text-gray-500">Be the first to join the leaderboard!</p>
        </div>
      )}
    </div>
    </div>
  );
}
