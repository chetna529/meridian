const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { computeLeaderboard } = require('../jobs/leaderboardJob');
const cache = require('../lib/cache');

exports.getLeaderboard = async (req, res) => {
  try {
    const type = (req.query.type || 'GLOBAL').toUpperCase();
    const cacheKey = `leaderboard:${type}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    let ranks = await prisma.leaderboard.findMany({
      where: { leaderboardType: type },
      include: {
        user: {
          select: { username: true, avatarUrl: true, reputationScore: true, isAdmin: true, totalBalance: true, trustScore: true },
        },
      },
      orderBy: { score: 'desc' },
      take: 100,
    });

    if (ranks.length === 0) {
      await computeLeaderboard();
      ranks = await prisma.leaderboard.findMany({
        where: { leaderboardType: type },
        include: {
          user: { select: { username: true, avatarUrl: true, reputationScore: true, isAdmin: true, totalBalance: true, trustScore: true } },
        },
        orderBy: { score: 'desc' },
        take: 100,
      });
    }

    await cache.set(cacheKey, ranks, 60);
    res.json(ranks);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
