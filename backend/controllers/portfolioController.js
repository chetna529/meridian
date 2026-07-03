const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getPortfolio = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        predictions: { include: { market: true, option: true } },
        // include positions
        // @ts-ignore
        positions: true
      }
    });

    const predictions = user.predictions || [];
    const positions = await prisma.position.findMany({ where: { userId }, include: { market: true } });

    const active = predictions.filter(p => p.status === 'PENDING');
    const won = predictions.filter(p => p.status === 'WON');
    const lost = predictions.filter(p => p.status === 'LOST');

    res.json({
      user: { username: user.username, avatar: user.avatarUrl, level: user.level, xpPoints: user.xpPoints },
      balance: { available: user.totalBalance, invested: user.investedBalance, total: Number(user.totalBalance) + Number(user.investedBalance) },
      stats: {
        totalPredictions: user.totalPredictions || predictions.length,
        activePredictions: active.length,
        wonPredictions: won.length,
        lostPredictions: lost.length,
        winRate: user.totalPredictions > 0 ? ((won.length / user.totalPredictions) * 100).toFixed(1) : 0
      },
      predictions: { active, won: won.slice(0,5), lost: lost.slice(0,5) },
      positions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
};
