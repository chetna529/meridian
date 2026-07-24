const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const walletService = require('../services/walletService');
const auditLog = require('../lib/auditLog');
const positionService = require('../services/positionService');
const bcrypt = require('bcrypt');
const { checkBadges } = require('../lib/gamification');

// Follow a user
exports.followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const followerId = req.user.userId;

    if (targetUserId === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const follow = await prisma.userFollower.upsert({
      where: {
        userId_followerId: {
          userId: targetUserId,
          followerId: followerId
        }
      },
      update: {},
      create: {
        userId: targetUserId,
        followerId: followerId
      }
    });

    res.status(201).json({ message: 'User followed successfully', follow });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const followerId = req.user.userId;

    await prisma.userFollower.delete({
      where: {
        userId_followerId: {
          userId: targetUserId,
          followerId: followerId
        }
      }
    });

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

// Admin: list all users with summary analytics
exports.getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ username: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : undefined,
      select: {
        id: true,
        username: true,
        email: true,
        totalBalance: true,
        investedBalance: true,
        reputationScore: true,
        accuracyPercentage: true,
        trustScore: true,
        level: true,
        xpPoints: true,
        isAdmin: true,
        isSuspended: true,
        suspendedReason: true,
        createdAt: true,
        predictions: { select: { id: true } },
        badges: { include: { badge: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = users.map((user) => ({
      ...user,
      predictionCount: user.predictions.length,
      badgesEarned: user.badges.map((earned) => earned.badge.displayName)
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Admin: grant a badge to a user
exports.grantBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const { badgeType } = req.body;

    if (!badgeType) {
      return res.status(400).json({ error: 'badgeType is required' });
    }

    const badge = await prisma.badge.findUnique({ where: { badgeType } });
    if (!badge) {
      return res.status(404).json({ error: 'Badge type not found' });
    }

    const existing = await prisma.badgeEarned.findUnique({
      where: {
        userId_badgeId: {
          userId: id,
          badgeId: badge.id
        }
      }
    });

    if (existing) {
      return res.status(200).json({ message: 'User already has this badge' });
    }

    await prisma.badgeEarned.create({
      data: {
        userId: id,
        badgeId: badge.id
      }
    });

    res.json({ message: `Badge ${badge.displayName} granted successfully` });
  } catch (error) {
    console.error('Error granting badge:', error);
    res.status(500).json({ error: 'Failed to grant badge' });
  }
};

// Get the current user's referral code + invite stats
exports.getMyReferrals = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referee: { select: { username: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const completed = referrals.filter((r) => r.status === 'COMPLETED');
    const totalRewards = completed.reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);

    res.json({
      referralCode: user.referralCode,
      inviteCount: referrals.length,
      completedCount: completed.length,
      totalRewards,
      referrals,
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};

// Admin: full profile + history for the user management detail view
exports.getUserDetailAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        predictions: { include: { market: { select: { title: true } }, option: { select: { optionText: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
        walletLedgers: { orderBy: { createdAt: 'desc' }, take: 20 },
        badges: { include: { badge: true } },
        fraudFlags: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const positions = await prisma.position.findMany({
      where: { userId: id },
      include: { market: { select: { title: true } }, option: true },
      orderBy: { createdAt: 'desc' },
    });

    const { passwordHash, ...safeUser } = user;
    res.json({ ...safeUser, positions: positions.map(positionService.enrichPosition) });
  } catch (error) {
    console.error('Error fetching user detail:', error);
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
};

// Admin: manually credit/debit a user's wallet (always ledgered, always audited)
exports.adjustUserWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, reason } = req.body;
    const numericAmount = Number(amount);

    if (!['CREDIT', 'DEBIT'].includes(type) || !numericAmount || numericAmount <= 0 || !reason) {
      return res.status(400).json({ error: 'type (CREDIT/DEBIT), a positive amount, and a reason are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const { user } = await walletService.applyLedgerEntry(tx, {
        userId: id,
        type,
        subType: 'ADMIN_ADJUSTMENT',
        amount: numericAmount,
        metadata: { reason, adminId: req.user.userId },
      });

      await tx.notification.create({
        data: {
          userId: id,
          type: 'WALLET_ADJUSTMENT',
          title: type === 'CREDIT' ? 'Balance adjusted (credit)' : 'Balance adjusted (debit)',
          message: `An admin ${type === 'CREDIT' ? 'credited' : 'debited'} ${numericAmount.toLocaleString()} points to your account: ${reason}`,
        },
      });

      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'ADJUST_USER_WALLET',
        entityType: 'User',
        entityId: id,
        changes: { type, amount: numericAmount, reason },
      });

      return user;
    });

    res.json({ message: 'Wallet adjusted', totalBalance: result.totalBalance });
  } catch (error) {
    console.error('Error adjusting wallet:', error);
    res.status(400).json({ error: error.message || 'Failed to adjust wallet' });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (id === req.user.userId) return res.status(400).json({ error: 'You cannot suspend your own account' });

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason || null },
      });
      await auditLog.record(tx, { adminId: req.user.userId, action: 'SUSPEND_USER', entityType: 'User', entityId: id, changes: { reason } });
      return user;
    });

    res.json({ message: 'User suspended', isSuspended: updated.isSuspended });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

exports.reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { isSuspended: false, suspendedAt: null, suspendedReason: null },
      });
      await auditLog.record(tx, { adminId: req.user.userId, action: 'REACTIVATE_USER', entityType: 'User', entityId: id, changes: {} });
      return user;
    });

    res.json({ message: 'User reactivated', isSuspended: updated.isSuspended });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
};

