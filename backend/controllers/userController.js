const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        totalBalance: true,
        investedBalance: true,
        reputationScore: true,
        accuracyPercentage: true,
        level: true,
        xpPoints: true,
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
