const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cache = require('../lib/cache');

// Public, real platform stats for the marketing/home page — no hardcoded numbers.
exports.getPublicStats = async (req, res) => {
  try {
    const cacheKey = 'stats:public';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [activeUsers, activeMarkets, totalPredictions, volumeAgg, last7dVolumeRows, last7dSignupRows] = await Promise.all([
      prisma.user.count(),
      prisma.market.count({ where: { status: 'LIVE' } }),
      prisma.prediction.count(),
      prisma.market.aggregate({ _sum: { totalVolume: true } }),
      prisma.$queryRaw`
        SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM("amountStaked"), 0) AS volume
        FROM "Prediction"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day ASC
      `,
      prisma.$queryRaw`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "User"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day ASC
      `,
    ]);

    const stats = {
      activeUsers,
      activeMarkets,
      totalPredictions,
      totalVolume: Number(volumeAgg._sum.totalVolume || 0),
      last7dVolume: last7dVolumeRows.map((r) => ({ day: r.day, volume: Number(r.volume) })),
      last7dSignups: last7dSignupRows.map((r) => ({ day: r.day, count: Number(r.count) })),
    };

    await cache.set(cacheKey, stats, 60);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
