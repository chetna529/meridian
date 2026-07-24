const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const positionService = require('../services/positionService');

exports.getPortfolio = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const positionsRaw = await prisma.position.findMany({
      where: { userId },
      include: { market: { select: { id: true, title: true, status: true, category: true } }, option: true },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = positionsRaw.map(positionService.enrichPosition);
    const open = enriched.filter((p) => p.status === 'OPEN');
    const closed = enriched.filter((p) => p.status === 'CLOSED');

    const unrealizedPnl = open.reduce((sum, p) => sum + p.pnl, 0);
    const realizedPnl = closed.reduce((sum, p) => sum + p.pnl, 0);
    const totalCostBasis = enriched.reduce((sum, p) => sum + Number(p.costBasis), 0);
    const roi = totalCostBasis > 0 ? ((unrealizedPnl + realizedPnl) / totalCostBasis) * 100 : 0;

    const totalPredictions = await prisma.prediction.count({ where: { userId } });
    const wonPredictions = await prisma.prediction.count({ where: { userId, status: 'WON' } });
    const lostPredictions = await prisma.prediction.count({ where: { userId, status: 'LOST' } });
    const resolvedCount = wonPredictions + lostPredictions;

    res.json({
      user: { username: user.username, avatar: user.avatarUrl, level: user.level, xpPoints: user.xpPoints },
      balance: { available: user.totalBalance, invested: user.investedBalance, total: Number(user.totalBalance) + Number(user.investedBalance) },
      stats: {
        totalPredictions,
        activePredictions: open.length,
        wonPredictions,
        lostPredictions,
        winRate: resolvedCount > 0 ? ((wonPredictions / resolvedCount) * 100).toFixed(1) : '0.0',
        unrealizedPnl,
        realizedPnl,
        roi: roi.toFixed(2),
      },
      positions: { open, closed },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
};
