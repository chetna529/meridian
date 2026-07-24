"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  User, Award, Shield, CheckCircle2, UserPlus, UserMinus, 
  Settings, Key, Eye, EyeOff, ShieldCheck, Mail, Phone,
  Clock, Lock, Bell, Check, Edit2, ShieldAlert, Monitor, Sparkles,
  CreditCard, ArrowUpRight, ArrowDownRight, Globe, Trash2, LogOut,
  Coins, Heart, TrendingUp, AlertTriangle, Languages, Layout, CheckCircle
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Link from 'next/link';

type TabType = 'profile' | 'stats' | 'wallet' | 'predictions' | 'notifications' | 'security' | 'preferences' | 'activity' | 'achievements' | 'markets';

export default function ProfilePage() {
  const params = useParams();
  const username = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const router = useRouter();
  const { user: currentUser, isAuthenticated, logout } = useAuthStore();
  const { addToast, theme, setTheme } = useUIStore();
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    bio: '',
    phone: '',
    country: '',
    timezone: '',
    avatarUrl: ''
  });

  // Wallet Modals States
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  // Security Form States
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  const [deleteForm, setDeleteForm] = useState({
    password: ''
  });

  const isSelf = currentUser && currentUser.username === username;

  const fetchProfile = async () => {
    if (!username) return;
    setLoading(true);
    try {
      if (isSelf) {
        const res = await api.get('/users/me/profile-detail');
        setProfileData(res.data);
        setProfileForm({
          fullName: res.data.user.fullName || '',
          bio: res.data.user.bio || '',
          phone: res.data.user.phone || '',
          country: res.data.user.country || '',
          timezone: res.data.user.timezone || '',
          avatarUrl: res.data.user.avatarUrl || ''
        });
      } else {
        const res = await api.get(`/users/${username}`);
        setProfileData({ user: res.data });
        if (currentUser) {
          const following = res.data.followers?.some((f: any) => f.followerId === currentUser.id);
          setIsFollowing(!!following);
        }
      }
    } catch (err: any) {
      console.error(err);
      addToast('User not found or failed to load', 'error');
      router.push('/markets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, isSelf]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      addToast('Please login to follow users', 'error');
      return;
    }
    try {
      if (isFollowing) {
        await api.post(`/users/${profileData.user.id}/unfollow`);
        setIsFollowing(false);
        addToast(`Unfollowed @${profileData.user.username}`, 'success');
      } else {
        await api.post(`/users/${profileData.user.id}/follow`);
        setIsFollowing(true);
        addToast(`Followed @${profileData.user.username}`, 'success');
      }
      fetchProfile();
    } catch (err) {
      console.error(err);
      addToast('Action failed', 'error');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await api.put('/users/me/profile', profileForm);
      setProfileData((prev: any) => ({
        ...prev,
        user: { ...prev.user, ...res.data.user }
      }));
      setIsEditing(false);
      addToast('Profile details updated!', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update profile', 'error');
    }
  };

  const handleUpdatePreference = async (field: string, value: any) => {
    try {
      const res = await api.put('/users/me/profile', { [field]: value });
      setProfileData((prev: any) => ({
        ...prev,
        user: { ...prev.user, ...res.data.user }
      }));
      if (field === 'themePreference') {
        setTheme(value);
      }
      addToast('Preference saved successfully', 'success');
    } catch (err) {
      addToast('Failed to update preference', 'error');
    }
  };

  const handleToggleNotification = async (field: string, currentValue: boolean) => {
    try {
      const res = await api.put('/users/me/profile', { [field]: !currentValue });
      setProfileData((prev: any) => ({
        ...prev,
        user: { ...prev.user, ...res.data.user }
      }));
      addToast('Notification settings updated', 'success');
    } catch (err) {
      addToast('Failed to update notifications', 'error');
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(walletAmount);
    if (!amount || amount <= 0) {
      addToast('Invalid amount', 'error');
      return;
    }
    setWalletLoading(true);
    try {
      await api.post('/wallet/deposit', { amount });
      addToast(`Simulated deposit of ${amount} points successful!`, 'success');
      setDepositOpen(false);
      setWalletAmount('');
      // Refresh user balance and ledger
      fetchProfile();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Deposit failed', 'error');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(walletAmount);
    if (!amount || amount <= 0) {
      addToast('Invalid amount', 'error');
      return;
    }
    setWalletLoading(true);
    try {
      await api.post('/wallet/withdraw', { amount });
      addToast(`Simulated withdrawal of ${amount} points complete!`, 'success');
      setWithdrawOpen(false);
      setWalletAmount('');
      fetchProfile();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Withdrawal failed', 'error');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    try {
      await api.post('/users/me/security/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      addToast('Password updated successfully!', 'success');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update password', 'error');
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/me/security/change-email', emailForm);
      addToast('Email changed! Please verify your new email address.', 'success');
      setEmailForm({ newEmail: '', password: '' });
      fetchProfile();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update email', 'error');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you absolutely sure you want to delete your account? This action is irreversible.')) {
      return;
    }
    try {
      await api.delete('/users/me', { data: { password: deleteForm.password } });
      addToast('Account deleted successfully. We are sad to see you go.', 'success');
      logout();
      router.push('/auth/login');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to delete account', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-4">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[var(--color-text-secondary)] font-semibold uppercase tracking-wider animate-pulse">Loading profile dashboard...</p>
      </div>
    );
  }

  const { user, stats, walletDetails, recentMarkets, activities } = profileData;

  // Custom static representation of standard achievements
  const achievementCatalog = [
    { type: 'FIRST_PREDICTION', badge: '🥇', name: 'First Prediction', desc: 'Placed your first market prediction.' },
    { type: 'WIN_STREAK_5', badge: '🎯', name: '5-Win Streak', desc: 'Won 5 predictions in a row.' },
    { type: 'PROFIT_CLUB_1000', badge: '💰', name: '₹1,000 Profit Club', desc: 'Made ₹1,000 or more in profit.' },
    { type: 'TOP_PREDICTOR', badge: '🔥', name: 'Top Predictor', desc: 'Maintained 80%+ accuracy with 10+ predictions.' },
    { type: 'EARLY_ADOPTER', badge: '🚀', name: 'Early Adopter', desc: 'Joined Meridian in its early stages.' }
  ];

  // Render Public / View Other Profile Page
  if (!isSelf) {
    const earnedBadgesTypes = user.badges?.map((b: any) => b.badge.badgeType) || [];
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 xl:px-12 pt-28 pb-20">
        <div className="card mb-8 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-br from-[var(--color-bg-secondary)]/50 to-[var(--color-bg-tertiary)]/50 border border-[var(--color-border)] rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full filter blur-3xl -z-10"></div>
          
          <div className="relative group">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-24 h-24 rounded-full border-4 border-[var(--color-border)] object-cover shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-md border-4 border-[var(--color-border)] select-none">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-[var(--color-bg-primary)] flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5 text-white" />
            </span>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                {user.fullName || user.username}
              </h1>
              <span className="self-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                Level {user.level} XP {user.xpPoints}
              </span>
            </div>
            
            <p className="font-mono text-sm text-[var(--color-text-secondary)]">@{user.username}</p>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-2xl">{user.bio || 'This predictor has not set a bio yet.'}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-[var(--color-text-secondary)] pt-2">
              <div>Joined: <strong className="text-[var(--color-text-primary)]">{new Date(user.createdAt).toLocaleDateString()}</strong></div>
              <div>Reputation: <strong className="text-indigo-500">{user.reputationScore} Points</strong></div>
              <div>Accuracy: <strong className="text-emerald-500">{user.accuracyPercentage}%</strong></div>
            </div>
          </div>

          {currentUser?.id !== user.id && (
            <button
              onClick={handleFollowToggle}
              className={`btn flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isFollowing ? 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]' : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'}`}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4.5 h-4.5" /> Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="w-4.5 h-4.5" /> Follow
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Badges */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                Achievements
              </h2>
              <div className="space-y-3">
                {achievementCatalog.map(ac => {
                  const hasEarned = earnedBadgesTypes.includes(ac.type);
                  return (
                    <div key={ac.type} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${hasEarned ? 'bg-indigo-500/5 border-indigo-500/20' : 'opacity-40 border-dashed border-[var(--color-border)]'}`}>
                      <span className="text-2xl">{ac.badge}</span>
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{ac.name}</p>
                        <p className="text-[10px] text-[var(--color-text-secondary)]">{ac.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Public predictions */}
          <div className="lg:col-span-2 card p-6 border border-[var(--color-border)] rounded-2xl">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Recent Predictions
            </h2>
            <div className="space-y-4">
              {user.predictions?.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-[var(--color-bg-secondary)]/50 rounded-xl border border-[var(--color-border)] gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{p.market.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Option Selected: <strong className="uppercase text-indigo-500">{p.option?.optionText || (p.optionId ? 'YES' : 'NO')}</strong></p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>Staked: <strong className="text-[var(--color-text-primary)]">${Number(p.amountStaked).toLocaleString()}</strong></div>
                    <div>
                      {p.status === 'WON' && <span className="bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">WON</span>}
                      {p.status === 'LOST' && <span className="bg-rose-500/10 text-rose-500 font-bold px-2 py-0.5 rounded-full border border-rose-500/20">LOST</span>}
                      {p.status === 'PENDING' && <span className="bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">PENDING</span>}
                    </div>
                  </div>
                </div>
              ))}
              {(!user.predictions || user.predictions.length === 0) && (
                <p className="text-sm text-[var(--color-text-secondary)] text-center py-10">No public predictions placed yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Self Premium Dashboard Page (For Logged In User)
  const earnedBadgesTypes = user.badges?.map((b: any) => b.badge?.badgeType) || [];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 xl:px-12 pt-24 pb-20">
      
      {/* Top Banner Cover Card */}
      <div className="card mb-8 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-br from-[var(--color-bg-secondary)]/90 via-[var(--color-surface)]/95 to-[var(--color-bg-secondary)]/90 border border-[var(--color-border)] rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 to-purple-600/10 rounded-full filter blur-3xl -z-10"></div>
        <div className="relative group">
          {profileForm.avatarUrl ? (
            <img src={profileForm.avatarUrl} alt={user.username} className="w-24 h-24 rounded-full border-4 border-indigo-500 object-cover shadow-lg" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-md border-4 border-[var(--color-border)] select-none">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-1 right-1 w-6.5 h-6.5 rounded-full bg-blue-500 border-2 border-[var(--color-bg-primary)] flex items-center justify-center shadow-md">
            <CheckCircle className="w-4.5 h-4.5 text-white" />
          </span>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {user.fullName || 'Meridian Predictor'}
            </h1>
            <span className="self-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Level {user.level} (XP {user.xpPoints})
            </span>
            {user.isAdmin && (
              <span className="self-center bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                ADMIN
              </span>
            )}
          </div>
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">@{user.username}</p>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-2xl">{user.bio || 'Personalize your profile page by adding a bio.'}</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs text-[var(--color-text-secondary)] pt-1">
            <div>Joined: <strong className="text-[var(--color-text-primary)]">{new Date(user.createdAt).toLocaleDateString()}</strong></div>
            <div>Wallet Status: <strong className="text-emerald-500">Active</strong></div>
            <div>Email Status: <strong className={user.isEmailVerified ? "text-emerald-500" : "text-amber-500"}>{user.isEmailVerified ? "Verified" : "Unverified"}</strong></div>
            <div>Last Login: <strong className="text-[var(--color-text-primary)]">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Just now'}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        
        {/* Left Side Tab Navigation */}
        <div className="space-y-4">
          <div className="card p-3 space-y-1.5 border border-[var(--color-border)] rounded-2xl shadow-sm">
            <h3 className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)] px-3 mb-2">My Profile Sections</h3>
            
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'profile' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Profile Info</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'stats' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Prediction Stats</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'wallet' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span>Wallet & Funds</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('markets')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'markets' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-indigo-500" />
                <span>Recent Markets</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'activity' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Recent Activity</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'achievements' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-indigo-500" />
                <span>Achievements ⭐</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'notifications' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-indigo-500" />
                <span>Notifications</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'security' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-indigo-500" />
                <span>Security</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${activeTab === 'preferences' ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm border-l-4 border-indigo-500' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Preferences</span>
              </span>
            </button>
          </div>

          {user.isAdmin && (
            <div className="card p-4 border border-[var(--color-border)] rounded-2xl text-center space-y-2.5">
              <ShieldAlert className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="text-xs text-[var(--color-text-secondary)] font-semibold">Admin Panel Quick Link</p>
              <Link href="/admin" className="btn-primary block py-2 text-xs font-bold rounded-lg text-center">
                Go to Admin Panel
              </Link>
            </div>
          )}
        </div>

        {/* Right Side Content Pane */}
        <div className="space-y-6">
          
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="font-extrabold text-xl text-[var(--color-text-primary)]">Basic & Account Information</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Manage your identity details</p>
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-1.5 rounded-xl"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Phone Number</label>
                      <input 
                        type="text" 
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Country</label>
                      <input 
                        type="text" 
                        value={profileForm.country}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. India"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Timezone</label>
                      <input 
                        type="text" 
                        value={profileForm.timezone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. UTC+5:30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Avatar URL</label>
                    <input 
                      type="text" 
                      value={profileForm.avatarUrl}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                      placeholder="Paste image URL directly"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Bio</label>
                    <textarea 
                      rows={3}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] resize-none focus:outline-none focus:border-indigo-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setProfileForm({
                          fullName: user.fullName || '',
                          bio: user.bio || '',
                          phone: user.phone || '',
                          country: user.country || '',
                          timezone: user.timezone || '',
                          avatarUrl: user.avatarUrl || ''
                        });
                        setIsEditing(false);
                      }}
                      className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      className="btn-primary px-5 py-2 text-xs font-bold rounded-xl"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Full Name</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{user.fullName || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Username</span>
                    <span className="font-mono text-[var(--color-text-primary)]">@{user.username}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Email Address</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{user.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Phone Number</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{user.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Country</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{user.country || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Timezone</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{user.timezone || 'Not provided'}</span>
                  </div>
                  
                  <div className="sm:col-span-2 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">KYC Status</span>
                      <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-full inline-block">
                        {user.kycStatus || 'Unverified'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Account Verified</span>
                      <span className={`border text-xs font-bold px-2 py-0.5 rounded-full inline-block ${user.isEmailVerified ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                        {user.isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Referral Code</span>
                      <span className="font-mono font-bold text-[var(--color-text-primary)]">
                        {user.referralCode}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Referrals Count</span>
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {user.referralCount} Referees
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREDICTION STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] mb-2">Prediction Statistics 📊</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-6">Real-time analytical stats of all predictions placed by you</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] rounded-2xl p-4 text-center">
                    <p className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-1">Total Predictions</p>
                    <p className="text-3xl font-extrabold text-[var(--color-text-primary)]">{stats.totalPredictions}</p>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] rounded-2xl p-4 text-center">
                    <p className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-1">Win Rate %</p>
                    <p className="text-3xl font-extrabold text-emerald-500">{stats.winRate}%</p>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] rounded-2xl p-4 text-center">
                    <p className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-1">Profit/Loss (Net)</p>
                    <p className={`text-3xl font-extrabold font-mono ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {stats.netProfit >= 0 ? '+' : '-'}${Math.abs(stats.netProfit).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] rounded-2xl p-4 text-center">
                    <p className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-1">Pending Predictions</p>
                    <p className="text-3xl font-extrabold text-amber-500">{stats.pendingPredictions.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-[var(--color-bg-secondary)]/30 border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase">Highest Single Win</p>
                      <p className="text-2xl font-extrabold text-[var(--color-text-primary)] mt-1 font-mono">${stats.highestSingleWin.toLocaleString()}</p>
                    </div>
                    <Award className="w-8 h-8 text-amber-500" />
                  </div>
                  
                  <div className="bg-[var(--color-bg-secondary)]/30 border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase">Favorite Category</p>
                      <p className="text-2xl font-extrabold text-[var(--color-text-primary)] mt-1">{stats.favoriteCategory}</p>
                    </div>
                    <Sparkles className="w-8 h-8 text-indigo-500" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                    <p className="text-[10px] text-emerald-500 uppercase font-extrabold tracking-wider">Won Predictions</p>
                    <p className="text-xl font-bold text-emerald-500 mt-1">{stats.wonPredictions.length}</p>
                  </div>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-center">
                    <p className="text-[10px] text-rose-500 uppercase font-extrabold tracking-wider">Lost Predictions</p>
                    <p className="text-xl font-bold text-rose-500 mt-1">{stats.lostPredictions.length}</p>
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                    <p className="text-[10px] text-amber-500 uppercase font-extrabold tracking-wider">Pending Predictions</p>
                    <p className="text-xl font-bold text-amber-500 mt-1">{stats.pendingPredictions.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WALLET 💰 */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              
              {/* Wallet Header & Quick Actions */}
              <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg-secondary)]/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase font-bold tracking-wider text-[var(--color-text-muted)]">Current Wallet Balance</p>
                    <h2 className="text-4xl font-extrabold text-[var(--color-text-primary)] mt-1 font-mono">${walletDetails.balance.toLocaleString()}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setDepositOpen(true)}
                      className="btn-primary px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" /> Deposit Funds
                    </button>
                    <button 
                      onClick={() => setWithdrawOpen(true)}
                      className="btn-secondary px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <ArrowDownRight className="w-4 h-4" /> Withdraw Funds
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--color-border)]">
                  <div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase font-bold tracking-wider mb-1">Total Deposits</p>
                    <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">${walletDetails.totalDeposits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase font-bold tracking-wider mb-1">Total Withdrawals</p>
                    <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">${walletDetails.totalWithdrawals.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase font-bold tracking-wider mb-1">Total Winnings</p>
                    <p className="text-lg font-bold font-mono text-emerald-500">${walletDetails.totalWinnings.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase font-bold tracking-wider mb-1">Total Losses</p>
                    <p className="text-lg font-bold font-mono text-rose-500">${walletDetails.totalLosses.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Transaction history log */}
              <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-lg text-[var(--color-text-primary)] mb-4">Wallet Transaction History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase font-bold">
                        <th className="py-3 px-2">Date</th>
                        <th className="py-3 px-2">Type</th>
                        <th className="py-3 px-2">Amount</th>
                        <th className="py-3 px-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/50 text-[var(--color-text-primary)]">
                      {user.walletLedgers?.map((ledger: any) => (
                        <tr key={ledger.id} className="hover:bg-[var(--color-bg-secondary)]/25 transition-colors">
                          <td className="py-3 px-2">{new Date(ledger.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] border ${ledger.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                              {ledger.type === 'CREDIT' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {ledger.subType || ledger.type}
                            </span>
                          </td>
                          <td className={`py-3 px-2 font-mono font-bold ${ledger.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {ledger.type === 'CREDIT' ? '+' : '-'}${Number(ledger.amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-[var(--color-text-secondary)]">
                            ${Number(ledger.balanceAfter).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {(!user.walletLedgers || user.walletLedgers.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-[var(--color-text-secondary)]">No wallet ledger transactions recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RECENT MARKETS */}
          {activeTab === 'markets' && (
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] mb-2">Recent Markets Overview</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-6">Overview of the last 10 markets you participated in</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase font-bold">
                      <th className="py-3 px-2">Market Name</th>
                      <th className="py-3 px-2">Prediction</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Invested</th>
                      <th className="py-3 px-2 text-right">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/50 text-[var(--color-text-primary)]">
                    {recentMarkets.map((rm: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[var(--color-bg-secondary)]/25 transition-colors">
                        <td className="py-3 px-2 font-semibold max-w-xs truncate">{rm.marketName}</td>
                        <td className="py-3 px-2 font-mono uppercase text-indigo-500 font-bold">{rm.prediction}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            rm.status === 'WON' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                            rm.status === 'LOST' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {rm.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono">${rm.amountInvested.toLocaleString()}</td>
                        <td className={`py-3 px-2 text-right font-mono font-bold ${rm.profitLoss > 0 ? 'text-emerald-500' : (rm.profitLoss < 0 ? 'text-rose-500' : 'text-[var(--color-text-secondary)]')}`}>
                          {rm.status === 'PENDING' ? '--' : (rm.profitLoss >= 0 ? '+' : '-') + '$' + Math.abs(rm.profitLoss).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {recentMarkets.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[var(--color-text-secondary)]">No predictions placed in any markets yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RECENT ACTIVITY TIMELINE */}
          {activeTab === 'activity' && (
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] mb-2">Recent Activity Log</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-6">Timeline of your latest activities and transactions</p>

              <div className="relative pl-6 border-l-2 border-[var(--color-border)] space-y-6">
                {activities.map((act: any) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[var(--color-surface)] border-2 border-indigo-500 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">{act.title}</h4>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{new Date(act.date).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ACHIEVEMENTS ⭐ */}
          {activeTab === 'achievements' && (
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
              <div className="mb-6 pb-4 border-b border-[var(--color-border)]">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] flex items-center gap-2">
                  <Award className="w-6 h-6 text-indigo-500" />
                  Achievements & Reputation
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Unlock premium badges by predicting accurately and trading on the platform</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievementCatalog.map(ac => {
                  const hasEarned = earnedBadgesTypes.includes(ac.type);
                  return (
                    <div key={ac.type} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                      hasEarned 
                        ? 'bg-indigo-500/[0.03] border-indigo-500/25 shadow-sm' 
                        : 'opacity-40 border-dashed border-[var(--color-border)] bg-transparent'
                    }`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-sm border ${hasEarned ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]'}`}>
                        {ac.badge}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">{ac.name}</p>
                          {hasEarned ? (
                            <span className="text-[10px] text-emerald-500 font-extrabold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--color-text-muted)] font-extrabold">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">{ac.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra badges */}
              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-[var(--color-text-secondary)] mb-4">Other Badges Available</h4>
                <div className="flex flex-wrap gap-2">
                  {user.badges?.filter((b: any) => !achievementCatalog.some(ac => ac.type === b.badge?.badgeType)).map((b: any) => (
                    <span key={b.id} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      🏆 {b.badge?.displayName}
                    </span>
                  ))}
                  {user.badges?.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)]">Predict and earn xp to unlock other badges.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
              <div className="mb-6 pb-4 border-b border-[var(--color-border)]">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)]">Notification Preferences</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Manage your push and email alert notifications</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]/50">
                  <div>
                    <span className="block font-bold text-sm text-[var(--color-text-primary)]">Email Notifications</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">Receive operations logs, disputes, and account verifications.</span>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('emailNotifications', user.emailNotifications)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.emailNotifications ? 'bg-indigo-600' : 'bg-gray-400'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.emailNotifications ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]/50">
                  <div>
                    <span className="block font-bold text-sm text-[var(--color-text-primary)]">Wallet Updates</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">Get alerts on deposits, withdrawals, and credits.</span>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('walletUpdates', user.walletUpdates)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.walletUpdates ? 'bg-indigo-600' : 'bg-gray-400'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.walletUpdates ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]/50">
                  <div>
                    <span className="block font-bold text-sm text-[var(--color-text-primary)]">Market Result Alerts</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">Receive push alerts immediately when a market you predicted settles.</span>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('marketResultAlerts', user.marketResultAlerts)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.marketResultAlerts ? 'bg-indigo-600' : 'bg-gray-400'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.marketResultAlerts ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="block font-bold text-sm text-[var(--color-text-primary)]">New Market Announcements</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">Get notified when new markets are added.</span>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('newMarketAnnouncements', user.newMarketAnnouncements)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.newMarketAnnouncements ? 'bg-indigo-600' : 'bg-gray-400'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.newMarketAnnouncements ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Change Password Form */}
              <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] mb-6 pb-4 border-b border-[var(--color-border)]">Change Password</h3>
                
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Current Password</label>
                    <div className="relative">
                      <input 
                        type={showPass.current ? 'text' : 'password'}
                        value={passForm.currentPassword}
                        onChange={(e) => setPassForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full pl-3 pr-10 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                      >
                        {showPass.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">New Password</label>
                      <div className="relative">
                        <input 
                          type={showPass.new ? 'text' : 'password'}
                          value={passForm.newPassword}
                          onChange={(e) => setPassForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full pl-3 pr-10 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                        >
                          {showPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input 
                          type={showPass.confirm ? 'text' : 'password'}
                          value={passForm.confirmPassword}
                          onChange={(e) => setPassForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full pl-3 pr-10 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                        >
                          {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold rounded-xl">
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Change Email Form */}
              <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] mb-6 pb-4 border-b border-[var(--color-border)]">Change Email</h3>
                
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">New Email Address</label>
                      <input 
                        type="email"
                        value={emailForm.newEmail}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Confirm with Password</label>
                      <input 
                        type="password"
                        value={emailForm.password}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold rounded-xl">
                      Update Email
                    </button>
                  </div>
                </form>
              </div>

              {/* App Authenticator 2FA Mock */}
              <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)] mb-2">Two-Factor Authentication (2FA)</h3>
                <div className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)]/50 rounded-xl border border-[var(--color-border)]">
                  <div>
                    <span className="block font-bold text-sm text-[var(--color-text-primary)]">App Authenticator (Coming Soon)</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">Secure your account with 2FA codes.</span>
                  </div>
                  <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                    COMING SOON
                  </span>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card p-6 border border-rose-500/20 rounded-2xl shadow-sm bg-rose-500/[0.02]">
                <h3 className="font-extrabold text-xl text-rose-500 mb-2">Danger Zone</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-6">Actions that could permanently delete or affect your account</p>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-rose-500/10 rounded-xl">
                  <div>
                    <span className="block font-bold text-sm text-[var(--color-text-primary)]">Delete Account</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">Permanently erase your trading profile, transaction ledger and data.</span>
                  </div>
                  
                  <form onSubmit={handleDeleteAccount} className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="password"
                      placeholder="Verify password to delete"
                      value={deleteForm.password}
                      onChange={(e) => setDeleteForm({ password: e.target.value })}
                      className="px-3 py-1.5 border border-rose-500/20 rounded-lg text-xs bg-[var(--color-surface)] focus:outline-none"
                      required
                    />
                    <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Account
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="card p-6 border border-[var(--color-border)] rounded-2xl shadow-sm">
              <div className="mb-6 pb-4 border-b border-[var(--color-border)]">
                <h3 className="font-extrabold text-xl text-[var(--color-text-primary)]">Preferences & Layout Settings</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Manage themes, currency displaying, and layout choices</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-[var(--color-text-secondary)] mb-3">Theme Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleUpdatePreference('themePreference', 'light')}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${theme === 'light' ? 'border-indigo-500 bg-indigo-500/5 text-indigo-500' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}
                    >
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>Light Theme</span>
                    </button>
                    <button
                      onClick={() => handleUpdatePreference('themePreference', 'dark')}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/5 text-indigo-500' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}
                    >
                      <Shield className="w-5 h-5 text-indigo-500" />
                      <span>Dark Theme</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-[var(--color-border)]/50">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Preferred Currency</label>
                    <select 
                      value={user.preferredCurrency || 'INR'}
                      onChange={(e) => handleUpdatePreference('preferredCurrency', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Language</label>
                    <select 
                      value={user.languagePreference || 'English'}
                      onChange={(e) => handleUpdatePreference('languagePreference', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Recommended Layout</label>
                    <select 
                      value={user.recommendedLayout || 'Default'}
                      onChange={(e) => handleUpdatePreference('recommendedLayout', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                    >
                      <option value="Default">Default</option>
                      <option value="Compact">Compact</option>
                      <option value="Comfortable">Comfortable</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DEPOSIT MODAL */}
      {depositOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-extrabold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" /> Simulated Cash Deposit
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">Enter the amount of virtual points you wish to credit to your account balance.</p>
            
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-text-secondary)]">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
                  onClick={() => { setDepositOpen(false); setWalletAmount(''); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary px-5 py-2 text-xs font-bold rounded-xl" 
                  disabled={walletLoading}
                >
                  {walletLoading ? 'Crediting...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-extrabold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
              <Coins className="w-5 h-5 text-rose-500" /> Simulated Cash Withdrawal
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">Specify how many points you want to withdraw from your available wallet balance.</p>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Withdraw Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-text-secondary)]">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max={walletDetails.balance}
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder={`Max $${walletDetails.balance.toLocaleString()}`}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
                  onClick={() => { setWithdrawOpen(false); setWalletAmount(''); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary px-5 py-2 text-xs font-bold rounded-xl" 
                  disabled={walletLoading}
                >
                  {walletLoading ? 'Debiting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
