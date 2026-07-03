const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get personalized prediction feed of followed users
exports.getPersonalizedFeed = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get list of followed users
    const following = await prisma.userFollower.findMany({
      where: { followerId: userId },
      select: { userId: true }
    });

    const followingIds = following.map(f => f.userId);

    if (followingIds.length === 0) {
      // Fallback: return trending public predictions from all users
      const publicFeed = await prisma.prediction.findMany({
        include: {
          user: { select: { username: true, avatarUrl: true } },
          market: { select: { title: true, category: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      return res.json(publicFeed);
    }

    const feed = await prisma.prediction.findMany({
      where: {
        userId: { in: followingIds }
      },
      include: {
        user: { select: { username: true, avatarUrl: true } },
        market: { select: { title: true, category: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(feed);
  } catch (error) {
    console.error('Error fetching personalized feed:', error);
    res.status(500).json({ error: 'Failed to fetch personalized feed' });
  }
};
