const prisma = require('../lib/prisma');

// Content-based scoring: category affinity (from the user's own history + followed traders')
// plus a trending boost. No ML model — a transparent, explainable score for this scale.
async function getRecommendationsForUser(userId, limit = 10) {
  const [ownPredictions, following, participatedMarketIds] = await Promise.all([
    prisma.prediction.findMany({ where: { userId }, include: { market: { select: { category: true } } } }),
    prisma.userFollower.findMany({ where: { followerId: userId }, select: { userId: true } }),
    prisma.prediction.findMany({ where: { userId }, select: { marketId: true } }),
  ]);

  const categoryAffinity = {};
  for (const p of ownPredictions) {
    const cat = p.market.category;
    categoryAffinity[cat] = (categoryAffinity[cat] || 0) + 2;
  }

  const followingIds = following.map((f) => f.userId);
  if (followingIds.length > 0) {
    const followedPredictions = await prisma.prediction.findMany({
      where: { userId: { in: followingIds } },
      include: { market: { select: { category: true } } },
      take: 200,
    });
    for (const p of followedPredictions) {
      const cat = p.market.category;
      categoryAffinity[cat] = (categoryAffinity[cat] || 0) + 1;
    }
  }

  const excludeIds = participatedMarketIds.map((p) => p.marketId);
  const candidates = await prisma.market.findMany({
    where: { status: 'LIVE', id: { notIn: excludeIds.length ? excludeIds : undefined } },
    orderBy: { totalVolume: 'desc' },
    take: 50,
  });

  const maxVolume = Math.max(1, ...candidates.map((m) => Number(m.totalVolume)));
  const scored = candidates.map((market) => {
    const affinityScore = categoryAffinity[market.category] || 0;
    const trendingScore = (Number(market.totalVolume) / maxVolume) * 3;
    return { market, score: affinityScore + trendingScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.market);
}

module.exports = { getRecommendationsForUser };
