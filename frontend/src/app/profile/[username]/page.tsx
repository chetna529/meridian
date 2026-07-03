 'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Award, Shield, CheckCircle2, UserPlus, UserMinus } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

interface PageProps {
  params: { username: string };
}

export default function ProfilePage({ params }: PageProps) {
  const resolvedParams = params;
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    api.get(`/users/${params.username}`)
      .then(res => {
        setProfileUser(res.data);
        if (currentUser) {
          const following = res.data.followers.some((f: any) => f.followerId === currentUser.id);
          setIsFollowing(following);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        addToast('User not found', 'error');
        router.push('/');
      });
  }, [params.username, currentUser, addToast, router]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      addToast('Please login to follow users', 'error');
      return;
    }
    try {
      if (isFollowing) {
        await api.post(`/users/${profileUser.id}/unfollow`);
        setIsFollowing(false);
        addToast(`Unfollowed ${profileUser.username}`, 'success');
      } else {
        await api.post(`/users/${profileUser.id}/follow`);
        setIsFollowing(true);
        addToast(`Followed ${profileUser.username}`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Action failed', 'error');
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      {/* Header card */}
      <div className="card mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <User className="w-12 h-12" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
            {profileUser.username}
            <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50" />
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">{profileUser.bio || 'This predictor has not set a bio yet.'}</p>
          <div className="flex items-center justify-center md:justify-start gap-6 mt-4 text-sm text-[var(--color-text-secondary)]">
            <div><strong className="text-[var(--color-text-primary)]">{profileUser.followers.length}</strong> Followers</div>
            <div><strong className="text-[var(--color-text-primary)]">{profileUser.following.length}</strong> Following</div>
            <div><strong className="text-[var(--color-text-primary)]">Level {profileUser.level}</strong> ({profileUser.xpPoints} XP)</div>
          </div>
        </div>
        {currentUser?.id !== profileUser.id && (
          <button
            onClick={handleFollowToggle}
            className={`btn flex items-center gap-2 ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isFollowing ? (
              <>
                <UserMinus className="w-4 h-4" /> Unfollow
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Follow
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar stats & badges */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" /> Stats & Reputation
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-[var(--color-text-secondary)]">Reputation Score</span>
                <span className="font-bold text-indigo-600">{profileUser.reputationScore}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-[var(--color-text-secondary)]">Accuracy</span>
                <span className="font-mono font-semibold">{profileUser.accuracyPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Points Balance</span>
                <span className="font-mono font-semibold">${Number(profileUser.totalBalance).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> Earned Badges
            </h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.badges.map((b: any) => (
                <span key={b.id} className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                  🏆 {b.badge.displayName}
                </span>
              ))}
              {profileUser.badges.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No badges earned yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent predictions list */}
        <div className="md:col-span-2 card">
          <h3 className="font-bold text-lg mb-6">Recent Prediction Activity</h3>
          <div className="space-y-4">
            {profileUser.predictions.map((p: any) => (
              <div key={p.id} className="border-b border-gray-100 pb-4">
                <div className="text-sm font-semibold mb-1">{p.market.title}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Predicted: <strong className="text-indigo-600 font-bold uppercase">{p.optionId ? 'YES' : 'NO'}</strong></span>
                  <span>Amount: <strong className="font-mono">${Number(p.amountStaked).toLocaleString()}</strong></span>
                  <span className="uppercase font-bold text-gray-500">{p.status}</span>
                </div>
              </div>
            ))}
            {profileUser.predictions.length === 0 && (
              <p className="text-sm text-gray-500 py-4">No recent predictions placed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