exports.setAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;
    if (id === req.user.userId) return res.status(400).json({ error: 'You cannot change your own admin status' });

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { isAdmin: Boolean(isAdmin) } });
      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: isAdmin ? 'GRANT_ADMIN' : 'REVOKE_ADMIN',
        entityType: 'User',
        entityId: id,
        changes: { isAdmin: Boolean(isAdmin) },
      });
      return user;
    });

    res.json({ message: 'Admin status updated', isAdmin: updated.isAdmin });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
};

// Get public profile (resolves by ID or username)
exports.getUserProfile = async (req, res) => {
  try {
    const queryParam = req.params.id;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(queryParam);

    const user = await prisma.user.findFirst({
      where: isUuid ? { id: queryParam } : { username: queryParam },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        reputationScore: true,
        accuracyPercentage: true,
        totalBalance: true,
        investedBalance: true,
        level: true,
        xpPoints: true,
        createdAt: true,
        followers: {
          select: { followerId: true }
        },
        following: {
          select: { userId: true }
        },
        predictions: {
          include: { market: true },
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        badges: {
          include: { badge: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// GET /api/users/me/profile-detail
exports.getMyProfileDetail = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Run checkBadges transactionally to make sure user has correct badges before loading profile
    await prisma.$transaction(async (tx) => {
      await checkBadges(tx, userId);
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referralsMade: {
          include: { referee: { select: { username: true, createdAt: true } } }
        },
        badges: {
          include: { badge: true }
        },
        predictions: {
          include: { market: true, option: true },
          orderBy: { createdAt: 'desc' }
        },
        walletLedgers: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculations
    const predictions = user.predictions;
    const totalPredictions = predictions.length;
    const wonPredictions = predictions.filter(p => p.status === 'WON');
    const lostPredictions = predictions.filter(p => p.status === 'LOST');
    const pendingPredictions = predictions.filter(p => p.status === 'PENDING');

    const resolvedCount = wonPredictions.length + lostPredictions.length;
    const winRatePercentage = resolvedCount > 0 ? Number(((wonPredictions.length / resolvedCount) * 100).toFixed(1)) : 0;

    // Profit details
    const totalWinnings = wonPredictions.reduce((sum, p) => sum + (Number(p.potentialReturn || 0) - Number(p.amountStaked || 0)), 0);
    const totalLosses = lostPredictions.reduce((sum, p) => sum + Number(p.amountStaked || 0), 0);
    const netProfit = Number((totalWinnings - totalLosses).toFixed(2));

    const singleWins = wonPredictions.map(p => Number(p.potentialReturn || 0) - Number(p.amountStaked || 0));
    const highestSingleWin = singleWins.length > 0 ? Number(Math.max(...singleWins).toFixed(2)) : 0;

    // Favorite Category
    const categoryCounts = {};
    predictions.forEach(p => {
      const cat = p.market.category;
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });
    let favoriteCategory = 'None';
    let maxCatCount = 0;
    Object.keys(categoryCounts).forEach(cat => {
      if (categoryCounts[cat] > maxCatCount) {
        maxCatCount = categoryCounts[cat];
        favoriteCategory = cat;
      }
    });

    // Wallet transaction stats
    const totalDeposits = user.walletLedgers
      .filter(l => l.type === 'CREDIT' && l.subType === 'DEPOSIT')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const totalWithdrawals = user.walletLedgers
      .filter(l => l.type === 'DEBIT' && l.subType === 'WITHDRAWAL')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    // Recent activities (unified timeline)
    const activities = [];
    
    // Add Joined platform activity
    activities.push({
      id: 'joined',
      type: 'JOINED_PLATFORM',
      title: 'Joined Meridian',
      description: 'Account registered successfully',
      date: user.createdAt
    });

    // Add predictions
    predictions.slice(0, 10).forEach(p => {
      activities.push({
        id: `pred-placed-${p.id}`,
        type: 'PREDICTION_PLACED',
        title: 'Prediction Placed',
        description: `Staked $${Number(p.amountStaked).toLocaleString()} on "${p.option.optionText}" in market "${p.market.title}"`,
        date: p.createdAt
      });
      if (p.status === 'WON' || p.status === 'LOST') {
        activities.push({
          id: `pred-resolved-${p.id}`,
          type: p.status === 'WON' ? 'MARKET_WON' : 'MARKET_LOST',
          title: p.status === 'WON' ? 'Market Resolved - Won 🏆' : 'Market Resolved - Lost',
          description: p.status === 'WON'
            ? `Won $${Number(p.potentialReturn).toLocaleString()} on market "${p.market.title}"`
            : `Prediction lost. Stake of $${Number(p.amountStaked).toLocaleString()} was not returned.`,
          date: p.resolvedAt || p.updatedAt
        });
      }
    });

    // Add ledger deposits/withdrawals/bonuses
    user.walletLedgers.slice(0, 10).forEach(l => {
      if (l.subType === 'DEPOSIT' || l.subType === 'WITHDRAWAL') {
        activities.push({
          id: `ledger-${l.id}`,
          type: l.subType,
          title: l.subType === 'DEPOSIT' ? 'Wallet Credited' : 'Wallet Debited',
          description: `${l.subType === 'DEPOSIT' ? 'Simulated deposit' : 'Simulated withdrawal'} of $${Number(l.amount).toLocaleString()}`,
          date: l.createdAt
        });
      } else if (l.subType === 'REFERRAL_BONUS') {
        activities.push({
          id: `ledger-${l.id}`,
          type: 'REFERRAL_BONUS',
          title: 'Referral Bonus',
          description: `Received $${Number(l.amount).toLocaleString()} for referring a friend`,
          date: l.createdAt
        });
      } else if (l.subType === 'LEVEL_UP_BONUS') {
        activities.push({
          id: `ledger-${l.id}`,
          type: 'LEVEL_UP_BONUS',
          title: 'Level Up Bonus',
          description: `Received $${Number(l.amount).toLocaleString()} for reaching Level ${l.metadata?.level || ''}`,
          date: l.createdAt
        });
      }
    });

    // Sort activities by date desc
    const sortedActivities = activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);

    // Recent distinct markets (last 5–10 markets the user participated in)
    const recentMarketsMap = new Map();
    predictions.forEach(p => {
      if (!recentMarketsMap.has(p.marketId)) {
        const pnl = p.status === 'WON'
          ? (Number(p.potentialReturn) - Number(p.amountStaked))
          : (p.status === 'LOST' ? -Number(p.amountStaked) : 0);
        recentMarketsMap.set(p.marketId, {
          marketId: p.marketId,
          marketName: p.market.title,
          prediction: p.option.optionText,
          status: p.status,
          amountInvested: Number(p.amountStaked),
          profitLoss: pnl,
          date: p.createdAt
        });
      }
    });
    const recentMarkets = Array.from(recentMarketsMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      reputationScore: user.reputationScore,
      trustScore: user.trustScore,
      accuracyPercentage: user.accuracyPercentage,
      totalBalance: Number(user.totalBalance),
      investedBalance: Number(user.investedBalance),
      level: user.level,
      xpPoints: user.xpPoints,
      isAdmin: user.isAdmin,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
      fullName: user.fullName || '',
      phone: user.phone || '',
      timezone: user.timezone || '',
      country: user.country || '',
      kycStatus: user.kycStatus || 'Unverified',
      themePreference: user.themePreference || 'dark',
      preferredCurrency: user.preferredCurrency || 'INR',
      languagePreference: user.languagePreference || 'English',
      recommendedLayout: user.recommendedLayout || 'Default',
      emailNotifications: user.emailNotifications,
      walletUpdates: user.walletUpdates,
      marketResultAlerts: user.marketResultAlerts,
      newMarketAnnouncements: user.newMarketAnnouncements,
      lastLoginAt: user.lastLoginAt,
      referralCount: user.referralsMade.length
    };

    res.json({
      user: safeUser,
      stats: {
        totalPredictions,
        wonPredictions,
        lostPredictions,
        pendingPredictions,
        winRate: winRatePercentage,
        netProfit,
        highestSingleWin,
        favoriteCategory
      },
      walletDetails: {
        balance: Number(user.totalBalance),
        totalDeposits,
        totalWithdrawals,
        totalWinnings,
        totalLosses
      },
      recentMarkets,
      activities: sortedActivities
    });

  } catch (error) {
    console.error('Error fetching profile details:', error);
    res.status(500).json({ error: 'Failed to fetch profile details' });
  }
};

// PUT /api/users/me/profile
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    const allowedFields = [
      'fullName', 'phone', 'timezone', 'country', 'bio', 'avatarUrl',
      'themePreference', 'preferredCurrency', 'languagePreference', 'recommendedLayout',
      'emailNotifications', 'walletUpdates', 'marketResultAlerts', 'newMarketAnnouncements'
    ];

    const dataToUpdate = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        totalBalance: Number(updatedUser.totalBalance),
        isAdmin: updatedUser.isAdmin,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        timezone: updatedUser.timezone,
        country: updatedUser.country,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        themePreference: updatedUser.themePreference,
        preferredCurrency: updatedUser.preferredCurrency,
        languagePreference: updatedUser.languagePreference,
        recommendedLayout: updatedUser.recommendedLayout,
        emailNotifications: updatedUser.emailNotifications,
        walletUpdates: updatedUser.walletUpdates,
        marketResultAlerts: updatedUser.marketResultAlerts,
        newMarketAnnouncements: updatedUser.newMarketAnnouncements
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// POST /api/users/me/security/change-password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// POST /api/users/me/security/change-email
exports.changeEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'New email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingEmail && existingEmail.id !== userId) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, isEmailVerified: false }
    });

    res.json({ message: 'Email updated successfully. Please verify your new email address.' });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({ error: 'Failed to change email' });
  }
};

// DELETE /api/users/me
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
