const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { computeLeaderboard } = require('../jobs/leaderboardJob');

exports.getLeaderboard = async (req, res) => {
  try {
    const type = req.query.type || 'GLOBAL'; // GLOBAL, WEEKLY, MONTHLY

    // Fetch from precomputed Leaderboard table
    let ranks = await prisma.leaderboard.findMany({
      where: { leaderboardType: type.toUpperCase() },
      include: {
        user: {
            select: {
              username: true,
              avatarUrl: true,
              reputationScore: true,
              isAdmin: true,
              totalBalance: true
            }
        }
      },
      orderBy: { score: 'desc' },
      take: 100
    });

    // If database table is empty, compute dynamically on-the-fly and fetch again
    if (ranks.length === 0) {
      await computeLeaderboard();
      ranks = await prisma.leaderboard.findMany({
        where: { leaderboardType: type.toUpperCase() },
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
              reputationScore: true,
              isAdmin: true
            }
          }
        },
        orderBy: { score: 'desc' },
        take: 100
      });
    }

    res.json(ranks);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
