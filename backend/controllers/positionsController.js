const prisma = require('../lib/prisma');
const positionService = require('../services/positionService');

exports.getMyPositions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const positions = await prisma.position.findMany({
      where: { userId },
      include: { market: { select: { id: true, title: true, status: true } }, option: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(positions.map(positionService.enrichPosition));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
};
